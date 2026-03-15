// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { IEscrowVault } from "./interfaces/IEscrowVault.sol";
import { IPactAgentAdapter } from "./IPactAgentAdapter.sol";
import { BordaCount } from "./libraries/BordaCount.sol";
import { KendallTau } from "./libraries/KendallTau.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TaskManagerV2
 * @notice Phase-based task manager with N+M consensus (redundant execution + judge evaluation)
 * @dev Replaces the optimistic selection model with:
 *      - N independent workers produce outputs
 *      - M independent judges rank the outputs
 *      - Protocol computes consensus from rankings using Borda count + Kendall tau
 *      - Workers aligned with consensus get paid; judges aligned with consensus get paid
 */
contract TaskManagerV2 is Ownable2Step, Pausable {
    using BordaCount for uint8[][];

    // ============ Enums ============

    enum TaskPhase {
        Open,        // 0: Accepting worker submissions
        WorkPhase,   // 1: Work in progress (first submission received)
        JudgePhase,  // 2: Judging in progress
        Resolved,    // 3: Consensus reached, payouts made
        Cancelled,   // 4: Creator cancelled before any submissions
        Failed       // 5: Insufficient workers/judges or no consensus → refund
    }

    // ============ Structs ============

    struct Task {
        address creator;
        string specCid;
        uint256 bounty;
        address bountyToken;
        uint8 requiredWorkers;  // N
        uint8 requiredJudges;   // M
        uint256 workDeadline;
        uint256 judgeDeadline;
        TaskPhase phase;
        uint8 submissionCount;
        uint8 judgmentCount;
    }

    struct Submission {
        address worker;
        string submissionCid;
    }

    struct Judgment {
        address judge;
        uint8[] rankings;
    }

    // ============ Events ============

    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        uint256 bounty,
        address bountyToken,
        string specCid,
        uint8 requiredWorkers,
        uint8 requiredJudges,
        uint256 workDeadline,
        uint256 judgeDeadline
    );

    event WorkSubmitted(
        uint256 indexed taskId,
        address indexed worker,
        string submissionCid,
        uint256 slotIndex
    );

    event JudgmentSubmitted(
        uint256 indexed taskId,
        address indexed judge,
        uint8 judgmentIndex
    );

    event PhaseChanged(
        uint256 indexed taskId,
        TaskPhase fromPhase,
        TaskPhase toPhase
    );

    event TaskResolved(
        uint256 indexed taskId,
        uint8[] consensusRanking,
        address[] winningWorkers,
        address[] consensusJudges
    );

    event TaskFailed(uint256 indexed taskId, string reason);

    event TaskCancelled(uint256 indexed taskId, address indexed creator);

    // ============ Errors ============

    error TaskNotFound();
    error InvalidPhase();
    error WorkerSlotsFull();
    error JudgeSlotsFull();
    error AlreadySubmitted();
    error NotRegistered();
    error CannotJudge();
    error WorkDeadlinePassed();
    error WorkDeadlineNotPassed();
    error JudgeDeadlinePassed();
    error JudgeDeadlineNotPassed();
    error JudgeIsWorker();
    error InvalidRankingLength();
    error InvalidPermutation();
    error InsufficientBounty();
    error OnlyCreator();
    error TaskHasSubmissions();
    error InvalidWorkerCount();
    error InvalidJudgeCount();
    error InvalidDeadlines();
    error NothingToResolve();

    // ============ State ============

    uint256 public taskCounter;
    IEscrowVault public immutable escrowVault;
    IPactAgentAdapter public immutable agentAdapter;
    address public protocolTreasury;
    address public emergencyAdmin;

    uint256 public protocolFeeBps = 300;    // 3%
    uint256 public workerShareBps = 9000;   // 90% of post-fee bounty
    uint256 public minBounty = 0.005 ether; // 5e15 wei

    uint256 public constant MAX_FEE_BPS = 1000;      // 10%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // Task data
    mapping(uint256 => Task) public tasks;
    mapping(uint256 => Submission[]) private _submissions;
    mapping(uint256 => Judgment[]) private _judgments;
    mapping(uint256 => mapping(address => bool)) public hasSubmittedWork;
    mapping(uint256 => mapping(address => bool)) public hasSubmittedJudgment;

    // ============ Constructor ============

    constructor(
        address _escrowVault,
        address _agentAdapter,
        address _protocolTreasury,
        address _emergencyAdmin
    )
        Ownable(msg.sender)
    {
        escrowVault = IEscrowVault(_escrowVault);
        agentAdapter = IPactAgentAdapter(_agentAdapter);
        protocolTreasury = _protocolTreasury;
        emergencyAdmin = _emergencyAdmin;
    }

    // ============ External Functions ============

    /**
     * @notice Create a task with bounty deposited to escrow
     * @param specCid IPFS CID of the task specification
     * @param bounty Bounty amount (wei for ETH)
     * @param bountyToken Token address (address(0) for ETH)
     * @param requiredWorkers N — number of worker slots (2-10)
     * @param requiredJudges M — number of judge slots (2-10)
     * @param workDeadline Timestamp when work phase ends
     * @param judgeDeadline Timestamp when judge phase ends (must be after workDeadline)
     */
    function createTask(
        string calldata specCid,
        uint256 bounty,
        address bountyToken,
        uint8 requiredWorkers,
        uint8 requiredJudges,
        uint256 workDeadline,
        uint256 judgeDeadline
    )
        external
        payable
        whenNotPaused
        returns (uint256 taskId)
    {
        if (!agentAdapter.isRegistered(msg.sender)) revert NotRegistered();
        if (bounty < minBounty) revert InsufficientBounty();
        if (requiredWorkers < 2 || requiredWorkers > 10) revert InvalidWorkerCount();
        if (requiredJudges < 2 || requiredJudges > 10) revert InvalidJudgeCount();
        if (workDeadline <= block.timestamp) revert InvalidDeadlines();
        if (judgeDeadline <= workDeadline) revert InvalidDeadlines();

        if (bountyToken == address(0)) {
            if (msg.value != bounty) revert InsufficientBounty();
        }

        taskId = ++taskCounter;

        tasks[taskId] = Task({
            creator: msg.sender,
            specCid: specCid,
            bounty: bounty,
            bountyToken: bountyToken,
            requiredWorkers: requiredWorkers,
            requiredJudges: requiredJudges,
            workDeadline: workDeadline,
            judgeDeadline: judgeDeadline,
            phase: TaskPhase.Open,
            submissionCount: 0,
            judgmentCount: 0
        });

        // Deposit bounty to escrow
        if (bountyToken == address(0)) {
            escrowVault.deposit{ value: msg.value }(taskId, bountyToken, bounty);
        } else {
            escrowVault.depositFrom(taskId, bountyToken, bounty, msg.sender);
        }

        emit TaskCreated(
            taskId,
            msg.sender,
            bounty,
            bountyToken,
            specCid,
            requiredWorkers,
            requiredJudges,
            workDeadline,
            judgeDeadline
        );
    }

    /**
     * @notice Submit work for a task
     * @param taskId The task ID
     * @param submissionCid IPFS CID of the work submission
     */
    function submitWork(uint256 taskId, string calldata submissionCid) external whenNotPaused {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.phase != TaskPhase.Open && task.phase != TaskPhase.WorkPhase) {
            revert InvalidPhase();
        }
        if (block.timestamp > task.workDeadline) revert WorkDeadlinePassed();
        if (task.submissionCount >= task.requiredWorkers) revert WorkerSlotsFull();
        if (!agentAdapter.isRegistered(msg.sender)) revert NotRegistered();
        if (hasSubmittedWork[taskId][msg.sender]) revert AlreadySubmitted();

        hasSubmittedWork[taskId][msg.sender] = true;

        uint8 slotIndex = task.submissionCount;
        _submissions[taskId].push(Submission({ worker: msg.sender, submissionCid: submissionCid }));
        task.submissionCount++;

        // Phase transitions
        TaskPhase oldPhase = task.phase;
        if (task.phase == TaskPhase.Open) {
            task.phase = TaskPhase.WorkPhase;
            emit PhaseChanged(taskId, oldPhase, TaskPhase.WorkPhase);
            oldPhase = TaskPhase.WorkPhase;
        }

        if (task.submissionCount == task.requiredWorkers) {
            task.phase = TaskPhase.JudgePhase;
            emit PhaseChanged(taskId, oldPhase, TaskPhase.JudgePhase);
        }

        emit WorkSubmitted(taskId, msg.sender, submissionCid, slotIndex);
    }

    /**
     * @notice Submit a judgment (ranking of submissions)
     * @param taskId The task ID
     * @param rankings A permutation of [0, submissionCount-1] where position 0 = best
     */
    function submitJudgment(
        uint256 taskId,
        uint8[] calldata rankings
    )
        external
        whenNotPaused
    {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (task.phase != TaskPhase.JudgePhase) revert InvalidPhase();
        if (block.timestamp > task.judgeDeadline) revert JudgeDeadlinePassed();
        if (task.judgmentCount >= task.requiredJudges) revert JudgeSlotsFull();
        if (!agentAdapter.isRegistered(msg.sender)) revert NotRegistered();
        if (!agentAdapter.canJudge(msg.sender)) revert CannotJudge();
        if (hasSubmittedWork[taskId][msg.sender]) revert JudgeIsWorker();
        if (hasSubmittedJudgment[taskId][msg.sender]) revert AlreadySubmitted();

        // Validate ranking length
        if (rankings.length != task.submissionCount) revert InvalidRankingLength();

        // Validate it's a valid permutation
        _validatePermutation(rankings, task.submissionCount);

        hasSubmittedJudgment[taskId][msg.sender] = true;

        uint8 judgmentIndex = task.judgmentCount;
        _judgments[taskId].push(Judgment({ judge: msg.sender, rankings: rankings }));
        task.judgmentCount++;

        emit JudgmentSubmitted(taskId, msg.sender, judgmentIndex);

        // Auto-resolve when all judgments collected
        if (task.judgmentCount == task.requiredJudges) {
            _resolve(taskId);
        }
    }

    /**
     * @notice Handle timeouts — permissionless, anyone can call
     * @param taskId The task ID
     */
    function resolve(uint256 taskId) external {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();

        if (task.phase == TaskPhase.WorkPhase) {
            if (block.timestamp <= task.workDeadline) revert WorkDeadlineNotPassed();

            // REVIEW NOTE (#002): minWorkers can be 1 when requiredWorkers = 2 (ceil(2/2) = 1).
            // This allows single-worker resolution via timeout, which means one agent's work
            // is judged without competition. Consider requiring minWorkers >= 2 if competitive
            // evaluation is a protocol invariant.
            uint256 minWorkers = _ceil(task.requiredWorkers, 2);
            if (task.submissionCount >= minWorkers) {
                // Enough workers — advance to JudgePhase
                TaskPhase oldPhase = task.phase;
                task.phase = TaskPhase.JudgePhase;
                emit PhaseChanged(taskId, oldPhase, TaskPhase.JudgePhase);
            } else {
                // Not enough workers — fail and refund
                _failAndRefund(taskId, "Insufficient workers");
            }
        } else if (task.phase == TaskPhase.JudgePhase) {
            if (block.timestamp <= task.judgeDeadline) revert JudgeDeadlineNotPassed();

            // REVIEW NOTE (#003): minJudges can be 1 when requiredJudges = 2 (ceil(2/2) = 1).
            // This allows single-judge resolution via timeout, meaning one judge alone
            // determines consensus and receives the full judge pool. Consider requiring
            // minJudges >= 2 if multi-party consensus is a protocol invariant.
            uint256 minJudges = _ceil(task.requiredJudges, 2);
            if (task.judgmentCount >= minJudges) {
                // Enough judgments — try to resolve
                _resolve(taskId);
            } else {
                // Not enough judges — fail and refund
                _failAndRefund(taskId, "Insufficient judges");
            }
        } else {
            revert NothingToResolve();
        }
    }

    /**
     * @notice Cancel a task (creator only, before any submissions)
     * @param taskId The task ID
     */
    function cancelTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        if (msg.sender != task.creator) revert OnlyCreator();
        if (task.phase != TaskPhase.Open) revert InvalidPhase();
        if (task.submissionCount > 0) revert TaskHasSubmissions();

        task.phase = TaskPhase.Cancelled;
        escrowVault.refund(taskId, task.creator);

        emit PhaseChanged(taskId, TaskPhase.Open, TaskPhase.Cancelled);
        emit TaskCancelled(taskId, task.creator);
    }

    /**
     * @notice Emergency refund — bypass timelock for emergencies
     * @param taskId The task ID
     */
    function emergencyRefund(uint256 taskId) external {
        require(msg.sender == emergencyAdmin, "Only emergency admin");
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        // Cannot emergency-refund already finalized tasks
        if (
            task.phase == TaskPhase.Resolved || task.phase == TaskPhase.Cancelled
                || task.phase == TaskPhase.Failed
        ) {
            revert InvalidPhase();
        }

        _failAndRefund(taskId, "Emergency refund");
    }

    // ============ Admin Functions (owner = TimelockController) ============

    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee too high");
        protocolFeeBps = newFeeBps;
    }

    function setWorkerShare(uint256 newShareBps) external onlyOwner {
        require(newShareBps <= BPS_DENOMINATOR, "Share too high");
        workerShareBps = newShareBps;
    }

    function setMinBounty(uint256 newMinBounty) external onlyOwner {
        minBounty = newMinBounty;
    }

    function setProtocolTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Zero address");
        protocolTreasury = newTreasury;
    }

    function setEmergencyAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "Zero address");
        emergencyAdmin = newAdmin;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    function getTask(uint256 taskId) external view returns (Task memory) {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
        return task;
    }

    function getSubmission(
        uint256 taskId,
        uint256 index
    )
        external
        view
        returns (Submission memory)
    {
        return _submissions[taskId][index];
    }

    function getJudgment(uint256 taskId, uint256 index) external view returns (Judgment memory) {
        return _judgments[taskId][index];
    }

    function getSubmissionCount(uint256 taskId) external view returns (uint256) {
        return _submissions[taskId].length;
    }

    function getJudgmentCount(uint256 taskId) external view returns (uint256) {
        return _judgments[taskId].length;
    }

    // ============ Internal Functions ============

    /**
     * @dev Resolve a task: compute consensus, determine payouts, release funds
     *
     * MINIMUM PARTICIPANT INVARIANTS:
     * - subCount >= 1: guaranteed because JudgePhase requires submissionCount == requiredWorkers
     *   (auto path) or submissionCount >= ceil(requiredWorkers/2) >= 1 (timeout path).
     * - judgCount >= 1: guaranteed because auto-resolve triggers at judgmentCount == requiredJudges
     *   (>= 2), and timeout path requires judgmentCount >= ceil(requiredJudges/2) >= 1.
     * - k = ceil(subCount/2) >= 1: ensures no division by zero in perWorker calculation.
     * - If consensusJudgeCount == 0, task fails and refunds (no payout division occurs).
     */
    function _resolve(uint256 taskId) internal {
        Task storage task = tasks[taskId];
        uint256 subCount = task.submissionCount;
        uint256 judgCount = task.judgmentCount;

        // Collect rankings into memory array
        uint8[][] memory allRankings = new uint8[][](judgCount);
        for (uint256 i = 0; i < judgCount; i++) {
            allRankings[i] = _judgments[taskId][i].rankings;
        }

        // Compute aggregate Borda ranking
        (uint8[] memory aggregateRanking,) = BordaCount.compute(allRankings, subCount);

        // Determine consensus judges using Kendall tau
        uint256 threshold = KendallTau.consensusThreshold(subCount);
        uint256 consensusJudgeCount = 0;
        bool[] memory isConsensusJudge = new bool[](judgCount);

        for (uint256 i = 0; i < judgCount; i++) {
            uint256 dist = KendallTau.distance(allRankings[i], aggregateRanking);
            if (dist <= threshold) {
                isConsensusJudge[i] = true;
                consensusJudgeCount++;
            }
        }

        // If no consensus judges, fail and refund
        if (consensusJudgeCount == 0) {
            _failAndRefund(taskId, "No judge consensus");
            return;
        }

        // Calculate payouts
        uint256 bounty = task.bounty;
        uint256 protocolFee = (bounty * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 remaining = bounty - protocolFee;
        uint256 workerPool = (remaining * workerShareBps) / BPS_DENOMINATOR;
        uint256 judgePool = remaining - workerPool;

        // Determine winning workers: top K = ceil(N/2)
        uint256 k = _ceil(subCount, 2);

        // Build recipient arrays for releaseSplit
        uint256 totalRecipients = k + consensusJudgeCount;
        address[] memory recipients = new address[](totalRecipients);
        uint256[] memory amounts = new uint256[](totalRecipients);

        // Worker payouts
        uint256 perWorker = workerPool / k;
        uint256 workerRemainder = workerPool - (perWorker * k);

        address[] memory winningWorkers = new address[](k);
        for (uint256 i = 0; i < k; i++) {
            uint8 subIdx = aggregateRanking[i];
            address worker = _submissions[taskId][subIdx].worker;
            winningWorkers[i] = worker;
            recipients[i] = worker;
            amounts[i] = perWorker;
        }
        // Remainder wei goes to top-ranked worker
        if (workerRemainder > 0) {
            amounts[0] += workerRemainder;
        }

        // Judge payouts
        uint256 perJudge = judgePool / consensusJudgeCount;
        uint256 judgeRemainder = judgePool - (perJudge * consensusJudgeCount);
        uint256 recipientIdx = k;
        bool firstConsensusJudge = true;

        address[] memory consensusJudges = new address[](consensusJudgeCount);
        uint256 cjIdx = 0;

        for (uint256 i = 0; i < judgCount; i++) {
            if (isConsensusJudge[i]) {
                address judge = _judgments[taskId][i].judge;
                consensusJudges[cjIdx] = judge;
                recipients[recipientIdx] = judge;
                amounts[recipientIdx] = perJudge;
                // Remainder wei goes to first consensus judge
                if (firstConsensusJudge && judgeRemainder > 0) {
                    amounts[recipientIdx] += judgeRemainder;
                    firstConsensusJudge = false;
                }
                recipientIdx++;
                cjIdx++;
            }
        }

        // Release funds via escrow vault
        escrowVault.releaseSplit(taskId, recipients, amounts, protocolTreasury, protocolFee);

        // Update reputation
        for (uint256 i = 0; i < k; i++) {
            agentAdapter.recordWorkerConsensus(winningWorkers[i]);
        }
        for (uint256 i = 0; i < consensusJudgeCount; i++) {
            agentAdapter.recordJudgeConsensus(consensusJudges[i]);
        }

        // Update phase
        TaskPhase oldPhase = task.phase;
        task.phase = TaskPhase.Resolved;

        emit PhaseChanged(taskId, oldPhase, TaskPhase.Resolved);
        emit TaskResolved(taskId, aggregateRanking, winningWorkers, consensusJudges);
    }

    /**
     * @dev Fail a task and refund the creator
     */
    function _failAndRefund(uint256 taskId, string memory reason) internal {
        Task storage task = tasks[taskId];
        TaskPhase oldPhase = task.phase;
        task.phase = TaskPhase.Failed;

        escrowVault.refund(taskId, task.creator);

        emit PhaseChanged(taskId, oldPhase, TaskPhase.Failed);
        emit TaskFailed(taskId, reason);
    }

    /**
     * @dev Validate that rankings is a valid permutation of [0, count-1]
     */
    function _validatePermutation(uint8[] calldata rankings, uint256 count) internal pure {
        bool[] memory seen = new bool[](count);
        for (uint256 i = 0; i < count; i++) {
            if (rankings[i] >= count) revert InvalidPermutation();
            if (seen[rankings[i]]) revert InvalidPermutation();
            seen[rankings[i]] = true;
        }
    }

    /**
     * @dev Ceiling division: ceil(a/b)
     */
    function _ceil(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a + b - 1) / b;
    }
}
