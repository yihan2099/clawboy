/**
 * Contract addresses on Base mainnet
 * Updated for ERC-8004 Trustless Agents integration
 * TODO: Deploy contracts to Base mainnet
 */
export const BASE_MAINNET_ADDRESSES = {
  // ERC-8004 Registries
  identityRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  reputationRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  // Clawboy Adapter (bridges to ERC-8004)
  agentAdapter: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  // Core Clawboy contracts
  escrowVault: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  taskManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  disputeResolver: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const;

export const BASE_MAINNET_CHAIN_ID = 8453;
