// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { TaskManagerV2 } from "../src/TaskManagerV2.sol";
import { EscrowVault } from "../src/EscrowVault.sol";
import { PactAgentAdapter } from "../src/PactAgentAdapter.sol";
import { ERC8004IdentityRegistry } from "../src/erc8004/ERC8004IdentityRegistry.sol";
import { ERC8004ReputationRegistry } from "../src/erc8004/ERC8004ReputationRegistry.sol";
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

contract TaskManagerV2Test is Test {
    TaskManagerV2 public taskManager;
    EscrowVault public escrowVault;
    PactAgentAdapter public agentAdapter;
    ERC8004IdentityRegistry public identityRegistry;
    ERC8004ReputationRegistry public reputationRegistry;
    MockERC20 public mockToken;

    address public deployer;
    address public treasury = address(0xAAA);
    address public emergencyAdmin = address(0xEEE);

    // Agents
    address public creator = address(0x1001);
    address public worker1 = address(0x2001);
    address public worker2 = address(0x2002);
    address public worker3 = address(0x2003);
    address public judge1 = address(0x3001);
    address public judge2 = address(0x3002);
    address public judge3 = address(0x3003);

    uint256 public constant BOUNTY = 1 ether;
    uint256 public constant WORK_DURATION = 1 days;
    uint256 public constant JUDGE_DURATION = 2 days;

    function setUp() public {
        deployer = address(this);

        // Deploy registries
        identityRegistry = new ERC8004IdentityRegistry();
        reputationRegistry = new ERC8004ReputationRegistry(address(identityRegistry));

        // Deploy adapter
        agentAdapter = new PactAgentAdapter(address(identityRegistry), address(reputationRegistry));

        // Predict TaskManagerV2 address for EscrowVault
        uint64 currentNonce = vm.getNonce(deployer);
        address predictedTaskManager = vm.computeCreateAddress(deployer, currentNonce + 1);

        // Deploy EscrowVault
        escrowVault = new EscrowVault(predictedTaskManager, treasury, 0);

        // Deploy TaskManagerV2
        taskManager = new TaskManagerV2(
            address(escrowVault), address(agentAdapter), treasury, emergencyAdmin
        );
        require(address(taskManager) == predictedTaskManager, "Address mismatch");

        // Wire permissions
        identityRegistry.authorizeAdapter(address(agentAdapter));
        agentAdapter.emergencySetTaskManager(address(taskManager));

        // Fund agents
        vm.deal(creator, 100 ether);
        vm.deal(worker1, 100 ether);
        vm.deal(worker2, 100 ether);
        vm.deal(worker3, 100 ether);
        vm.deal(judge1, 100 ether);
        vm.deal(judge2, 100 ether);
        vm.deal(judge3, 100 ether);

        // Register all agents
        _registerAgent(creator, "creator-uri");
        _registerAgent(worker1, "worker1-uri");
        _registerAgent(worker2, "worker2-uri");
        _registerAgent(worker3, "worker3-uri");
        _registerAgent(judge1, "judge1-uri");
        _registerAgent(judge2, "judge2-uri");
        _registerAgent(judge3, "judge3-uri");

        // Give judges reputation so they can judge (record worker consensus for each)
        // First give each judge a worker win so canJudge returns true
        agentAdapter.emergencySetTaskManager(address(this));
        agentAdapter.recordWorkerConsensus(judge1);
        agentAdapter.recordWorkerConsensus(judge2);
        agentAdapter.recordWorkerConsensus(judge3);
        agentAdapter.emergencySetTaskManager(address(taskManager));

        // Deploy mock token
        mockToken = new MockERC20();
    }

    /*//////////////////////////////////////////////////////////////
                          HELPERS
    //////////////////////////////////////////////////////////////*/

    function _registerAgent(address agent, string memory uri) internal {
        vm.prank(agent);
        agentAdapter.register(uri);
    }

    function _createDefaultTask() internal returns (uint256 taskId) {
        vm.prank(creator);
        taskId = taskManager.createTask{ value: BOUNTY }(
            "spec-cid",
            BOUNTY,
            address(0), // ETH
            3, // N workers
            3, // M judges
            block.timestamp + WORK_DURATION,
            block.timestamp + WORK_DURATION + JUDGE_DURATION
        );
    }

    function _submitAllWork(uint256 taskId) internal {
        vm.prank(worker1);
        taskManager.submitWork(taskId, "submission-cid-1");
        vm.prank(worker2);
        taskManager.submitWork(taskId, "submission-cid-2");
        vm.prank(worker3);
        taskManager.submitWork(taskId, "submission-cid-3");
    }

    function _unanimousJudgments(uint256 taskId) internal {
        uint8[] memory ranking = new uint8[](3);
        ranking[0] = 0;
        ranking[1] = 1;
        ranking[2] = 2;

        vm.prank(judge1);
        taskManager.submitJudgment(taskId, ranking);
        vm.prank(judge2);
        taskManager.submitJudgment(taskId, ranking);
        vm.prank(judge3);
        taskManager.submitJudgment(taskId, ranking);
    }

    /*//////////////////////////////////////////////////////////////
                        CREATE TASK TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CreateTask() public {
        uint256 taskId = _createDefaultTask();

        assertEq(taskId, 1);
        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(task.creator, creator);
        assertEq(task.bounty, BOUNTY);
        assertEq(task.bountyToken, address(0));
        assertEq(task.requiredWorkers, 3);
        assertEq(task.requiredJudges, 3);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.Open));
        assertEq(task.submissionCount, 0);
        assertEq(task.judgmentCount, 0);
    }

    function test_CreateTask_IncrementingIds() public {
        uint256 id1 = _createDefaultTask();
        uint256 id2 = _createDefaultTask();
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_CreateTask_RevertIfNotRegistered() public {
        address unregistered = address(0x9999);
        vm.deal(unregistered, 10 ether);

        vm.prank(unregistered);
        vm.expectRevert(TaskManagerV2.NotRegistered.selector);
        taskManager.createTask{ value: BOUNTY }(
            "spec", BOUNTY, address(0), 3, 3,
            block.timestamp + WORK_DURATION,
            block.timestamp + WORK_DURATION + JUDGE_DURATION
        );
    }

    function test_CreateTask_RevertIfBountyTooLow() public {
        vm.prank(creator);
        vm.expectRevert(TaskManagerV2.InsufficientBounty.selector);
        taskManager.createTask{ value: 0.001 ether }(
            "spec", 0.001 ether, address(0), 3, 3,
            block.timestamp + WORK_DURATION,
            block.timestamp + WORK_DURATION + JUDGE_DURATION
        );
    }

    function test_CreateTask_RevertIfInvalidWorkerCount() public {
        vm.prank(creator);
        vm.expectRevert(TaskManagerV2.InvalidWorkerCount.selector);
        taskManager.createTask{ value: BOUNTY }(
            "spec", BOUNTY, address(0), 1, 3, // N=1 too low
            block.timestamp + WORK_DURATION,
            block.timestamp + WORK_DURATION + JUDGE_DURATION
        );
    }

    function test_CreateTask_RevertIfInvalidJudgeCount() public {
        vm.prank(creator);
        vm.expectRevert(TaskManagerV2.InvalidJudgeCount.selector);
        taskManager.createTask{ value: BOUNTY }(
            "spec", BOUNTY, address(0), 3, 1, // M=1 too low
            block.timestamp + WORK_DURATION,
            block.timestamp + WORK_DURATION + JUDGE_DURATION
        );
    }

    function test_CreateTask_RevertIfInvalidDeadlines() public {
        vm.prank(creator);
        vm.expectRevert(TaskManagerV2.InvalidDeadlines.selector);
        taskManager.createTask{ value: BOUNTY }(
            "spec", BOUNTY, address(0), 3, 3,
            block.timestamp - 1, // work deadline in past
            block.timestamp + JUDGE_DURATION
        );
    }

    /*//////////////////////////////////////////////////////////////
                       SUBMIT WORK TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SubmitWork() public {
        uint256 taskId = _createDefaultTask();

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-cid-1");

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(task.submissionCount, 1);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.WorkPhase));

        TaskManagerV2.Submission memory sub = taskManager.getSubmission(taskId, 0);
        assertEq(sub.worker, worker1);
    }

    function test_SubmitWork_TransitionsToJudgePhaseOnNth() public {
        uint256 taskId = _createDefaultTask();

        _submitAllWork(taskId);

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(task.submissionCount, 3);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.JudgePhase));
    }

    function test_SubmitWork_RevertIfDuplicate() public {
        uint256 taskId = _createDefaultTask();

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");

        vm.prank(worker1);
        vm.expectRevert(TaskManagerV2.AlreadySubmitted.selector);
        taskManager.submitWork(taskId, "sub-1-updated");
    }

    function test_SubmitWork_RevertIfDeadlinePassed() public {
        uint256 taskId = _createDefaultTask();

        vm.warp(block.timestamp + WORK_DURATION + 1);

        vm.prank(worker1);
        vm.expectRevert(TaskManagerV2.WorkDeadlinePassed.selector);
        taskManager.submitWork(taskId, "sub-1");
    }

    function test_SubmitWork_RevertIfSlotsFull() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        address worker4 = address(0x2004);
        vm.deal(worker4, 10 ether);
        _registerAgent(worker4, "worker4-uri");

        vm.prank(worker4);
        vm.expectRevert(TaskManagerV2.InvalidPhase.selector);
        taskManager.submitWork(taskId, "sub-4");
    }

    /*//////////////////////////////////////////////////////////////
                      SUBMIT JUDGMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SubmitJudgment() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        uint8[] memory ranking = new uint8[](3);
        ranking[0] = 0;
        ranking[1] = 1;
        ranking[2] = 2;

        vm.prank(judge1);
        taskManager.submitJudgment(taskId, ranking);

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(task.judgmentCount, 1);
    }

    function test_SubmitJudgment_RevertIfJudgeIsWorker() public {
        uint256 taskId = _createDefaultTask();

        // Give worker1 reputation so canJudge passes
        agentAdapter.emergencySetTaskManager(address(this));
        agentAdapter.recordWorkerConsensus(worker1);
        agentAdapter.emergencySetTaskManager(address(taskManager));

        _submitAllWork(taskId);

        uint8[] memory ranking = new uint8[](3);
        ranking[0] = 0;
        ranking[1] = 1;
        ranking[2] = 2;

        vm.prank(worker1);
        vm.expectRevert(TaskManagerV2.JudgeIsWorker.selector);
        taskManager.submitJudgment(taskId, ranking);
    }

    function test_SubmitJudgment_RevertIfNotJudgePhase() public {
        uint256 taskId = _createDefaultTask();
        // Still in Open phase

        uint8[] memory ranking = new uint8[](3);
        ranking[0] = 0;
        ranking[1] = 1;
        ranking[2] = 2;

        vm.prank(judge1);
        vm.expectRevert(TaskManagerV2.InvalidPhase.selector);
        taskManager.submitJudgment(taskId, ranking);
    }

    function test_SubmitJudgment_RevertIfInvalidPermutation() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        uint8[] memory ranking = new uint8[](3);
        ranking[0] = 0;
        ranking[1] = 0; // duplicate!
        ranking[2] = 2;

        vm.prank(judge1);
        vm.expectRevert(TaskManagerV2.InvalidPermutation.selector);
        taskManager.submitJudgment(taskId, ranking);
    }

    function test_SubmitJudgment_RevertIfInvalidRankingLength() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        uint8[] memory ranking = new uint8[](2); // wrong length
        ranking[0] = 0;
        ranking[1] = 1;

        vm.prank(judge1);
        vm.expectRevert(TaskManagerV2.InvalidRankingLength.selector);
        taskManager.submitJudgment(taskId, ranking);
    }

    function test_SubmitJudgment_RevertIfCannotJudge() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        // Register a new agent with no reputation
        address newbie = address(0x4001);
        vm.deal(newbie, 10 ether);
        _registerAgent(newbie, "newbie-uri");

        uint8[] memory ranking = new uint8[](3);
        ranking[0] = 0;
        ranking[1] = 1;
        ranking[2] = 2;

        vm.prank(newbie);
        vm.expectRevert(TaskManagerV2.CannotJudge.selector);
        taskManager.submitJudgment(taskId, ranking);
    }

    /*//////////////////////////////////////////////////////////////
                    FULL LIFECYCLE: RESOLVE
    //////////////////////////////////////////////////////////////*/

    function test_FullLifecycle_Resolve() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        uint256 worker1BalBefore = worker1.balance;
        uint256 worker2BalBefore = worker2.balance;
        uint256 treasuryBalBefore = treasury.balance;

        // All judges agree: [0, 1, 2]
        _unanimousJudgments(taskId);

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.Resolved));

        // Protocol fee = 3% of 1 ether = 0 (escrow fee is 0 in setUp)
        // TaskManagerV2 fee = 300 bps of 1 ether = 0.03 ether
        uint256 protocolFee = (BOUNTY * 300) / 10_000;
        uint256 remaining = BOUNTY - protocolFee;
        uint256 workerPool = (remaining * 9000) / 10_000;
        // K = ceil(3/2) = 2
        uint256 perWorker = workerPool / 2;
        uint256 workerRemainder = workerPool - (perWorker * 2);

        // Worker 1 (top ranked) gets perWorker + remainder
        assertEq(worker1.balance, worker1BalBefore + perWorker + workerRemainder);
        // Worker 2 (second) gets perWorker
        assertEq(worker2.balance, worker2BalBefore + perWorker);
        // Treasury gets protocol fee
        assertEq(treasury.balance, treasuryBalBefore + protocolFee);
    }

    function test_FullLifecycle_JudgePayouts() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        uint256 judge1BalBefore = judge1.balance;
        uint256 judge2BalBefore = judge2.balance;
        uint256 judge3BalBefore = judge3.balance;

        _unanimousJudgments(taskId);

        // All 3 judges are in consensus
        uint256 protocolFee = (BOUNTY * 300) / 10_000;
        uint256 remaining = BOUNTY - protocolFee;
        uint256 workerPool = (remaining * 9000) / 10_000;
        uint256 judgePool = remaining - workerPool;
        uint256 perJudge = judgePool / 3;
        uint256 judgeRemainder = judgePool - (perJudge * 3);

        // Judge 1 gets perJudge + remainder (first consensus judge)
        assertEq(judge1.balance, judge1BalBefore + perJudge + judgeRemainder);
        assertEq(judge2.balance, judge2BalBefore + perJudge);
        assertEq(judge3.balance, judge3BalBefore + perJudge);
    }

    /*//////////////////////////////////////////////////////////////
                    OUTLIER JUDGE
    //////////////////////////////////////////////////////////////*/

    function test_OutlierJudge_NoPayment() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        uint8[] memory ranking = new uint8[](3);

        // Judge 1 and 2 agree: [0, 1, 2]
        ranking[0] = 0;
        ranking[1] = 1;
        ranking[2] = 2;
        vm.prank(judge1);
        taskManager.submitJudgment(taskId, ranking);
        vm.prank(judge2);
        taskManager.submitJudgment(taskId, ranking);

        uint256 judge3BalBefore = judge3.balance;

        // Judge 3 fully disagrees: [2, 1, 0]
        uint8[] memory outlierRanking = new uint8[](3);
        outlierRanking[0] = 2;
        outlierRanking[1] = 1;
        outlierRanking[2] = 0;
        vm.prank(judge3);
        taskManager.submitJudgment(taskId, outlierRanking);

        // Borda scores: sub0 = 0+0+2=2, sub1 = 1+1+1=3, sub2 = 2+2+0=4
        // Aggregate: [0, 1, 2]
        // Judge3's distance from [0,1,2]: ranking [2,1,0] => 3 disagreements
        // Threshold for N=3: floor(3*2/6) = 1
        // Distance 3 > threshold 1, so judge3 is outlier

        // Judge3 should NOT have received payment
        // (The exact balance depends on whether 2 or 3 consensus judges share the pool)
        // With 2 consensus judges, each gets judgePool/2

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.Resolved));

        // Judge3 balance should be unchanged (no payout)
        assertEq(judge3.balance, judge3BalBefore);
    }

    /*//////////////////////////////////////////////////////////////
                    TIMEOUT SCENARIOS
    //////////////////////////////////////////////////////////////*/

    function test_WorkTimeout_InsufficientWorkers_Fail() public {
        uint256 taskId = _createDefaultTask();

        // Only 1 worker submits (need ceil(3/2) = 2)
        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");

        // Warp past work deadline
        vm.warp(block.timestamp + WORK_DURATION + 1);

        uint256 creatorBalBefore = creator.balance;

        taskManager.resolve(taskId);

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.Failed));

        // Creator should get refund
        assertEq(creator.balance, creatorBalBefore + BOUNTY);
    }

    function test_WorkTimeout_EnoughWorkers_AdvanceToJudge() public {
        uint256 taskId = _createDefaultTask();

        // 2 workers submit (= ceil(3/2))
        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");
        vm.prank(worker2);
        taskManager.submitWork(taskId, "sub-2");

        // Warp past work deadline
        vm.warp(block.timestamp + WORK_DURATION + 1);

        taskManager.resolve(taskId);

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.JudgePhase));
    }

    function test_JudgeTimeout_InsufficientJudges_Fail() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        // Only 1 judge submits (need ceil(3/2) = 2)
        uint8[] memory ranking = new uint8[](3);
        ranking[0] = 0;
        ranking[1] = 1;
        ranking[2] = 2;
        vm.prank(judge1);
        taskManager.submitJudgment(taskId, ranking);

        // Warp past judge deadline
        vm.warp(block.timestamp + WORK_DURATION + JUDGE_DURATION + 1);

        uint256 creatorBalBefore = creator.balance;

        taskManager.resolve(taskId);

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.Failed));
        assertEq(creator.balance, creatorBalBefore + BOUNTY);
    }

    function test_Resolve_RevertIfDeadlineNotPassed() public {
        uint256 taskId = _createDefaultTask();

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");

        // Try to resolve before deadline
        vm.expectRevert(TaskManagerV2.WorkDeadlineNotPassed.selector);
        taskManager.resolve(taskId);
    }

    /*//////////////////////////////////////////////////////////////
                    PARTIAL COMPLETION (TIMEOUT RESOLVE)
    //////////////////////////////////////////////////////////////*/

    function test_PartialCompletion_TwoOfThreeWorkers() public {
        uint256 taskId = _createDefaultTask();

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");
        vm.prank(worker2);
        taskManager.submitWork(taskId, "sub-2");

        // Warp past work deadline to advance to JudgePhase
        vm.warp(block.timestamp + WORK_DURATION + 1);
        taskManager.resolve(taskId);

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.JudgePhase));
        assertEq(task.submissionCount, 2);

        // Judges rank the 2 submissions
        uint8[] memory ranking = new uint8[](2);
        ranking[0] = 0;
        ranking[1] = 1;

        vm.prank(judge1);
        taskManager.submitJudgment(taskId, ranking);
        vm.prank(judge2);
        taskManager.submitJudgment(taskId, ranking);
        vm.prank(judge3);
        taskManager.submitJudgment(taskId, ranking);

        task = taskManager.getTask(taskId);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.Resolved));
    }

    /*//////////////////////////////////////////////////////////////
                        ERC20 BOUNTY
    //////////////////////////////////////////////////////////////*/

    function test_CreateTask_ERC20Bounty() public {
        uint256 amount = 100 ether;
        mockToken.mint(creator, amount);
        vm.prank(creator);
        mockToken.approve(address(escrowVault), amount);

        vm.prank(creator);
        uint256 taskId = taskManager.createTask(
            "spec-cid",
            amount,
            address(mockToken),
            3, 3,
            block.timestamp + WORK_DURATION,
            block.timestamp + WORK_DURATION + JUDGE_DURATION
        );

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(task.bountyToken, address(mockToken));
        assertEq(task.bounty, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        CANCEL TASK
    //////////////////////////////////////////////////////////////*/

    function test_CancelTask() public {
        uint256 taskId = _createDefaultTask();

        uint256 creatorBalBefore = creator.balance;

        vm.prank(creator);
        taskManager.cancelTask(taskId);

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.Cancelled));
        assertEq(creator.balance, creatorBalBefore + BOUNTY);
    }

    function test_CancelTask_RevertIfNotCreator() public {
        uint256 taskId = _createDefaultTask();

        vm.prank(worker1);
        vm.expectRevert(TaskManagerV2.OnlyCreator.selector);
        taskManager.cancelTask(taskId);
    }

    function test_CancelTask_RevertIfSubmissionsExist() public {
        uint256 taskId = _createDefaultTask();

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");

        // First submission transitions to WorkPhase, so cancelTask hits
        // the phase check before the submission count check
        vm.prank(creator);
        vm.expectRevert(TaskManagerV2.InvalidPhase.selector);
        taskManager.cancelTask(taskId);
    }

    function test_CancelTask_RevertIfNotOpen() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        vm.prank(creator);
        vm.expectRevert(TaskManagerV2.InvalidPhase.selector);
        taskManager.cancelTask(taskId);
    }

    /*//////////////////////////////////////////////////////////////
                    EMERGENCY REFUND
    //////////////////////////////////////////////////////////////*/

    function test_EmergencyRefund() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);

        uint256 creatorBalBefore = creator.balance;

        vm.prank(emergencyAdmin);
        taskManager.emergencyRefund(taskId);

        TaskManagerV2.Task memory task = taskManager.getTask(taskId);
        assertEq(uint8(task.phase), uint8(TaskManagerV2.TaskPhase.Failed));
        assertEq(creator.balance, creatorBalBefore + BOUNTY);
    }

    function test_EmergencyRefund_RevertIfNotAdmin() public {
        uint256 taskId = _createDefaultTask();

        vm.prank(worker1);
        vm.expectRevert("Only emergency admin");
        taskManager.emergencyRefund(taskId);
    }

    function test_EmergencyRefund_RevertIfAlreadyResolved() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);
        _unanimousJudgments(taskId);

        vm.prank(emergencyAdmin);
        vm.expectRevert(TaskManagerV2.InvalidPhase.selector);
        taskManager.emergencyRefund(taskId);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_GetSubmissionCount() public {
        uint256 taskId = _createDefaultTask();
        assertEq(taskManager.getSubmissionCount(taskId), 0);

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");
        assertEq(taskManager.getSubmissionCount(taskId), 1);
    }

    function test_GetJudgmentCount() public {
        uint256 taskId = _createDefaultTask();
        _submitAllWork(taskId);
        assertEq(taskManager.getJudgmentCount(taskId), 0);

        uint8[] memory ranking = new uint8[](3);
        ranking[0] = 0;
        ranking[1] = 1;
        ranking[2] = 2;

        vm.prank(judge1);
        taskManager.submitJudgment(taskId, ranking);
        assertEq(taskManager.getJudgmentCount(taskId), 1);
    }

    function test_GetTask_RevertIfNotFound() public {
        vm.expectRevert(TaskManagerV2.TaskNotFound.selector);
        taskManager.getTask(999);
    }
}
