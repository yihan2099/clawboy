// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { ERC8183Adapter } from "../src/ERC8183Adapter.sol";

/**
 * @notice Deploy the ERC-8183 adapter pointing at an existing TaskManagerV2.
 *
 * Usage:
 *   forge script script/DeployERC8183Adapter.s.sol \
 *     --rpc-url $BASE_SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --verify
 */
contract DeployERC8183AdapterScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address taskManager = vm.envAddress("TASK_MANAGER_ADDRESS");

        console.log("Deploying ERC8183Adapter with TaskManagerV2:", taskManager);

        vm.startBroadcast(deployerPrivateKey);

        ERC8183Adapter adapter = new ERC8183Adapter(taskManager);
        console.log("ERC8183Adapter deployed at:", address(adapter));

        vm.stopBroadcast();
    }
}
