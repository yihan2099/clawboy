// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { TaskManagerV2 } from "../src/TaskManagerV2.sol";
import { EscrowVault } from "../src/EscrowVault.sol";
import { PactAgentAdapter } from "../src/PactAgentAdapter.sol";
import { ERC8004IdentityRegistry } from "../src/erc8004/ERC8004IdentityRegistry.sol";
import { ERC8004ReputationRegistry } from "../src/erc8004/ERC8004ReputationRegistry.sol";
import { ERC8183Adapter } from "../src/ERC8183Adapter.sol";
import { IERC8183 } from "../src/interfaces/IERC8183.sol";

contract ERC8183AdapterTest is Test {
    TaskManagerV2 public taskManager;
    EscrowVault public escrowVault;
    PactAgentAdapter public agentAdapter;
    ERC8004IdentityRegistry public identityRegistry;
    ERC8004ReputationRegistry public reputationRegistry;
    ERC8183Adapter public adapter;

    address public treasury = address(0xAAA);
    address public emergencyAdmin = address(0xEEE);

    address public creator = address(0x1001);
    address public worker1 = address(0x2001);
    address public worker2 = address(0x2002);
    address public worker3 = address(0x2003);
    address public judge1 = address(0x3001);
    address public judge2 = address(0x3002);
    address public judge3 = address(0x3003);

    uint256 public constant BOUNTY = 1 ether;

    function setUp() public {
        address deployer = address(this);

        identityRegistry = new ERC8004IdentityRegistry();
        reputationRegistry = new ERC8004ReputationRegistry(address(identityRegistry));
        agentAdapter = new PactAgentAdapter(address(identityRegistry), address(reputationRegistry));

        uint64 currentNonce = vm.getNonce(deployer);
        address predictedTaskManager = vm.computeCreateAddress(deployer, currentNonce + 1);
        escrowVault = new EscrowVault(predictedTaskManager, treasury, 0);
        taskManager = new TaskManagerV2(
            address(escrowVault), address(agentAdapter), treasury, emergencyAdmin
        );
        require(address(taskManager) == predictedTaskManager, "Address mismatch");

        identityRegistry.authorizeAdapter(address(agentAdapter));
        agentAdapter.emergencySetTaskManager(address(taskManager));

        // Deploy ERC-8183 adapter
        adapter = new ERC8183Adapter(address(taskManager));

        // Fund and register agents
        vm.deal(creator, 100 ether);
        _registerAgent(creator, "creator-uri");
        _registerAgent(worker1, "worker1-uri");
        _registerAgent(worker2, "worker2-uri");
        _registerAgent(worker3, "worker3-uri");
        _registerAgent(judge1, "judge1-uri");
        _registerAgent(judge2, "judge2-uri");
        _registerAgent(judge3, "judge3-uri");

        // Give judges reputation
        agentAdapter.emergencySetTaskManager(address(this));
        agentAdapter.recordWorkerConsensus(judge1);
        agentAdapter.recordWorkerConsensus(judge2);
        agentAdapter.recordWorkerConsensus(judge3);
        agentAdapter.emergencySetTaskManager(address(taskManager));
    }

    function _registerAgent(address agent, string memory uri) internal {
        vm.prank(agent);
        agentAdapter.register(uri);
    }

    function _createTask() internal returns (uint256) {
        vm.prank(creator);
        return taskManager.createTask{ value: BOUNTY }(
            "spec-cid", BOUNTY, address(0), 3, 3,
            block.timestamp + 1 days, block.timestamp + 3 days
        );
    }

    // ============ Tests ============

    function test_OpenStatus() public {
        uint256 taskId = _createTask();

        IERC8183.Job memory job = adapter.getJob(taskId);
        assertEq(uint8(job.status), uint8(IERC8183.JobStatus.Open));
        assertEq(job.client, creator);
        assertEq(job.provider, address(0)); // no workers yet
        assertEq(job.evaluator, address(adapter)); // consensus mechanism
        assertEq(job.budget, BOUNTY);
        assertEq(job.expiredAt, block.timestamp + 3 days);
        assertEq(job.description, "spec-cid");
        assertEq(job.hook, address(0));
        assertEq(job.id, taskId);
    }

    function test_FundedStatus_AfterFirstSubmission() public {
        uint256 taskId = _createTask();

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");

        assertEq(uint8(adapter.getJobStatus(taskId)), uint8(IERC8183.JobStatus.Funded));
        assertEq(adapter.getProvider(taskId), worker1);
        assertEq(adapter.getProviderCount(taskId), 1);
    }

    function test_SubmittedStatus_AfterAllWork() public {
        uint256 taskId = _createTask();

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");
        vm.prank(worker2);
        taskManager.submitWork(taskId, "sub-2");
        vm.prank(worker3);
        taskManager.submitWork(taskId, "sub-3");

        assertEq(uint8(adapter.getJobStatus(taskId)), uint8(IERC8183.JobStatus.Submitted));
        assertEq(adapter.getProviderCount(taskId), 3);
        assertTrue(adapter.isMultiProvider(taskId));
    }

    function test_CompletedStatus_AfterResolution() public {
        uint256 taskId = _createTask();

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");
        vm.prank(worker2);
        taskManager.submitWork(taskId, "sub-2");
        vm.prank(worker3);
        taskManager.submitWork(taskId, "sub-3");

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

        assertEq(uint8(adapter.getJobStatus(taskId)), uint8(IERC8183.JobStatus.Completed));
    }

    function test_RejectedStatus_AfterCancellation() public {
        uint256 taskId = _createTask();

        vm.prank(creator);
        taskManager.cancelTask(taskId);

        assertEq(uint8(adapter.getJobStatus(taskId)), uint8(IERC8183.JobStatus.Rejected));
    }

    function test_ExpiredStatus_AfterFailure() public {
        uint256 taskId = _createTask();

        // Submit only 1 worker (need 3), then timeout
        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");

        // Advance past work deadline
        vm.warp(block.timestamp + 1 days + 1);

        // Trigger timeout resolution — insufficient workers → Failed
        taskManager.resolve(taskId);

        assertEq(uint8(adapter.getJobStatus(taskId)), uint8(IERC8183.JobStatus.Expired));
    }

    function test_GetClient() public {
        uint256 taskId = _createTask();
        assertEq(adapter.getClient(taskId), creator);
    }

    function test_GetEvaluator() public {
        uint256 taskId = _createTask();
        assertEq(adapter.getEvaluator(taskId), address(adapter));
    }

    function test_GetEvaluatorCount() public {
        uint256 taskId = _createTask();

        vm.prank(worker1);
        taskManager.submitWork(taskId, "sub-1");
        vm.prank(worker2);
        taskManager.submitWork(taskId, "sub-2");
        vm.prank(worker3);
        taskManager.submitWork(taskId, "sub-3");

        uint8[] memory ranking = new uint8[](3);
        ranking[0] = 0;
        ranking[1] = 1;
        ranking[2] = 2;

        vm.prank(judge1);
        taskManager.submitJudgment(taskId, ranking);

        assertEq(adapter.getEvaluatorCount(taskId), 1);
    }
}
