// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { IEscrowVault } from "./interfaces/IEscrowVault.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EscrowVault
 * @notice Holds task bounties in escrow until task completion
 * @dev SECURITY: Uses ReentrancyGuard to prevent reentrancy attacks on ETH transfers
 */
contract EscrowVault is IEscrowVault, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct Escrow {
        address token;
        uint256 amount;
        bool released;
    }

    // Constants
    uint256 public constant MAX_FEE_BPS = 1000; // 10%

    // State
    mapping(uint256 => Escrow) private _escrows;
    address public immutable taskManager;
    uint256 public protocolFeeBps; // default 300 = 3%
    address public protocolTreasury;
    mapping(address => uint256) public accumulatedFees; // token => total fees collected

    // Access control
    address public timelockController;

    // Errors
    error OnlyTaskManager();
    error EscrowNotFound();
    error EscrowAlreadyReleased();
    error EscrowAlreadyExists();
    error InvalidAmount();
    error TransferFailed();
    /// @notice Reverted when the protocol fee ETH transfer to the treasury fails during release().
    ///         Distinct from NetAmountTransferFailed so callers can identify which leg of the
    ///         transfer failed without parsing revert data.
    error FeeTransferFailed();
    /// @notice Reverted when the net bounty ETH transfer to the recipient fails during release().
    ///         Distinct from FeeTransferFailed so callers can identify which leg failed.
    error NetAmountTransferFailed();
    error FeeTooHigh();
    error InvalidTreasury();
    error OnlyTimelock();
    error ZeroAddress();
    /// @notice Reverted when a timelock-gated function is called before setTimelock() has been called.
    ///         Call setTimelock() (owner-only) with the TimelockController address to unlock these functions.
    error TimelockNotConfigured();

    modifier onlyTaskManager() {
        if (msg.sender != taskManager) revert OnlyTaskManager();
        _;
    }

    modifier onlyTimelock() {
        if (timelockController == address(0)) revert TimelockNotConfigured();
        if (msg.sender != timelockController) revert OnlyTimelock();
        _;
    }

    constructor(
        address _taskManager,
        address _treasury,
        uint256 _initialFeeBps
    )
        Ownable(msg.sender)
    {
        if (_treasury == address(0)) revert InvalidTreasury();
        if (_initialFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        taskManager = _taskManager;
        protocolTreasury = _treasury;
        protocolFeeBps = _initialFeeBps;
    }

    /**
     * @notice Deposit bounty for a task
     * @param taskId The task ID
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to deposit
     * @dev UNBOUNDED BOUNTY: There is no upper limit on the bounty amount. Any non-zero
     *      ETH or ERC20 value is accepted. Creators are responsible for ensuring the amount
     *      is appropriate — excessively large bounties are not rejected at the contract level.
     *      If a MAX_BOUNTY cap is desired in the future, it should be enforced here and in
     *      TaskManager.createTask() to provide a single, consistent check point.
     *      SafeERC20 is used for ERC20 transfers to handle non-standard token behaviors
     *      (e.g. tokens that return false instead of reverting on failure, or tokens that
     *      require approval reset before re-approval). SafeERC20.safeTransferFrom() will
     *      revert with a clear error if the transfer fails for any reason.
     */
    function deposit(
        uint256 taskId,
        address token,
        uint256 amount
    )
        external
        payable
        onlyTaskManager
        whenNotPaused
    {
        if (amount == 0) revert InvalidAmount();
        if (_escrows[taskId].amount != 0) revert EscrowAlreadyExists();

        if (token == address(0)) {
            // ETH deposit
            if (msg.value != amount) revert InvalidAmount();
        } else {
            // ERC20 deposit
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        _escrows[taskId] = Escrow({ token: token, amount: amount, released: false });

        emit Deposited(taskId, token, amount);
    }

    /**
     * @notice Deposit ERC20 bounty for a task from a specific address
     * @param taskId The task ID
     * @param token Token address (must not be address(0))
     * @param amount Amount to deposit
     * @param from Address to transfer tokens from (must have approved this contract)
     * @dev SAFERC20 APPROVAL HANDLING: This function uses SafeERC20.safeTransferFrom()
     *      (OpenZeppelin) which wraps the raw ERC20.transferFrom() call to handle several
     *      non-standard token behaviors:
     *        1. Tokens that return false on failure instead of reverting — safeTransferFrom
     *           will revert with a descriptive error rather than silently succeeding.
     *        2. Tokens that don't return a boolean (e.g. USDT on mainnet) — safeTransferFrom
     *           uses low-level call and checks the return data length.
     *        3. Insufficient allowance or balance — the underlying token call reverts and
     *           SafeERC20 propagates the revert, so the escrow is never created.
     *      Callers (i.e. TaskManager) must ensure the `from` address has approved this
     *      EscrowVault contract for at least `amount` tokens before calling depositFrom().
     */
    function depositFrom(
        uint256 taskId,
        address token,
        uint256 amount,
        address from
    )
        external
        onlyTaskManager
    {
        if (amount == 0) revert InvalidAmount();
        if (token == address(0)) revert InvalidAmount(); // Use deposit() for ETH
        if (_escrows[taskId].amount != 0) revert EscrowAlreadyExists();

        // ERC20 deposit from specified address
        IERC20(token).safeTransferFrom(from, address(this), amount);

        _escrows[taskId] = Escrow({ token: token, amount: amount, released: false });

        emit Deposited(taskId, token, amount);
    }

    /**
     * @notice Release bounty to the recipient (agent), deducting protocol fee.
     *         Fee is calculated as: feeAmount = (totalAmount * protocolFeeBps) / 10_000.
     *         Net payout = totalAmount - feeAmount. Fee is sent to protocolTreasury.
     *         protocolFeeBps is capped at MAX_FEE_BPS (1000 = 10%), and Solidity 0.8
     *         overflow checks prevent any arithmetic overflow.
     * @dev ROUNDING: Integer division truncates feeAmount toward zero, so any remainder
     *      wei goes to the recipient (net payout rounds up). This is intentional and
     *      recipient-favorable: the protocol never collects more than its stated fee.
     *      Example: 1 wei bounty with 300 bps fee → feeAmount = 0, netAmount = 1.
     * @dev TODO (test coverage): Add edge-case tests for fee rounding at the boundaries:
     *      - 1 wei bounty at max fee (1000 bps) → feeAmount = 0, netAmount = 1
     *      - Bounty amounts where (amount * feeBps) is not divisible by 10_000
     *      - Bounty amounts at the boundary where fee first rounds to > 0
     *      These are currently untested; rounding behavior is correct by inspection but
     *      formal coverage would guard against accidental fee-calculation changes.
     * @param taskId The task ID
     * @param recipient The address to receive the bounty
     * @dev SECURITY: nonReentrant prevents reentrancy attacks on ETH transfers
     */
    function release(
        uint256 taskId,
        address recipient
    )
        external
        onlyTaskManager
        nonReentrant
        whenNotPaused
    {
        Escrow storage escrow = _escrows[taskId];
        if (escrow.amount == 0) revert EscrowNotFound();
        if (escrow.released) revert EscrowAlreadyReleased();

        escrow.released = true;

        uint256 totalAmount = escrow.amount;
        uint256 feeAmount = (totalAmount * protocolFeeBps) / 10_000;
        uint256 netAmount = totalAmount - feeAmount;

        if (escrow.token == address(0)) {
            // ETH transfers — use specific errors to distinguish which leg failed
            if (feeAmount > 0) {
                (bool feeSuccess,) = protocolTreasury.call{ value: feeAmount }("");
                if (!feeSuccess) revert FeeTransferFailed();
            }
            (bool success,) = recipient.call{ value: netAmount }("");
            if (!success) revert NetAmountTransferFailed();
        } else {
            // ERC20 transfers
            if (feeAmount > 0) {
                IERC20(escrow.token).safeTransfer(protocolTreasury, feeAmount);
            }
            IERC20(escrow.token).safeTransfer(recipient, netAmount);
        }

        // INVARIANT: accumulatedFees is only updated after all transfers succeed.
        // Both ETH and ERC20 branches above revert on failure (via revert TransferFailed()
        // or safeTransfer), so this line is only reached when fees were actually transferred.
        if (feeAmount > 0) {
            accumulatedFees[escrow.token] += feeAmount;
            emit ProtocolFeeCollected(taskId, escrow.token, feeAmount, protocolTreasury);
        }

        emit Released(taskId, recipient, netAmount, feeAmount);
    }

    /**
     * @notice Refund bounty to the creator (on cancellation)
     * @param taskId The task ID
     * @param creator The address to receive the refund
     * @dev SECURITY: nonReentrant prevents reentrancy attacks on ETH transfers
     * @dev No fee is charged on refunds
     */
    function refund(
        uint256 taskId,
        address creator
    )
        external
        onlyTaskManager
        nonReentrant
        whenNotPaused
    {
        Escrow storage escrow = _escrows[taskId];
        if (escrow.amount == 0) revert EscrowNotFound();
        if (escrow.released) revert EscrowAlreadyReleased();

        escrow.released = true;

        if (escrow.token == address(0)) {
            // ETH transfer
            (bool success,) = creator.call{ value: escrow.amount }("");
            if (!success) revert TransferFailed();
        } else {
            // ERC20 transfer
            IERC20(escrow.token).safeTransfer(creator, escrow.amount);
        }

        emit Refunded(taskId, creator, escrow.amount);
    }

    /**
     * @notice Set the timelock address (callable by owner, one-time setup)
     * @param _timelock The TimelockController address
     */
    function setTimelock(address _timelock) external onlyOwner {
        if (_timelock == address(0)) revert ZeroAddress();
        timelockController = _timelock;
        emit TimelockSet(_timelock);
    }

    /**
     * @notice Set the protocol fee in basis points (requires timelock)
     * @param newFeeBps The new fee in basis points (max 1000 = 10%)
     */
    function setProtocolFee(uint256 newFeeBps) external onlyTimelock {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        uint256 oldFeeBps = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(oldFeeBps, newFeeBps);
    }

    /**
     * @notice Set the protocol treasury address (requires timelock)
     * @param newTreasury The new treasury address
     */
    function setProtocolTreasury(address newTreasury) external onlyTimelock {
        if (newTreasury == address(0)) revert InvalidTreasury();
        address oldTreasury = protocolTreasury;
        protocolTreasury = newTreasury;
        emit ProtocolTreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Emergency bypass for setProtocolFee (owner only, emits event for monitoring)
     * @param newFeeBps The new fee in basis points (max 1000 = 10%)
     */
    function emergencySetProtocolFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit EmergencyBypassUsed(msg.sender, this.setProtocolFee.selector);
        uint256 oldFeeBps = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(oldFeeBps, newFeeBps);
    }

    /**
     * @notice Emergency bypass for setProtocolTreasury (owner only, emits event for monitoring)
     * @param newTreasury The new treasury address
     */
    function emergencySetProtocolTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidTreasury();
        emit EmergencyBypassUsed(msg.sender, this.setProtocolTreasury.selector);
        address oldTreasury = protocolTreasury;
        protocolTreasury = newTreasury;
        emit ProtocolTreasuryUpdated(oldTreasury, newTreasury);
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
     * @notice Get the balance of an escrow
     * @param taskId The task ID
     * @return token The token address (address(0) for ETH; also address(0) if escrow never existed)
     * @return amount The escrowed amount (0 if released or if escrow never existed)
     * @dev LIMITATION: Callers cannot distinguish between a released escrow and one that was
     *      never created — both return (address(0), 0) for ETH escrows. Use `hasEscrow(taskId)`
     *      to determine whether an escrow was ever created for this task.
     */
    function getBalance(uint256 taskId) external view returns (address token, uint256 amount) {
        Escrow storage escrow = _escrows[taskId];
        if (escrow.released) {
            return (escrow.token, 0);
        }
        return (escrow.token, escrow.amount);
    }

    /**
     * @notice Check whether an escrow was ever created for a task
     * @param taskId The task ID
     * @return True if an escrow record exists for this task (regardless of whether it has been
     *         released), false if no escrow was ever deposited.
     * @dev Use this to distinguish "escrow released" from "escrow never existed" — `getBalance()`
     *      returns (address(0), 0) for both cases when the token is ETH and the escrow has been
     *      released.
     */
    function hasEscrow(uint256 taskId) external view returns (bool) {
        // An escrow entry is created in deposit()/depositFrom() which sets escrow.amount > 0
        // (both functions revert on amount == 0). After release/refund, escrow.released = true
        // but the struct still exists. We detect existence by checking if the token field was
        // written OR the released flag is set.
        Escrow storage escrow = _escrows[taskId];
        return escrow.amount > 0 || escrow.released;
    }
}
