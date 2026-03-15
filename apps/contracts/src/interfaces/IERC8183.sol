// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title IERC8183
 * @notice View interface for ERC-8183: Agentic Commerce
 * @dev Minimal job escrow protocol for agent-based commerce.
 *      Three roles (client, provider, evaluator) and six states
 *      (Open, Funded, Submitted, Completed, Rejected, Expired).
 *      See: https://eips.ethereum.org/EIPS/eip-8183
 *
 *      This interface covers the read-only surface used by the Pact adapter.
 *      The full spec includes mutating functions (createJob, fund, submit,
 *      complete, reject, claimRefund) which Pact handles via TaskManagerV2.
 */
interface IERC8183 {
    // ============ Enums ============

    enum JobStatus {
        Open,      // 0: Created, budget not yet funded
        Funded,    // 1: Budget escrowed, provider may submit work
        Submitted, // 2: Work submitted, awaiting evaluator decision
        Completed, // 3: Terminal — escrow released to provider
        Rejected,  // 4: Terminal — escrow refunded to client
        Expired    // 5: Terminal — escrow refunded after timeout
    }

    // ============ Structs ============

    struct Job {
        uint256 id;          // Job identifier
        address client;      // Who posted the job
        address provider;    // Who is doing the work (address(0) if unset)
        address evaluator;   // Who evaluates the work
        string description;  // Job description or spec URI
        uint256 budget;      // Payment amount
        uint256 expiredAt;   // Expiry timestamp
        JobStatus status;    // Current state
        address hook;        // Optional hook contract (address(0) if none)
    }

    // ============ Events ============

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed provider,
        address evaluator,
        uint256 expiredAt,
        address hook
    );

    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);

    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);

    event JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason);

    event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason);

    event JobExpired(uint256 indexed jobId);

    event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount);

    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);

    // ============ View Functions ============

    /// @notice Get job details
    function getJob(uint256 jobId) external view returns (Job memory);
}
