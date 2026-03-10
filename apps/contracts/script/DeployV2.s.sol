// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { TaskManagerV2 } from "../src/TaskManagerV2.sol";
import { EscrowVault } from "../src/EscrowVault.sol";
import { PactAgentAdapter } from "../src/PactAgentAdapter.sol";
import { ERC8004IdentityRegistry } from "../src/erc8004/ERC8004IdentityRegistry.sol";
import { ERC8004ReputationRegistry } from "../src/erc8004/ERC8004ReputationRegistry.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";

contract DeployV2Script is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ERC-8004 IdentityRegistry (no dependencies)
        ERC8004IdentityRegistry identityRegistry = new ERC8004IdentityRegistry();
        console.log("ERC8004IdentityRegistry deployed at:", address(identityRegistry));

        // 2. Deploy ERC-8004 ReputationRegistry
        ERC8004ReputationRegistry reputationRegistry =
            new ERC8004ReputationRegistry(address(identityRegistry));
        console.log("ERC8004ReputationRegistry deployed at:", address(reputationRegistry));

        // 3. Deploy PactAgentAdapter
        PactAgentAdapter agentAdapter =
            new PactAgentAdapter(address(identityRegistry), address(reputationRegistry));
        console.log("PactAgentAdapter deployed at:", address(agentAdapter));

        // 4. Predict TaskManagerV2 address using CREATE (nonce-based)
        uint64 currentNonce = vm.getNonce(deployer);
        // TaskManagerV2 will be deployed at nonce+1 (after EscrowVault at nonce+0)
        address predictedTaskManager = vm.computeCreateAddress(deployer, currentNonce + 1);
        console.log("Predicted TaskManagerV2 address:", predictedTaskManager);

        // 5. Deploy EscrowVault with predicted TaskManagerV2 address
        EscrowVault escrowVault = new EscrowVault(predictedTaskManager, deployer, 300);
        console.log("EscrowVault deployed at:", address(escrowVault));

        // 6. Deploy TaskManagerV2
        TaskManagerV2 taskManager = new TaskManagerV2(
            address(escrowVault),
            address(agentAdapter),
            deployer, // protocolTreasury (initially deployer, update via timelock later)
            deployer  // emergencyAdmin (initially deployer)
        );
        console.log("TaskManagerV2 deployed at:", address(taskManager));

        // Verify prediction was correct
        require(address(taskManager) == predictedTaskManager, "TaskManagerV2 address mismatch!");

        // 7. Deploy TimelockController (48 hours = 172800 seconds)
        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = deployer;

        TimelockController timelock = new TimelockController(
            48 hours,
            proposers,
            executors,
            deployer // admin
        );
        console.log("TimelockController deployed at:", address(timelock));

        // 8. Configure timelock on contracts
        agentAdapter.setTimelock(address(timelock));
        escrowVault.setTimelock(address(timelock));
        console.log("Timelock configured on AgentAdapter and EscrowVault");

        // 9. Transfer TaskManagerV2 ownership to TimelockController
        taskManager.transferOwnership(address(timelock));
        console.log("TaskManagerV2 ownership transfer initiated to TimelockController");

        // 10. Configure access control
        agentAdapter.emergencySetTaskManager(address(taskManager));
        console.log("TaskManager address set on AgentAdapter");

        // 11. Authorize PactAgentAdapter to call registerFor on IdentityRegistry
        identityRegistry.authorizeAdapter(address(agentAdapter));
        console.log("PactAgentAdapter authorized for IdentityRegistry");

        vm.stopBroadcast();

        console.log("");
        console.log("=== V2 Deployment Complete ===");
        console.log("ERC8004IdentityRegistry:", address(identityRegistry));
        console.log("ERC8004ReputationRegistry:", address(reputationRegistry));
        console.log("PactAgentAdapter:", address(agentAdapter));
        console.log("EscrowVault:", address(escrowVault));
        console.log("TaskManagerV2:", address(taskManager));
        console.log("TimelockController:", address(timelock));
        console.log("");
        console.log("NOTE: Accept TaskManagerV2 ownership via TimelockController");
        console.log("NOTE: No DisputeResolver in V2 - consensus replaces disputes");
    }
}
