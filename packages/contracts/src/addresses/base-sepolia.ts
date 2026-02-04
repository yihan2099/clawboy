/**
 * Contract addresses on Base Sepolia testnet
 * Updated for ERC-8004 Trustless Agents integration
 * TODO: Redeploy contracts to Base Sepolia with new ERC-8004 system
 */
export const BASE_SEPOLIA_ADDRESSES = {
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

export const BASE_SEPOLIA_CHAIN_ID = 84532;
