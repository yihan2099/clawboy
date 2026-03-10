/**
 * Local Anvil chain addresses
 * These addresses are deterministic when deploying to a fresh Anvil instance
 * V2: TaskManagerV2 replaces TaskManager, no DisputeResolver
 * TODO: Update addresses after running DeployV2.s.sol on Anvil
 */
export const LOCAL_CHAIN_ID = 31337 as const;

export const LOCAL_ADDRESSES = {
  // ERC-8004 Registries
  identityRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const,
  reputationRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as const,
  // Pact Adapter (bridges to ERC-8004)
  agentAdapter: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as const,
  // Core Pact contracts (V2)
  escrowVault: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as const,
  taskManager: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9' as const,
};
