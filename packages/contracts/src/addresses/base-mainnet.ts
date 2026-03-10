/**
 * Contract addresses on Base mainnet
 * V2: TaskManagerV2 replaces TaskManager, no DisputeResolver
 * TODO: Deploy V2 contracts to Base mainnet and replace zero addresses below.
 */
export const BASE_MAINNET_ADDRESSES = {
  // ERC-8004 Registries
  identityRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  reputationRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  // Pact Adapter (bridges to ERC-8004)
  agentAdapter: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  // Core Pact contracts (V2)
  escrowVault: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  taskManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const;

export const BASE_MAINNET_CHAIN_ID = 8453;
