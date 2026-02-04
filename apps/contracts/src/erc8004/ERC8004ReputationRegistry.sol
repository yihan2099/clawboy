// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { IERC8004ReputationRegistry } from "./interfaces/IERC8004ReputationRegistry.sol";
import { IERC8004IdentityRegistry } from "./interfaces/IERC8004IdentityRegistry.sol";

/**
 * @title ERC8004ReputationRegistry
 * @notice ERC-8004 compliant reputation registry with feedback and tags
 * @dev Stores feedback from clients with categorization tags
 */
contract ERC8004ReputationRegistry is IERC8004ReputationRegistry {
    /// @notice Feedback entry structure (simplified to avoid stack issues)
    struct FeedbackEntry {
        int128 value;
        uint8 valueDecimals;
        bytes32 tag1Hash;
        bytes32 tag2Hash;
        bytes32 feedbackHash;
        bool isRevoked;
        uint64 timestamp;
    }

    // State
    address private _identityRegistry;
    bool private _initialized;

    // Feedback storage: agentId => clientAddress => feedbackIndex => FeedbackEntry
    mapping(uint256 => mapping(address => mapping(uint64 => FeedbackEntry))) private _feedback;

    // Client tracking: agentId => array of clients
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _isClient;

    // Last index per client-agent pair: agentId => clientAddress => lastIndex
    mapping(uint256 => mapping(address => uint64)) private _lastIndex;

    // Tag-based counts: agentId => tag1Hash => tag2Hash => count
    mapping(uint256 => mapping(bytes32 => mapping(bytes32 => uint64))) private _tagCounts;

    // Errors
    error NotInitialized();
    error AlreadyInitialized();
    error AgentNotFound();
    error FeedbackNotFound();
    error FeedbackAlreadyRevoked();

    modifier onlyInitialized() {
        if (!_initialized) revert NotInitialized();
        _;
    }

    /**
     * @notice Initialize the reputation registry with an identity registry
     */
    function initialize(address identityRegistry_) external {
        if (_initialized) revert AlreadyInitialized();
        _identityRegistry = identityRegistry_;
        _initialized = true;
    }

    /**
     * @notice Get the identity registry address
     */
    function getIdentityRegistry() external view returns (address) {
        return _identityRegistry;
    }

    /**
     * @notice Give feedback to an agent
     */
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata, // endpoint - unused but kept for interface compatibility
        string calldata, // feedbackURI - unused but kept for interface compatibility
        bytes32 feedbackHash
    )
        external
        onlyInitialized
    {
        _giveFeedbackInternal(agentId, value, valueDecimals, tag1, tag2, feedbackHash);
    }

    function _giveFeedbackInternal(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        bytes32 feedbackHash
    )
        private
    {
        // Verify agent exists
        IERC8004IdentityRegistry registry = IERC8004IdentityRegistry(_identityRegistry);
        if (agentId > registry.totalAgents() || agentId == 0) revert AgentNotFound();

        // Track client if new
        if (!_isClient[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _isClient[agentId][msg.sender] = true;
        }

        // Get next feedback index
        uint64 feedbackIndex = _lastIndex[agentId][msg.sender];

        // Compute tag hashes
        bytes32 tag1Hash = keccak256(bytes(tag1));
        bytes32 tag2Hash = keccak256(bytes(tag2));

        // Store feedback
        _feedback[agentId][msg.sender][feedbackIndex] = FeedbackEntry({
            value: value,
            valueDecimals: valueDecimals,
            tag1Hash: tag1Hash,
            tag2Hash: tag2Hash,
            feedbackHash: feedbackHash,
            isRevoked: false,
            timestamp: uint64(block.timestamp)
        });

        // Update tag counts
        _tagCounts[agentId][tag1Hash][tag2Hash]++;

        // Increment last index
        _lastIndex[agentId][msg.sender] = feedbackIndex + 1;

        emit NewFeedback(
            agentId,
            msg.sender,
            feedbackIndex,
            value,
            valueDecimals,
            tag1,
            tag1,
            tag2,
            "",
            "",
            feedbackHash
        );
    }

    /**
     * @notice Revoke previously given feedback
     */
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external onlyInitialized {
        FeedbackEntry storage entry = _feedback[agentId][msg.sender][feedbackIndex];

        if (entry.timestamp == 0) revert FeedbackNotFound();
        if (entry.isRevoked) revert FeedbackAlreadyRevoked();

        entry.isRevoked = true;

        // Decrement tag counts
        if (_tagCounts[agentId][entry.tag1Hash][entry.tag2Hash] > 0) {
            _tagCounts[agentId][entry.tag1Hash][entry.tag2Hash]--;
        }

        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /**
     * @notice Append a response to feedback (simplified - no storage)
     */
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    )
        external
        onlyInitialized
    {
        FeedbackEntry storage entry = _feedback[agentId][clientAddress][feedbackIndex];
        if (entry.timestamp == 0) revert FeedbackNotFound();

        emit ResponseAppended(
            agentId, clientAddress, feedbackIndex, msg.sender, responseURI, responseHash
        );
    }

    // Maximum iterations to prevent gas exhaustion
    uint256 public constant MAX_CLIENTS_PER_CALL = 100;
    uint256 public constant MAX_FEEDBACK_PER_CLIENT = 100;

    // Errors for iteration limits
    error TooManyClients();
    error TooManyFeedback();

    /**
     * @notice Get a summary of an agent's reputation with pagination support
     * @dev For agents with many clients/feedback, use getPaginatedSummary instead
     */
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    )
        external
        view
        returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
    {
        summaryValueDecimals = 0;

        bytes32 tag1Hash = bytes(tag1).length > 0 ? keccak256(bytes(tag1)) : bytes32(0);
        bytes32 tag2Hash = bytes(tag2).length > 0 ? keccak256(bytes(tag2)) : bytes32(0);

        // If specific clients provided, use them; otherwise use all clients
        uint256 numClients =
            clientAddresses.length > 0 ? clientAddresses.length : _clients[agentId].length;

        // Enforce iteration limit to prevent gas exhaustion
        if (numClients > MAX_CLIENTS_PER_CALL) revert TooManyClients();

        for (uint256 i = 0; i < numClients; i++) {
            address client = clientAddresses.length > 0 ? clientAddresses[i] : _clients[agentId][i];
            uint64 lastIdx = _lastIndex[agentId][client];

            // Enforce feedback limit per client
            if (lastIdx > MAX_FEEDBACK_PER_CLIENT) revert TooManyFeedback();

            for (uint64 j = 0; j < lastIdx; j++) {
                FeedbackEntry storage entry = _feedback[agentId][client][j];

                if (entry.isRevoked) continue;

                // Check tag filters
                if (tag1Hash != bytes32(0) && entry.tag1Hash != tag1Hash) continue;
                if (tag2Hash != bytes32(0) && entry.tag2Hash != tag2Hash) continue;

                count++;
                summaryValue += entry.value;
            }
        }
    }

    /**
     * @notice Get paginated summary for agents with many clients
     * @param startClientIndex Starting index in the clients array
     * @param maxClients Maximum number of clients to process in this call
     */
    function getPaginatedSummary(
        uint256 agentId,
        string calldata tag1,
        string calldata tag2,
        uint256 startClientIndex,
        uint256 maxClients
    )
        external
        view
        returns (
            uint64 count,
            int128 summaryValue,
            uint8 summaryValueDecimals,
            uint256 processedClients,
            bool hasMore
        )
    {
        summaryValueDecimals = 0;

        bytes32 tag1Hash = bytes(tag1).length > 0 ? keccak256(bytes(tag1)) : bytes32(0);
        bytes32 tag2Hash = bytes(tag2).length > 0 ? keccak256(bytes(tag2)) : bytes32(0);

        uint256 totalClients = _clients[agentId].length;
        uint256 endIndex = startClientIndex + maxClients;
        if (endIndex > totalClients) endIndex = totalClients;

        // Enforce maximum per call
        if (maxClients > MAX_CLIENTS_PER_CALL) maxClients = MAX_CLIENTS_PER_CALL;

        for (uint256 i = startClientIndex; i < endIndex; i++) {
            address client = _clients[agentId][i];
            uint64 lastIdx = _lastIndex[agentId][client];

            // Skip clients with too much feedback in paginated call
            if (lastIdx > MAX_FEEDBACK_PER_CLIENT) continue;

            for (uint64 j = 0; j < lastIdx; j++) {
                FeedbackEntry storage entry = _feedback[agentId][client][j];

                if (entry.isRevoked) continue;

                // Check tag filters
                if (tag1Hash != bytes32(0) && entry.tag1Hash != tag1Hash) continue;
                if (tag2Hash != bytes32(0) && entry.tag2Hash != tag2Hash) continue;

                count++;
                summaryValue += entry.value;
            }

            processedClients++;
        }

        hasMore = endIndex < totalClients;
    }

    /**
     * @notice Read a specific feedback entry
     */
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    )
        external
        view
        returns (
            int128 value,
            uint8 valueDecimals,
            string memory tag1,
            string memory tag2,
            bool isRevoked
        )
    {
        FeedbackEntry storage entry = _feedback[agentId][clientAddress][feedbackIndex];
        if (entry.timestamp == 0) revert FeedbackNotFound();

        // Note: We can't return the original tag strings since we only store hashes
        // Return empty strings - callers should track tags externally if needed
        return (entry.value, entry.valueDecimals, "", "", entry.isRevoked);
    }

    /**
     * @notice Get all clients who have given feedback to an agent
     */
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    /**
     * @notice Get the last feedback index for a client-agent pair
     */
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return _lastIndex[agentId][clientAddress];
    }

    /**
     * @notice Get feedback count by tags
     */
    function getFeedbackCount(
        uint256 agentId,
        string calldata tag1,
        string calldata tag2
    )
        external
        view
        returns (uint64 count)
    {
        bytes32 tag1Hash = keccak256(bytes(tag1));
        bytes32 tag2Hash = keccak256(bytes(tag2));
        return _tagCounts[agentId][tag1Hash][tag2Hash];
    }
}
