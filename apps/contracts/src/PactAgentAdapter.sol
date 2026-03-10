// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { IPactAgentAdapter } from "./IPactAgentAdapter.sol";
import { IERC8004IdentityRegistry } from "./erc8004/interfaces/IERC8004IdentityRegistry.sol";
import { IERC8004ReputationRegistry } from "./erc8004/interfaces/IERC8004ReputationRegistry.sol";

/**
 * @title PactAgentAdapter
 * @notice Bridges Pact's TaskManagerV2 to ERC-8004 registries
 * @dev Translates Pact reputation events into ERC-8004 feedback.
 *      V2: Worker/Judge consensus reputation replaces dispute-based reputation.
 */
contract PactAgentAdapter is IPactAgentAdapter {
    // ERC-8004 registries
    IERC8004IdentityRegistry public immutable identityRegistry;
    IERC8004ReputationRegistry public immutable reputationRegistry;

    // Access control
    address public owner;
    address public taskManager;

    // Feedback tags
    string public constant TAG_TASK = "task";
    string public constant TAG_WORKER = "worker";
    string public constant TAG_JUDGE = "judge";
    string public constant TAG_CONSENSUS = "consensus";

    // Feedback values (with no decimals)
    int128 public constant WORKER_CONSENSUS_REP = 10;
    int128 public constant JUDGE_CONSENSUS_REP = 5;

    // Access control (continued)
    address public pendingOwner;
    address public timelock;

    // Errors
    error OnlyOwner();
    error Unauthorized();
    error NotRegistered();
    error AlreadyRegistered();
    error NotPendingOwner();
    error ZeroAddress();
    error OnlyTimelock();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyTimelock() {
        if (msg.sender != timelock) revert OnlyTimelock();
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != taskManager) {
            revert Unauthorized();
        }
        _;
    }

    // Ownership events
    event OwnershipTransferInitiated(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Emergency bypass event
    event EmergencyBypassUsed(address indexed caller, bytes4 indexed selector);

    // Timelock configuration event
    event TimelockSet(address indexed newTimelock);

    constructor(address _identityRegistry, address _reputationRegistry) {
        identityRegistry = IERC8004IdentityRegistry(_identityRegistry);
        reputationRegistry = IERC8004ReputationRegistry(_reputationRegistry);
        owner = msg.sender;
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
     * @notice Set the TaskManager address (requires timelock)
     */
    function setTaskManager(address _taskManager) external onlyTimelock {
        if (_taskManager == address(0)) revert ZeroAddress();
        taskManager = _taskManager;
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
     * @notice Emergency bypass for setTaskManager (owner only, emits event for monitoring)
     * @param _taskManager The TaskManager address
     */
    function emergencySetTaskManager(address _taskManager) external onlyOwner {
        if (_taskManager == address(0)) revert ZeroAddress();
        taskManager = _taskManager;
        emit EmergencyBypassUsed(msg.sender, this.setTaskManager.selector);
    }

    /**
     * @notice Check if a wallet is currently registered as an agent
     * @param wallet The wallet address to check
     * @return True if the wallet is currently linked to an agent ID in the identity registry
     * @dev CURRENT STATE ONLY: This function reflects the registration status at the time of
     *      the call. It does NOT indicate historical registration — a wallet that previously
     *      had an agent NFT but transferred it (thereby unlinking the wallet via the explicit
     *      unsetAgentWallet() flow) will return false. Callers that need to know whether an
     *      address was *ever* registered must track the AgentWalletSet / AgentWalletUnset
     *      events emitted by the IdentityRegistry.
     *
     *      NOTE: isRegistered() returning true does not guarantee the agent will still be
     *      registered by the time a state-changing transaction is mined (TOCTOU risk in
     *      off-chain code). On-chain callers (TaskManager) rely on this check being in
     *      the same transaction, so there is no TOCTOU issue there.
     */
    function isRegistered(address wallet) external view returns (bool) {
        return identityRegistry.getAgentIdByWallet(wallet) != 0;
    }

    /**
     * @notice Get the agent ID for a wallet
     */
    function getAgentId(address wallet) external view returns (uint256) {
        return identityRegistry.getAgentIdByWallet(wallet);
    }

    /**
     * @notice Register a new agent
     */
    function register(string calldata agentURI) external returns (uint256 agentId) {
        // Check if already registered
        if (identityRegistry.getAgentIdByWallet(msg.sender) != 0) revert AlreadyRegistered();

        // Register in identity registry on behalf of the caller
        agentId = identityRegistry.registerFor(msg.sender, agentURI);

        emit AgentRegistered(msg.sender, agentId, agentURI);
    }

    /**
     * @notice Update an agent's profile URI
     */
    function updateProfile(string calldata newURI) external {
        uint256 agentId = identityRegistry.getAgentIdByWallet(msg.sender);
        if (agentId == 0) revert NotRegistered();

        identityRegistry.setAgentURIFor(msg.sender, newURI);

        emit AgentProfileUpdated(msg.sender, agentId, newURI);
    }

    /**
     * @notice Record a worker consensus win (called by TaskManagerV2 during resolve)
     * @param agent The worker's wallet address
     */
    function recordWorkerConsensus(address agent) external onlyAuthorized {
        uint256 agentId = identityRegistry.getAgentIdByWallet(agent);
        if (agentId == 0) revert NotRegistered();

        reputationRegistry.giveFeedback(
            agentId,
            WORKER_CONSENSUS_REP,
            0, // no decimals
            TAG_WORKER,
            TAG_CONSENSUS,
            "", // no endpoint
            "", // no feedbackURI
            bytes32(keccak256(abi.encodePacked(agent, agentId, block.timestamp)))
        );

        emit WorkerConsensusRecorded(agent, agentId);
    }

    /**
     * @notice Record a judge consensus win (called by TaskManagerV2 during resolve)
     * @param agent The judge's wallet address
     */
    function recordJudgeConsensus(address agent) external onlyAuthorized {
        uint256 agentId = identityRegistry.getAgentIdByWallet(agent);
        if (agentId == 0) revert NotRegistered();

        reputationRegistry.giveFeedback(
            agentId,
            JUDGE_CONSENSUS_REP,
            0, // no decimals
            TAG_JUDGE,
            TAG_CONSENSUS,
            "", // no endpoint
            "", // no feedbackURI
            bytes32(keccak256(abi.encodePacked(agent, agentId, block.timestamp)))
        );

        emit JudgeConsensusRecorded(agent, agentId);
    }

    /**
     * @notice Check if an agent can serve as a judge (requires reputation > 0)
     * @param agent The agent's wallet address
     * @return True if the agent is registered and has positive reputation
     */
    function canJudge(address agent) external view returns (bool) {
        uint256 agentId = identityRegistry.getAgentIdByWallet(agent);
        if (agentId == 0) return false;

        // Check if agent has any worker or judge consensus records
        uint64 workerWins = reputationRegistry.getFeedbackCount(agentId, TAG_WORKER, TAG_CONSENSUS);
        uint64 judgeWins = reputationRegistry.getFeedbackCount(agentId, TAG_JUDGE, TAG_CONSENSUS);

        int256 rep = int256(uint256(workerWins)) * int256(int128(WORKER_CONSENSUS_REP))
            + int256(uint256(judgeWins)) * int256(int128(JUDGE_CONSENSUS_REP));

        return rep > 0;
    }

    /**
     * @notice Get the total reputation for an agent
     * @param agent The agent's wallet address
     * @return Total reputation (can be 0 for new agents, never negative in V2)
     */
    function getReputation(address agent) external view returns (int256) {
        uint256 agentId = identityRegistry.getAgentIdByWallet(agent);
        if (agentId == 0) return 0;

        uint64 workerWins = reputationRegistry.getFeedbackCount(agentId, TAG_WORKER, TAG_CONSENSUS);
        uint64 judgeWins = reputationRegistry.getFeedbackCount(agentId, TAG_JUDGE, TAG_CONSENSUS);

        return int256(uint256(workerWins)) * int256(int128(WORKER_CONSENSUS_REP))
            + int256(uint256(judgeWins)) * int256(int128(JUDGE_CONSENSUS_REP));
    }

    /**
     * @notice Get reputation summary for an agent
     * @dev Uses O(1) getFeedbackCount() instead of O(n) getSummary() for gas efficiency
     */
    function getReputationSummary(address agent)
        external
        view
        returns (uint64 workerConsensusWins, uint64 judgeConsensusWins, int256 totalReputation)
    {
        uint256 agentId = identityRegistry.getAgentIdByWallet(agent);
        if (agentId == 0) return (0, 0, 0);

        workerConsensusWins = reputationRegistry.getFeedbackCount(agentId, TAG_WORKER, TAG_CONSENSUS);
        judgeConsensusWins = reputationRegistry.getFeedbackCount(agentId, TAG_JUDGE, TAG_CONSENSUS);

        totalReputation = int256(uint256(workerConsensusWins)) * int256(int128(WORKER_CONSENSUS_REP))
            + int256(uint256(judgeConsensusWins)) * int256(int128(JUDGE_CONSENSUS_REP));
    }

    /**
     * @notice Get the ERC-8004 Identity Registry address
     */
    function getIdentityRegistry() external view returns (address) {
        return address(identityRegistry);
    }

    /**
     * @notice Get the ERC-8004 Reputation Registry address
     */
    function getReputationRegistry() external view returns (address) {
        return address(reputationRegistry);
    }
}
