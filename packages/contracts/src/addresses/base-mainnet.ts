/**
 * Contract addresses on Base mainnet
 * Updated for ERC-8004 Trustless Agents integration
 * TODO: Deploy contracts to Base mainnet and replace zero addresses below.
 *
 * ENVIRONMENT WARNING: All addresses are 0x000...000 (placeholder) because the contracts
 * have not been deployed to Base mainnet yet. Any code path that uses these addresses
 * with chainId=8453 will interact with the zero address, which will silently fail or
 * revert on-chain. Do NOT use these addresses in production until mainnet deployment.
 */
export const BASE_MAINNET_ADDRESSES = {
  // ERC-8004 Registries
  identityRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  reputationRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  // Pact Adapter (bridges to ERC-8004)
  agentAdapter: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  // Core Pact contracts
  escrowVault: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  taskManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  disputeResolver: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const;

export const BASE_MAINNET_CHAIN_ID = 8453;
