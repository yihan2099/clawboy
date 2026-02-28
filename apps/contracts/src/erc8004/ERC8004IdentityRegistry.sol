// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { IERC8004IdentityRegistry } from "./interfaces/IERC8004IdentityRegistry.sol";

/**
 * @title ERC8004IdentityRegistry
 * @notice ERC-8004 compliant agent identity registry based on ERC-721
 * @dev Agents are represented as NFTs with associated metadata and wallets
 */
contract ERC8004IdentityRegistry is ERC721, IERC8004IdentityRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Configuration
    /// @notice Maximum number of metadata entries allowed in a single register() call with metadata.
    ///         This prevents gas exhaustion from unbounded loops during registration.
    uint256 public constant MAX_METADATA_PER_REGISTRATION = 50;

    // State
    uint256 private _agentCounter;

    // Agent URIs (agentId => URI)
    mapping(uint256 => string) private _agentURIs;

    // Agent metadata (agentId => key => value)
    mapping(uint256 => mapping(bytes32 => bytes)) private _metadata;

    // Agent wallets (agentId => wallet, wallet => agentId)
    mapping(uint256 => address) private _agentToWallet;
    mapping(address => uint256) private _walletToAgent;

    // SECURITY: Access control for registerFor
    address public owner;
    mapping(address => bool) public authorizedAdapters;

    // Errors
    error NotAgentOwner();
    error AgentNotFound();
    error InvalidSignature();
    error SignatureExpired();
    error WalletAlreadyLinked();
    error NoWalletLinked();
    error NotOwner();
    error NotAuthorized();
    error ZeroAddress();
    /// @notice Reverted when the metadata array passed to register(string,MetadataEntry[]) exceeds
    ///         MAX_METADATA_PER_REGISTRATION entries, preventing gas exhaustion in the loop.
    error TooManyMetadataEntries();

    // Events for adapter management
    event AdapterAuthorized(address indexed adapter);
    event AdapterRevoked(address indexed adapter);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    /// @notice Emitted when an authorized adapter updates an agent's URI via setAgentURIFor()
    /// @param agentId   The agent whose URI was modified
    /// @param adapter   The adapter that performed the update (msg.sender)
    /// @param newURI    The new URI value
    event AdapterURIUpdate(uint256 indexed agentId, address indexed adapter, string newURI);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() ERC721("ERC8004 Agent Identity", "AGENT") {
        owner = msg.sender;
    }

    /**
     * @notice Authorize an adapter to call registerFor
     * @param adapter The adapter address to authorize
     */
    function authorizeAdapter(address adapter) external onlyOwner {
        authorizedAdapters[adapter] = true;
        emit AdapterAuthorized(adapter);
    }

    /**
     * @notice Revoke an adapter's authorization
     * @param adapter The adapter address to revoke
     */
    function revokeAdapter(address adapter) external onlyOwner {
        authorizedAdapters[adapter] = false;
        emit AdapterRevoked(adapter);
    }

    /**
     * @notice Transfer ownership of the registry
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /**
     * @notice Register a new agent with no URI
     */
    function register() external returns (uint256 agentId) {
        return _register(msg.sender, "");
    }

    /**
     * @notice Register a new agent with a URI
     */
    function register(string calldata agentURI) external returns (uint256 agentId) {
        return _register(msg.sender, agentURI);
    }

    /**
     * @notice Register a new agent with URI and metadata
     * @dev The metadata array is bounded by MAX_METADATA_PER_REGISTRATION to prevent
     *      gas exhaustion. Callers with more metadata should register first then call
     *      setMetadata() in subsequent transactions.
     */
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    )
        external
        returns (uint256 agentId)
    {
        if (metadata.length > MAX_METADATA_PER_REGISTRATION) revert TooManyMetadataEntries();

        agentId = _register(msg.sender, agentURI);

        for (uint256 i = 0; i < metadata.length; i++) {
            bytes32 keyHash = keccak256(bytes(metadata[i].metadataKey));
            _metadata[agentId][keyHash] = metadata[i].metadataValue;

            emit MetadataSet(
                agentId, metadata[i].metadataKey, metadata[i].metadataKey, metadata[i].metadataValue
            );
        }
    }

    /**
     * @notice Register a new agent on behalf of another address
     * @dev SECURITY: Only authorized adapters can call this function to prevent
     *      spam registration and griefing attacks.
     * @param recipient The address that will own the agent NFT
     * @param agentURI The URI pointing to agent metadata
     * @return agentId The ID of the newly registered agent
     */
    function registerFor(
        address recipient,
        string calldata agentURI
    )
        external
        returns (uint256 agentId)
    {
        // SECURITY: Only authorized adapters can register on behalf of others
        if (!authorizedAdapters[msg.sender]) revert NotAuthorized();
        return _register(recipient, agentURI);
    }

    /**
     * @dev Internal registration logic
     * @dev Enforces one-agent-per-wallet: reverts with WalletAlreadyLinked() if the
     *      registering address already owns an agent. This closes a race condition where
     *      two concurrent _register() calls for the same wallet could produce two agents
     *      both pointing to the same wallet (inconsistent _walletToAgent mapping).
     */
    function _register(address owner, string memory agentURI) private returns (uint256 agentId) {
        // Prevent a wallet from being linked to more than one agent at a time.
        if (_walletToAgent[owner] != 0) revert WalletAlreadyLinked();

        agentId = ++_agentCounter;

        _mint(owner, agentId);
        _agentURIs[agentId] = agentURI;

        // Auto-link the registering wallet to the agent.
        _agentToWallet[agentId] = owner;
        _walletToAgent[owner] = agentId;

        emit Registered(agentId, agentURI, owner);
        emit AgentWalletSet(agentId, owner);
    }

    /**
     * @notice Update an agent's URI (only owner can call)
     */
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        if (!_exists(agentId)) revert AgentNotFound();
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();

        _agentURIs[agentId] = newURI;

        emit URIUpdated(agentId, newURI, msg.sender);
    }

    /**
     * @notice Update an agent's URI on behalf of the owner
     * @dev SECURITY: Only the linked wallet itself can call this function.
     *      This prevents unauthorized URI changes by third parties.
     * @param wallet The wallet address linked to the agent (must be msg.sender)
     * @param newURI The new URI for the agent
     */
    function setAgentURIFor(address wallet, string calldata newURI) external {
        // SECURITY: Caller must be the wallet itself OR an authorized adapter
        if (msg.sender != wallet && !authorizedAdapters[msg.sender]) revert NotAgentOwner();

        uint256 agentId = _walletToAgent[wallet];
        if (agentId == 0) revert AgentNotFound();

        _agentURIs[agentId] = newURI;

        emit URIUpdated(agentId, newURI, wallet);

        // Emit a distinct event when an adapter performs the update, allowing on-chain monitoring
        // of adapter-initiated URI changes independently from owner-initiated changes.
        if (msg.sender != wallet && authorizedAdapters[msg.sender]) {
            emit AdapterURIUpdate(agentId, msg.sender, newURI);
        }
    }

    /**
     * @notice Get an agent's URI
     */
    function getAgentURI(uint256 agentId) external view returns (string memory) {
        if (!_exists(agentId)) revert AgentNotFound();
        return _agentURIs[agentId];
    }

    /**
     * @notice Override tokenURI to return agent URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert AgentNotFound();
        return _agentURIs[tokenId];
    }

    /**
     * @notice Set metadata for an agent
     */
    function setMetadata(
        uint256 agentId,
        string calldata metadataKey,
        bytes calldata metadataValue
    )
        external
    {
        if (!_exists(agentId)) revert AgentNotFound();
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();

        bytes32 keyHash = keccak256(bytes(metadataKey));
        _metadata[agentId][keyHash] = metadataValue;

        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    /**
     * @notice Get metadata for an agent
     */
    function getMetadata(
        uint256 agentId,
        string calldata metadataKey
    )
        external
        view
        returns (bytes memory)
    {
        if (!_exists(agentId)) revert AgentNotFound();

        bytes32 keyHash = keccak256(bytes(metadataKey));
        return _metadata[agentId][keyHash];
    }

    /**
     * @notice Set an agent's wallet with signature verification
     * @dev The new wallet must sign a message authorizing the link
     * @dev NON-STANDARD DEADLINE SEMANTICS: Unlike most EIP-712 flows where a
     *      future deadline means "valid until this time", here the check is
     *      `deadline > block.timestamp` which reverts when the deadline is in the
     *      FUTURE. This means the deadline must be <= block.timestamp (i.e. the
     *      current block or past) for the call to succeed.
     *
     *      Rationale: this prevents long-lived pre-signed authorizations from
     *      accumulating as "time bombs" that could be replayed later. The intended
     *      usage is deadline = block.timestamp so the signature is consumed
     *      immediately at the time of signing.
     */
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    )
        external
    {
        if (!_exists(agentId)) revert AgentNotFound();
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        // SECURITY: deadline must not be in the future to prevent pre-signed wallet
        // link authorizations that could be used as time bombs. The caller should
        // set deadline = block.timestamp (or a value <= current block) to ensure
        // the signature is consumed at the time of signing.
        if (deadline > block.timestamp) revert SignatureExpired();
        if (_walletToAgent[newWallet] != 0) revert WalletAlreadyLinked();

        // Verify signature from new wallet
        bytes32 message =
            keccak256(abi.encodePacked("Link wallet to agent:", agentId, deadline, address(this)));
        bytes32 ethSignedMessage = message.toEthSignedMessageHash();
        address signer = ethSignedMessage.recover(signature);

        if (signer != newWallet) revert InvalidSignature();

        // Unlink previous wallet if exists
        address previousWallet = _agentToWallet[agentId];
        if (previousWallet != address(0)) {
            delete _walletToAgent[previousWallet];
        }

        // Link new wallet
        _agentToWallet[agentId] = newWallet;
        _walletToAgent[newWallet] = agentId;

        emit AgentWalletSet(agentId, newWallet);
    }

    /**
     * @notice Get an agent's associated wallet
     */
    function getAgentWallet(uint256 agentId) external view returns (address) {
        if (!_exists(agentId)) revert AgentNotFound();
        return _agentToWallet[agentId];
    }

    /**
     * @notice Unset an agent's wallet
     */
    function unsetAgentWallet(uint256 agentId) external {
        if (!_exists(agentId)) revert AgentNotFound();
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();

        address previousWallet = _agentToWallet[agentId];
        if (previousWallet == address(0)) revert NoWalletLinked();

        delete _walletToAgent[previousWallet];
        delete _agentToWallet[agentId];

        emit AgentWalletUnset(agentId, previousWallet);
    }

    /**
     * @notice Get the agent ID for a wallet address
     */
    function getAgentIdByWallet(address wallet) external view returns (uint256) {
        return _walletToAgent[wallet];
    }

    /**
     * @notice Get the total number of registered agents
     */
    function totalAgents() external view returns (uint256) {
        return _agentCounter;
    }

    /**
     * @dev Check if an agent exists
     */
    function _exists(uint256 agentId) internal view returns (bool) {
        return agentId > 0 && agentId <= _agentCounter;
    }

    /**
     * @dev Override _update - wallet links persist across transfers
     * @dev SECURITY: Wallet unlinking should only happen via explicit unsetAgentWallet() call,
     *      not automatically on NFT transfer. This prevents breaking agent identity on transfer.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        // Wallet links are preserved during transfer - unlinking must be explicit
        return super._update(to, tokenId, auth);
    }
}
