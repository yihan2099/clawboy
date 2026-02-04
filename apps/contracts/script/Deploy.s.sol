// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { TaskManager } from "../src/TaskManager.sol";
import { EscrowVault } from "../src/EscrowVault.sol";
import { DisputeResolver } from "../src/DisputeResolver.sol";
import { ClawboyAgentAdapter } from "../src/ClawboyAgentAdapter.sol";
import { ERC8004IdentityRegistry } from "../src/erc8004/ERC8004IdentityRegistry.sol";
import { ERC8004ReputationRegistry } from "../src/erc8004/ERC8004ReputationRegistry.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ERC-8004 IdentityRegistry first (no dependencies)
        ERC8004IdentityRegistry identityRegistry = new ERC8004IdentityRegistry();
        console.log("ERC8004IdentityRegistry deployed at:", address(identityRegistry));

        // 2. Deploy ERC-8004 ReputationRegistry
        ERC8004ReputationRegistry reputationRegistry = new ERC8004ReputationRegistry();
        console.log("ERC8004ReputationRegistry deployed at:", address(reputationRegistry));

        // 3. Initialize ReputationRegistry with IdentityRegistry
        reputationRegistry.initialize(address(identityRegistry));
        console.log("ReputationRegistry initialized with IdentityRegistry");

        // 4. Deploy ClawboyAgentAdapter
        ClawboyAgentAdapter agentAdapter =
            new ClawboyAgentAdapter(address(identityRegistry), address(reputationRegistry));
        console.log("ClawboyAgentAdapter deployed at:", address(agentAdapter));

        // 5. Predict TaskManager address using CREATE (nonce-based)
        address deployer = vm.addr(deployerPrivateKey);
        uint64 currentNonce = vm.getNonce(deployer);

        // TaskManager will be deployed at nonce+1 (after EscrowVault at nonce+0)
        address predictedTaskManager = vm.computeCreateAddress(deployer, currentNonce + 1);
        console.log("Predicted TaskManager address:", predictedTaskManager);

        // 6. Deploy EscrowVault with predicted TaskManager address
        EscrowVault escrowVault = new EscrowVault(predictedTaskManager);
        console.log("EscrowVault deployed at:", address(escrowVault));

        // 7. Deploy TaskManager (will be at predicted address)
        TaskManager taskManager = new TaskManager(address(escrowVault), address(agentAdapter));
        console.log("TaskManager deployed at:", address(taskManager));

        // Verify prediction was correct
        require(address(taskManager) == predictedTaskManager, "TaskManager address mismatch!");

        // 8. Deploy DisputeResolver
        DisputeResolver disputeResolver =
            new DisputeResolver(address(taskManager), address(agentAdapter));
        console.log("DisputeResolver deployed at:", address(disputeResolver));

        // 9. Configure access control
        taskManager.setDisputeResolver(address(disputeResolver));
        agentAdapter.setTaskManager(address(taskManager));
        agentAdapter.setDisputeResolver(address(disputeResolver));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("ERC8004IdentityRegistry:", address(identityRegistry));
        console.log("ERC8004ReputationRegistry:", address(reputationRegistry));
        console.log("ClawboyAgentAdapter:", address(agentAdapter));
        console.log("EscrowVault:", address(escrowVault));
        console.log("TaskManager:", address(taskManager));
        console.log("DisputeResolver:", address(disputeResolver));
    }
}
