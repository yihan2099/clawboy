// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title IPactAgentAdapter
 * @notice Interface for the Pact to ERC-8004 adapter
 * @dev Bridges Pact's TaskManagerV2 to ERC-8004 registries.
 *      V2: Worker/Judge consensus reputation replaces dispute-based reputation.
 */
interface IPactAgentAdapter {
    /// @notice Emitted when an agent is registered
    event AgentRegistered(address indexed wallet, uint256 indexed agentId, string agentURI);

    /// @notice Emitted when an agent's profile is updated
    event AgentProfileUpdated(address indexed wallet, uint256 indexed agentId, string newURI);

    /// @notice Emitted when a worker consensus win is recorded
    event WorkerConsensusRecorded(address indexed wallet, uint256 indexed agentId);

    /// @notice Emitted when a judge consensus win is recorded
    event JudgeConsensusRecorded(address indexed wallet, uint256 indexed agentId);

    /**
     * @notice Check if a wallet is registered as an agent
     * @param wallet The wallet address
     * @return True if the wallet is linked to an agent
     */
    function isRegistered(address wallet) external view returns (bool);

    /**
     * @notice Get the agent ID for a wallet
     * @param wallet The wallet address
     * @return The agent ID (0 if not registered)
     */
    function getAgentId(address wallet) external view returns (uint256);

    /**
     * @notice Register a new agent
     * @param agentURI The URI for the agent's profile
     * @return agentId The created agent ID
     */
    function register(string calldata agentURI) external returns (uint256 agentId);

    /**
     * @notice Update an agent's profile URI
     * @param newURI The new profile URI
     */
    function updateProfile(string calldata newURI) external;

    /**
     * @notice Record a worker consensus win (called by TaskManagerV2)
     * @param agent The worker's wallet address
     */
    function recordWorkerConsensus(address agent) external;

    /**
     * @notice Record a judge consensus win (called by TaskManagerV2)
     * @param agent The judge's wallet address
     */
    function recordJudgeConsensus(address agent) external;

    /**
     * @notice Check if an agent can serve as a judge (requires reputation > 0)
     * @param agent The agent's wallet address
     * @return True if the agent can judge
     */
    function canJudge(address agent) external view returns (bool);

    /**
     * @notice Get the total reputation for an agent
     * @param agent The agent's wallet address
     * @return Total reputation score
     */
    function getReputation(address agent) external view returns (int256);

    /**
     * @notice Get reputation summary for an agent
     * @param agent The agent's wallet address
     * @return workerConsensusWins Number of worker consensus wins
     * @return judgeConsensusWins Number of judge consensus wins
     * @return totalReputation Calculated total reputation
     */
    function getReputationSummary(address agent)
        external
        view
        returns (uint64 workerConsensusWins, uint64 judgeConsensusWins, int256 totalReputation);

    /**
     * @notice Get the ERC-8004 Identity Registry address
     * @return The identity registry address
     */
    function getIdentityRegistry() external view returns (address);

    /**
     * @notice Get the ERC-8004 Reputation Registry address
     * @return The reputation registry address
     */
    function getReputationRegistry() external view returns (address);
}
