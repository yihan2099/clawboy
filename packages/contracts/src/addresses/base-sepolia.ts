/**
 * Contract addresses on Base Sepolia testnet
 * V2: TaskManagerV2 with N+M consensus (Borda Count + Kendall Tau)
 * Deployed: 2026-03-10
 */
export const BASE_SEPOLIA_ADDRESSES = {
  // ERC-8004 Registries
  identityRegistry: '0xb8994a7650b4888986fc5CEa9Ad8e3922c79f53F' as `0x${string}`,
  reputationRegistry: '0x81508d64d63d2d0005420031eC29FCd2dC4998a9' as `0x${string}`,
  // Pact Adapter (bridges to ERC-8004)
  agentAdapter: '0x283Ae905768782FAFB3deB3dc1AF0F5B1C1E2E6B' as `0x${string}`,
  // Core Pact contracts (V2)
  escrowVault: '0x9Ccc9D800A886cA6767696959383bd2a85d1F8d9' as `0x${string}`,
  taskManager: '0x08eAEaf9adbeccc0d6eC9Ec125F2fe1078D3Ac4e' as `0x${string}`,
  // ERC-8183 Compatibility Layer
  erc8183Adapter: '0xEb267894efdBAFec97571Df11BB16d9289B14F69' as `0x${string}`,
} as const;

export const BASE_SEPOLIA_CHAIN_ID = 84532;
