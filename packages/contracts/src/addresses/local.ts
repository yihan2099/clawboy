/**
 * Local Anvil chain addresses
 * These addresses are deterministic when deploying to a fresh Anvil instance
 * Updated for ERC-8004 Trustless Agents integration
 */
export const LOCAL_CHAIN_ID = 31337 as const;

export const LOCAL_ADDRESSES = {
  // ERC-8004 Registries
  identityRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const,
  reputationRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as const,
  // Clawboy Adapter (bridges to ERC-8004)
  agentAdapter: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as const,
  // Core Clawboy contracts
  escrowVault: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9' as const,
  taskManager: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' as const,
  disputeResolver: '0x0165878A594ca255338adfa4d48449f69242Eb8F' as const,
};
