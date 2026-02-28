// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { IDisputeResolver } from "./interfaces/IDisputeResolver.sol";
import { ITaskManager } from "./interfaces/ITaskManager.sol";
import { IPactAgentAdapter } from "./IPactAgentAdapter.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DisputeResolver
 * @notice Handles disputes when agents disagree with creator's selection/rejection
 * @dev Community votes with reputation-weighted voting to resolve disputes
 * @dev SECURITY: Uses ReentrancyGuard to prevent reentrancy attacks on stake transfers
 */
contract DisputeResolver is IDisputeResolver, ReentrancyGuard, Pausable {
    // Constants
    uint256 public constant MIN_DISPUTE_STAKE = 0.01 ether;
    uint256 public constant DISPUTE_STAKE_PERCENT = 1; // 1% of bounty
    uint256 public constant MAJORITY_THRESHOLD_BPS = 6000; // 60% in basis points (10000 = 100%)
    uint256 public constant VOTER_REP_BATCH_SIZE = 50; // Max voters processed per batch call

    // Configurable voter cap (settable by timelock)
    uint256 public constant MIN_MAX_VOTERS = 10; // Lower bound for voter cap
    uint256 public constant ABS_MAX_VOTERS = 1000; // Upper bound for voter cap (gas safety ceiling)
    /// @notice Maximum number of voters allowed per dispute.
    ///         Prevents unbounded gas in resolveDispute() and processVoterReputationBatch().
    ///         Settable by the timelock via setMaxVotersPerDispute(); bounded by
    ///         [MIN_MAX_VOTERS, ABS_MAX_VOTERS].
    uint256 public maxVotersPerDispute = 500;
    /// @dev VOTE_CORRECT_DELTA and VOTE_INCORRECT_DELTA are passed to
    ///      PactAgentAdapter.updateVoterReputation(), which only uses the *sign*
    ///      of the delta (positive → reward, negative → penalty). The actual reputation
    ///      values written on-chain are VOTE_CORRECT_VALUE / VOTE_INCORRECT_VALUE
    ///      defined in PactAgentAdapter. Keep both pairs in sync if you change them.
    ///      DisputeResolver uses same deltas as PactAgentAdapter: +3 correct, -2 incorrect.
    int256 constant VOTE_CORRECT_DELTA = 3; // Reputation reward for voting with majority
    int256 constant VOTE_INCORRECT_DELTA = -2; // Reputation penalty for voting against majority

    // Configurable time constant with bounded setter
    uint256 public votingPeriod = 48 hours;
    uint256 public constant MIN_VOTING_PERIOD = 24 hours;
    uint256 public constant MAX_VOTING_PERIOD = 7 days;

    // State
    uint256 private _disputeCounter;
    mapping(uint256 => Dispute) private _disputes;
    mapping(uint256 => mapping(address => Vote)) private _votes; // disputeId => voter => Vote
    mapping(uint256 => address[]) private _voters; // disputeId => list of voters
    mapping(uint256 => uint256) private _taskDispute; // taskId => disputeId
    mapping(uint256 => uint256) private _voterRepProcessedIndex; // disputeId => next voter index to process

    // External contracts
    ITaskManager public immutable taskManager;
    IPactAgentAdapter public immutable agentAdapter;

    // Access control
    address public owner;
    address public pendingOwner;
    address public timelock;

    // Slashed stakes tracking
    uint256 public totalSlashedStakes;
    uint256 public totalWithdrawnStakes;

    // Withdrawal pattern: pending stake refunds for dispute winners / cancelled disputes.
    // Using pull-over-push to prevent a contract-wallet disputer from blocking resolveDispute()
    // by rejecting the ETH transfer (DoS via revert in receive/fallback).
    mapping(address => uint256) public pendingWithdrawals;

    // Errors
    error DisputeNotFound();
    error NotSubmitter();
    error DisputeAlreadyExists();
    error InsufficientStake();
    error TaskNotInReview();
    error VotingNotActive();
    error AlreadyVoted();
    /// @notice Reverted when the disputer tries to vote on their own dispute
    error DisputerCannotVote();
    /// @notice Reverted when the task creator tries to vote on a dispute for their own task
    error CreatorCannotVote();
    error NotRegistered();
    error VotingStillActive();
    error DisputeAlreadyResolved();
    error OnlyOwner();
    error TransferFailed();
    error MaxVotersReached();
    error DisputeNotActive();
    error NotPendingOwner();
    error InsufficientSlashedStakes();
    error OnlyTimelock();
    error ZeroAddress();
    error VoterRepAlreadyComplete();
    error DisputeNotResolved();
    error ValueOutOfBounds();
    error NoPendingWithdrawal();

    /// @notice Emitted when a dispute is cancelled
    event DisputeCancelled(uint256 indexed disputeId, uint256 indexed taskId, address cancelledBy);

    /// @notice Emitted when a dispute stake is credited to the disputer's pending withdrawal balance.
    ///         The disputer must call claimStake() to receive the funds.
    event StakeReadyToWithdraw(uint256 indexed disputeId, address indexed disputer, uint256 amount);

    // Ownership events
    event OwnershipTransferInitiated(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Slashed stakes events
    event StakeSlashed(uint256 indexed disputeId, address indexed disputer, uint256 amount);
    event StakesWithdrawn(address indexed recipient, uint256 amount);

    // Voter reputation batch processing event
    event VoterReputationBatchProcessed(
        uint256 indexed disputeId, uint256 processed, uint256 remaining
    );

    // Emergency bypass event
    event EmergencyBypassUsed(address indexed caller, bytes4 indexed selector);

    // Time configuration event
    event VotingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    // Voter cap configuration event
    event MaxVotersPerDisputeUpdated(uint256 oldMax, uint256 newMax);

    // Timelock configuration event
    event TimelockSet(address indexed newTimelock);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyTimelock() {
        if (msg.sender != timelock) revert OnlyTimelock();
        _;
    }

    constructor(address _taskManager, address _agentAdapter) {
        taskManager = ITaskManager(_taskManager);
        agentAdapter = IPactAgentAdapter(_agentAdapter);
        owner = msg.sender;
    }

    /**
     * @notice Set the voting period duration
     * @param newPeriod The new voting period in seconds (min 24h, max 7 days)
     */
    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        if (newPeriod < MIN_VOTING_PERIOD || newPeriod > MAX_VOTING_PERIOD) {
            revert ValueOutOfBounds();
        }
        uint256 oldPeriod = votingPeriod;
        votingPeriod = newPeriod;
        emit VotingPeriodUpdated(oldPeriod, newPeriod);
    }

    /**
     * @notice Set the maximum number of voters allowed per dispute (requires timelock)
     * @param newMax The new maximum voter count (min MIN_MAX_VOTERS, max ABS_MAX_VOTERS)
     * @dev The timelock delay (48h) ensures governance review before the cap is changed.
     *      Setting a lower cap does NOT retroactively affect disputes that already have more
     *      voters than the new cap — it only applies to future submitVote() calls.
     */
    function setMaxVotersPerDispute(uint256 newMax) external onlyTimelock {
        if (newMax < MIN_MAX_VOTERS || newMax > ABS_MAX_VOTERS) {
            revert ValueOutOfBounds();
        }
        uint256 oldMax = maxVotersPerDispute;
        maxVotersPerDispute = newMax;
        emit MaxVotersPerDisputeUpdated(oldMax, newMax);
    }

    /**
     * @notice Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Initiate ownership transfer (two-step process)
     * @param newOwner The address to transfer ownership to
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, newOwner);
    }

    /**
     * @notice Accept ownership transfer (must be called by pending owner)
     */
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    /**
     * @notice Start a dispute on a task selection/rejection
     * @param taskId The task ID to dispute
     * @return disputeId The created dispute ID
     */
    function startDispute(uint256 taskId)
        external
        payable
        whenNotPaused
        returns (uint256 disputeId)
    {
        ITaskManager.Task memory task = taskManager.getTask(taskId);

        // Verify task is in review (within challenge window)
        if (task.status != ITaskManager.TaskStatus.InReview) revert TaskNotInReview();

        // Verify caller is a submitter on this task
        if (!taskManager.hasSubmitted(taskId, msg.sender)) revert NotSubmitter();

        // Verify no existing dispute
        if (_taskDispute[taskId] != 0) revert DisputeAlreadyExists();

        // Calculate and verify stake
        uint256 requiredStake = calculateDisputeStake(task.bountyAmount);
        if (msg.value < requiredStake) revert InsufficientStake();

        disputeId = ++_disputeCounter;

        _disputes[disputeId] = Dispute({
            id: disputeId,
            taskId: taskId,
            disputer: msg.sender,
            disputeStake: msg.value,
            votingDeadline: block.timestamp + votingPeriod,
            status: DisputeStatus.Active,
            disputerWon: false,
            votesForDisputer: 0,
            votesAgainstDisputer: 0
        });

        _taskDispute[taskId] = disputeId;

        // Mark task as disputed in TaskManager
        taskManager.markDisputed(taskId, disputeId, msg.sender);

        emit DisputeCreated(
            disputeId, taskId, msg.sender, msg.value, block.timestamp + votingPeriod
        );
    }

    /**
     * @notice Submit a vote on a dispute
     * @param disputeId The dispute ID
     * @param supportsDisputer True to support disputer, false to support creator
     * @dev VOTE WEIGHT TIMING: The voter's weight is captured at the moment submitVote()
     *      is called (via agentAdapter.getVoteWeight(msg.sender)) and stored in the Vote
     *      struct. This is intentional — it locks in the weight at voting time, preventing
     *      a voter from accumulating more reputation after voting to retroactively increase
     *      their influence on an ongoing dispute. Any reputation changes after submitVote()
     *      (e.g., winning another task) do NOT affect this vote's weight.
     */
    function submitVote(uint256 disputeId, bool supportsDisputer) external whenNotPaused {
        Dispute storage dispute = _disputes[disputeId];
        if (dispute.id == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.Active) revert VotingNotActive();
        if (block.timestamp > dispute.votingDeadline) revert VotingNotActive();
        if (!agentAdapter.isRegistered(msg.sender)) revert NotRegistered();
        if (_votes[disputeId][msg.sender].timestamp != 0) revert AlreadyVoted();

        // Voters cannot be the disputer or the task creator.
        // NOTE: taskManager.getTask() will revert with TaskNotFound if dispute.taskId is
        // invalid. In practice this cannot happen because startDispute() verifies the task
        // exists via the same call before creating the dispute record, so dispute.taskId is
        // always a valid, previously-existing task ID.
        ITaskManager.Task memory task = taskManager.getTask(dispute.taskId);
        if (msg.sender == dispute.disputer) revert DisputerCannotVote();
        if (msg.sender == task.creator) revert CreatorCannotVote();

        uint256 weight = agentAdapter.getVoteWeight(msg.sender);

        // Enforce voter limit to prevent gas exhaustion during resolution
        if (_voters[disputeId].length >= maxVotersPerDispute) revert MaxVotersReached();

        _votes[disputeId][msg.sender] = Vote({
            voter: msg.sender,
            supportsDisputer: supportsDisputer,
            weight: weight,
            timestamp: block.timestamp
        });

        _voters[disputeId].push(msg.sender);

        if (supportsDisputer) {
            dispute.votesForDisputer += weight;
        } else {
            dispute.votesAgainstDisputer += weight;
        }

        emit VoteSubmitted(disputeId, msg.sender, supportsDisputer, weight);
    }

    /**
     * @notice Resolve a dispute after voting period ends
     * @param disputeId The dispute ID
     * @dev SECURITY: nonReentrant prevents reentrancy attacks on stake transfers
     */
    function resolveDispute(uint256 disputeId) external nonReentrant {
        Dispute storage dispute = _disputes[disputeId];
        if (dispute.id == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.Active) revert DisputeAlreadyResolved();
        if (block.timestamp < dispute.votingDeadline) revert VotingStillActive();

        uint256 totalVotes = dispute.votesForDisputer + dispute.votesAgainstDisputer;
        bool disputerWon;

        if (totalVotes == 0) {
            // No votes: tie breaks in favor of creator (status quo wins).
            // Rationale: if no community members voted, there is no signal to overturn
            // the creator's decision. The disputer's stake is slashed — no-vote disputes
            // are disincentivized because the disputer loses their stake without a quorum.
            disputerWon = false;
        } else {
            // Check if disputer got 60%+ of votes (basis points for precision)
            uint256 disputerBps = (dispute.votesForDisputer * 10_000) / totalVotes;
            disputerWon = disputerBps >= MAJORITY_THRESHOLD_BPS;
        }

        dispute.status = DisputeStatus.Resolved;
        dispute.disputerWon = disputerWon;

        // Update reputation based on outcome
        _processDisputeOutcome(dispute, disputerWon);

        // Notify TaskManager to handle bounty distribution
        taskManager.resolveDispute(dispute.taskId, disputerWon);

        emit DisputeResolved(
            disputeId,
            dispute.taskId,
            disputerWon,
            dispute.votesForDisputer,
            dispute.votesAgainstDisputer
        );
    }

    /**
     * @dev Process dispute outcome - handle stakes and reputation.
     *      If disputer wins: stake is returned and reputation is updated via TaskManager.
     *      If disputer loses: stake is slashed (tracked in totalSlashedStakes) and a
     *      dispute loss is recorded against the disputer's reputation.
     *      In both cases, voter reputation is updated in batches via _updateVoterReputation().
     * @param dispute The dispute storage reference
     * @param disputerWon Whether the disputer won the vote
     */
    function _processDisputeOutcome(Dispute storage dispute, bool disputerWon) private {
        if (disputerWon) {
            // Disputer wins - credit stake to their pending withdrawal balance (pull-over-push pattern).
            // A direct ETH send is intentionally avoided here: if the disputer is a contract that
            // rejects ETH (no receive/fallback or a reverting one), a direct send would cause the
            // entire resolveDispute() call to revert, permanently bricking dispute resolution (DoS).
            // The disputer must call claimStake() to pull funds out.
            pendingWithdrawals[dispute.disputer] += dispute.disputeStake;

            emit DisputeStakeReturned(dispute.id, dispute.disputer, dispute.disputeStake);
            emit StakeReadyToWithdraw(dispute.id, dispute.disputer, dispute.disputeStake);

            // Reputation handled by TaskManager.resolveDispute()
        } else {
            // Disputer loses - stake goes to protocol (or could be burned/redistributed)
            // Track the slashed stake for accounting
            totalSlashedStakes += dispute.disputeStake;
            agentAdapter.recordDisputeLoss(dispute.disputer, dispute.id);

            emit StakeSlashed(dispute.id, dispute.disputer, dispute.disputeStake);
            emit DisputeStakeSlashed(dispute.id, dispute.disputer, dispute.disputeStake);
        }

        // Update voter reputation
        _updateVoterReputation(dispute.id, disputerWon);
    }

    /**
     * @dev Apply the reputation update for a single voter based on whether they voted
     *      with the majority outcome.
     *      Extracted from the inline loops in _updateVoterReputation() and
     *      processVoterReputationBatch() to eliminate code duplication.
     * @param voter       The voter's wallet address
     * @param vote        The voter's recorded Vote (storage reference)
     * @param disputerWon The final dispute outcome
     */
    function _applyVoterRepUpdate(
        address voter,
        Vote storage vote,
        bool disputerWon
    )
        private
    {
        // Ternary/if-else is clearer than alternative formulations; no gas savings from change.
        bool votedWithMajority = (vote.supportsDisputer == disputerWon);
        if (votedWithMajority) {
            agentAdapter.updateVoterReputation(voter, VOTE_CORRECT_DELTA);
        } else {
            agentAdapter.updateVoterReputation(voter, VOTE_INCORRECT_DELTA);
        }
    }

    /**
     * @dev Update reputation for voters based on whether they voted with majority.
     *      Processes up to VOTER_REP_BATCH_SIZE voters inline. If more voters remain,
     *      they must be processed via processVoterReputationBatch().
     */
    function _updateVoterReputation(uint256 disputeId, bool disputerWon) private {
        address[] storage voters = _voters[disputeId];
        uint256 total = voters.length;
        uint256 batchEnd = total < VOTER_REP_BATCH_SIZE ? total : VOTER_REP_BATCH_SIZE;

        for (uint256 i = 0; i < batchEnd; i++) {
            _applyVoterRepUpdate(voters[i], _votes[disputeId][voters[i]], disputerWon);
        }

        _voterRepProcessedIndex[disputeId] = batchEnd;

        if (batchEnd < total) {
            emit VoterReputationBatchProcessed(disputeId, batchEnd, total - batchEnd);
        }
    }

    /**
     * @notice Process voter reputation updates in batches for disputes with many voters
     * @param disputeId The dispute ID
     * @dev Anyone can call this to process remaining voter reputation updates.
     *      Processes up to VOTER_REP_BATCH_SIZE voters per call.
     */
    function processVoterReputationBatch(uint256 disputeId) external {
        Dispute storage dispute = _disputes[disputeId];
        if (dispute.id == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.Resolved) revert DisputeNotResolved();

        address[] storage voters = _voters[disputeId];
        uint256 startIndex = _voterRepProcessedIndex[disputeId];
        uint256 total = voters.length;

        if (startIndex >= total) revert VoterRepAlreadyComplete();

        uint256 batchEnd = startIndex + VOTER_REP_BATCH_SIZE;
        if (batchEnd > total) batchEnd = total;

        bool disputerWon = dispute.disputerWon;

        for (uint256 i = startIndex; i < batchEnd; i++) {
            _applyVoterRepUpdate(voters[i], _votes[disputeId][voters[i]], disputerWon);
        }

        _voterRepProcessedIndex[disputeId] = batchEnd;
        uint256 remaining = total > batchEnd ? total - batchEnd : 0;
        emit VoterReputationBatchProcessed(disputeId, batchEnd - startIndex, remaining);
    }

    /**
     * @notice Get the number of unprocessed voter reputation updates for a dispute
     * @param disputeId The dispute ID
     * @return remaining Number of voters still needing reputation updates
     */
    function pendingVoterRepUpdates(uint256 disputeId) external view returns (uint256 remaining) {
        uint256 total = _voters[disputeId].length;
        uint256 processed = _voterRepProcessedIndex[disputeId];
        remaining = total > processed ? total - processed : 0;
    }

    /**
     * @notice Claim a pending stake refund after winning a dispute or after dispute cancellation
     * @dev Implements the pull-over-push withdrawal pattern to prevent DoS by a disputer whose
     *      contract wallet rejects ETH. The disputer's stake is credited here and must be
     *      explicitly claimed via this function.
     * @dev SECURITY: nonReentrant prevents reentrancy attacks on ETH transfers
     */
    function claimStake() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NoPendingWithdrawal();

        // Zero the balance before the transfer (checks-effects-interactions)
        pendingWithdrawals[msg.sender] = 0;

        (bool success,) = msg.sender.call{ value: amount }("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Calculate required dispute stake
     * @param bountyAmount The task bounty amount
     * @return The required stake amount
     */
    function calculateDisputeStake(uint256 bountyAmount) public pure returns (uint256) {
        uint256 percentStake = (bountyAmount * DISPUTE_STAKE_PERCENT) / 100;
        return percentStake > MIN_DISPUTE_STAKE ? percentStake : MIN_DISPUTE_STAKE;
    }

    // View functions

    /**
     * @notice Get a dispute by ID
     * @param disputeId The dispute ID
     * @return The dispute data
     */
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return _disputes[disputeId];
    }

    /**
     * @notice Get a vote for a dispute
     * @param disputeId The dispute ID
     * @param voter The voter address
     * @return The vote data
     */
    function getVote(uint256 disputeId, address voter) external view returns (Vote memory) {
        return _votes[disputeId][voter];
    }

    /**
     * @notice Check if an address has voted on a dispute
     * @param disputeId The dispute ID
     * @param voter The voter address
     * @return True if voted
     */
    function hasVoted(uint256 disputeId, address voter) external view returns (bool) {
        return _votes[disputeId][voter].timestamp != 0;
    }

    /**
     * @notice Get the dispute ID for a task
     * @param taskId The task ID
     * @return The dispute ID (0 if no dispute)
     */
    function getDisputeByTask(uint256 taskId) external view returns (uint256) {
        return _taskDispute[taskId];
    }

    /**
     * @notice Get the total number of disputes
     * @return The dispute count
     */
    function disputeCount() external view returns (uint256) {
        return _disputeCounter;
    }

    /**
     * @notice Get all voters for a dispute
     * @param disputeId The dispute ID
     * @return Array of voter addresses
     * @dev WARNING: Gas cost scales linearly with the number of voters. For disputes near
     *      maxVotersPerDispute (up to 1000), this call may be expensive in off-chain simulation
     *      or fail in on-chain contexts. Prefer pendingVoterRepUpdates() for counts only.
     */
    function getVoters(uint256 disputeId) external view returns (address[] memory) {
        return _voters[disputeId];
    }

    /**
     * @notice Get the available slashed stakes that can be withdrawn
     * @return The available amount (total slashed minus already withdrawn)
     */
    function availableSlashedStakes() external view returns (uint256) {
        return totalSlashedStakes - totalWithdrawnStakes;
    }

    /**
     * @notice Withdraw accumulated slashed stakes (requires timelock)
     * @param recipient The address to receive funds
     * @param amount The amount to withdraw
     * @dev SECURITY: nonReentrant prevents reentrancy attacks on withdrawals
     */
    function withdrawSlashedStakes(
        address recipient,
        uint256 amount
    )
        external
        onlyTimelock
        nonReentrant
    {
        // Validate available balance
        uint256 available = totalSlashedStakes - totalWithdrawnStakes;
        if (amount > available) revert InsufficientSlashedStakes();

        // Track withdrawal
        totalWithdrawnStakes += amount;

        (bool success,) = recipient.call{ value: amount }("");
        if (!success) revert TransferFailed();

        emit StakesWithdrawn(recipient, amount);
    }

    /**
     * @notice Cancel a dispute (requires timelock, for fraudulent disputes or emergency)
     * @param disputeId The dispute ID to cancel
     * @dev This refunds the dispute stake to the disputer and marks the dispute as cancelled.
     *      The task reverts to InReview status with a new challenge deadline.
     *      Can only cancel active disputes that haven't been resolved yet.
     *
     * @dev DUAL CANCELLATION PATHS — Security profile comparison:
     *
     *   Path A — `cancelDispute()` (this function, `onlyTimelock`):
     *     - Requires a 48-hour TimelockController queuing delay before execution.
     *     - Provides transparency: the community can observe the pending cancellation
     *       and object (or dispute resolution completes) during the delay.
     *     - Appropriate for routine governance (e.g. clearly invalid disputes discovered
     *       after careful review).
     *
     *   Path B — `emergencyCancelDispute()` (`onlyOwner`):
     *     - Executable immediately by the owner; no time delay.
     *     - Emits `EmergencyBypassUsed` for audit trail visibility.
     *     - Appropriate for critical situations where waiting 48 h would cause harm
     *       (e.g. a bug-triggered dispute that would irreversibly lock funds).
     *     - Higher centralization risk: a compromised owner key can bypass governance.
     *
     *   Both paths refund the disputer's stake and revert the task to InReview status.
     */
    function cancelDispute(uint256 disputeId) external onlyTimelock nonReentrant {
        Dispute storage dispute = _disputes[disputeId];
        if (dispute.id == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.Active) revert DisputeNotActive();

        // Mark dispute as cancelled
        dispute.status = DisputeStatus.Cancelled;

        // Clear the task dispute mapping
        _taskDispute[dispute.taskId] = 0;

        // Credit stake to disputer's pending withdrawal — use pull-over-push to avoid DoS
        // (same rationale as in _processDisputeOutcome).
        pendingWithdrawals[dispute.disputer] += dispute.disputeStake;

        // Revert task to InReview status so it can be finalized normally or disputed again
        taskManager.revertDisputedTask(dispute.taskId);

        emit StakeReadyToWithdraw(disputeId, dispute.disputer, dispute.disputeStake);
        emit DisputeCancelled(disputeId, dispute.taskId, msg.sender);
    }

    /**
     * @notice Set the timelock address (callable by owner, one-time setup)
     * @param _timelock The TimelockController address
     */
    function setTimelock(address _timelock) external onlyOwner {
        if (_timelock == address(0)) revert ZeroAddress();
        timelock = _timelock;
        emit TimelockSet(_timelock);
    }

    /**
     * @notice Emergency cancel dispute (owner only, emits event for monitoring)
     * @param disputeId The dispute ID to cancel
     */
    function emergencyCancelDispute(uint256 disputeId) external onlyOwner nonReentrant {
        Dispute storage dispute = _disputes[disputeId];
        if (dispute.id == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.Active) revert DisputeNotActive();

        // Mark dispute as cancelled
        dispute.status = DisputeStatus.Cancelled;

        // Clear the task dispute mapping
        _taskDispute[dispute.taskId] = 0;

        // Credit stake to disputer's pending withdrawal — use pull-over-push to avoid DoS
        // (same rationale as in _processDisputeOutcome).
        pendingWithdrawals[dispute.disputer] += dispute.disputeStake;

        // Revert task to InReview status so it can be finalized normally or disputed again
        taskManager.revertDisputedTask(dispute.taskId);

        emit EmergencyBypassUsed(msg.sender, this.cancelDispute.selector);
        emit StakeReadyToWithdraw(disputeId, dispute.disputer, dispute.disputeStake);
        emit DisputeCancelled(disputeId, dispute.taskId, msg.sender);
    }

    /**
     * @notice Emergency withdraw slashed stakes (owner only, emits event for monitoring)
     * @param recipient The address to receive funds
     * @param amount The amount to withdraw
     */
    function emergencyWithdrawSlashedStakes(
        address recipient,
        uint256 amount
    )
        external
        onlyOwner
        nonReentrant
    {
        // Validate available balance
        uint256 available = totalSlashedStakes - totalWithdrawnStakes;
        if (amount > available) revert InsufficientSlashedStakes();

        // Track withdrawal
        totalWithdrawnStakes += amount;

        (bool success,) = recipient.call{ value: amount }("");
        if (!success) revert TransferFailed();

        emit EmergencyBypassUsed(msg.sender, this.withdrawSlashedStakes.selector);
        emit StakesWithdrawn(recipient, amount);
    }
}
