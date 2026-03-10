// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { EscrowVault } from "../src/EscrowVault.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Simple mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract EscrowVaultV2Test is Test {
    EscrowVault public escrowVault;
    MockERC20 public token;

    address public treasury = address(0xAAA);
    address public taskManager;

    address public recipient1 = address(0xB001);
    address public recipient2 = address(0xB002);
    address public recipient3 = address(0xB003);

    uint256 public constant BOUNTY = 1 ether;

    function setUp() public {
        taskManager = address(0x7777);
        escrowVault = new EscrowVault(taskManager, treasury, 0);
        escrowVault.setTimelock(address(this));

        token = new MockERC20();

        vm.deal(taskManager, 100 ether);
        token.mint(taskManager, 100 ether);

        vm.prank(taskManager);
        token.approve(address(escrowVault), type(uint256).max);
    }

    /*//////////////////////////////////////////////////////////////
                    RELEASE SPLIT: MULTI-RECIPIENT
    //////////////////////////////////////////////////////////////*/

    function test_ReleaseSplit_TwoRecipients_ETH() public {
        uint256 taskId = 1;

        vm.prank(taskManager);
        escrowVault.deposit{ value: BOUNTY }(taskId, address(0), BOUNTY);

        address[] memory recipients = new address[](2);
        recipients[0] = recipient1;
        recipients[1] = recipient2;

        uint256 feeAmount = 0.03 ether;
        uint256 remaining = BOUNTY - feeAmount;
        uint256 perRecipient = remaining / 2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = perRecipient + (remaining - perRecipient * 2); // remainder to first
        amounts[1] = perRecipient;

        uint256 r1Before = recipient1.balance;
        uint256 r2Before = recipient2.balance;
        uint256 tBefore = treasury.balance;

        vm.prank(taskManager);
        escrowVault.releaseSplit(taskId, recipients, amounts, treasury, feeAmount);

        assertEq(recipient1.balance, r1Before + amounts[0]);
        assertEq(recipient2.balance, r2Before + amounts[1]);
        assertEq(treasury.balance, tBefore + feeAmount);
    }

    /*//////////////////////////////////////////////////////////////
                    RELEASE SPLIT: SUM VALIDATION
    //////////////////////////////////////////////////////////////*/

    function test_ReleaseSplit_RevertIfSumMismatch() public {
        uint256 taskId = 1;

        vm.prank(taskManager);
        escrowVault.deposit{ value: BOUNTY }(taskId, address(0), BOUNTY);

        address[] memory recipients = new address[](2);
        recipients[0] = recipient1;
        recipients[1] = recipient2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 0.5 ether;
        amounts[1] = 0.4 ether;
        // Sum = 0.9 ether + feeAmount 0 = 0.9 ether != 1 ether

        vm.prank(taskManager);
        vm.expectRevert(EscrowVault.PayoutSumMismatch.selector);
        escrowVault.releaseSplit(taskId, recipients, amounts, treasury, 0);
    }

    /*//////////////////////////////////////////////////////////////
                    RELEASE SPLIT: THREE RECIPIENTS WITH FEE
    //////////////////////////////////////////////////////////////*/

    function test_ReleaseSplit_ThreeRecipients_WithFee_ERC20() public {
        uint256 taskId = 1;

        vm.prank(taskManager);
        escrowVault.deposit(taskId, address(token), BOUNTY);

        address[] memory recipients = new address[](3);
        recipients[0] = recipient1;
        recipients[1] = recipient2;
        recipients[2] = recipient3;

        uint256 feeAmount = 0.03 ether;
        uint256 remaining = BOUNTY - feeAmount;
        uint256 perRecipient = remaining / 3;
        uint256 remainder = remaining - (perRecipient * 3);

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = perRecipient + remainder;
        amounts[1] = perRecipient;
        amounts[2] = perRecipient;

        uint256 r1Before = token.balanceOf(recipient1);
        uint256 r2Before = token.balanceOf(recipient2);
        uint256 r3Before = token.balanceOf(recipient3);
        uint256 tBefore = token.balanceOf(treasury);

        vm.prank(taskManager);
        escrowVault.releaseSplit(taskId, recipients, amounts, treasury, feeAmount);

        assertEq(token.balanceOf(recipient1), r1Before + amounts[0]);
        assertEq(token.balanceOf(recipient2), r2Before + amounts[1]);
        assertEq(token.balanceOf(recipient3), r3Before + amounts[2]);
        assertEq(token.balanceOf(treasury), tBefore + feeAmount);
    }
}
