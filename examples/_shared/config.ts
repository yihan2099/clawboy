/**
 * Shared configuration for Pact examples
 */

/** Supported chain IDs: 31337 (Anvil local), 84532 (Base Sepolia), 8453 (Base Mainnet) */
const SUPPORTED_CHAIN_IDS = new Set([31337, 84532, 8453]);

export function getConfig() {
  const serverUrl = process.env.PACT_SERVER_URL || 'http://localhost:3001';
  const privateKey = process.env.PACT_WALLET_PRIVATE_KEY;
  const chainId = parseInt(process.env.CHAIN_ID || '31337', 10);

  if (isNaN(chainId) || !SUPPORTED_CHAIN_IDS.has(chainId)) {
    throw new Error(
      `Invalid CHAIN_ID: "${process.env.CHAIN_ID}". ` +
      `Supported values: ${[...SUPPORTED_CHAIN_IDS].join(', ')} (Anvil, Base Sepolia, Base Mainnet).`
    );
  }

  // Warn if using default server URL with a non-local chain
  if (!process.env.PACT_SERVER_URL && chainId !== 31337) {
    console.warn(
      'WARNING: PACT_SERVER_URL not set. Defaulting to http://localhost:3001.\n' +
      `This is likely incorrect for chain ID ${chainId}. ` +
      'Set PACT_SERVER_URL to your deployed MCP server (e.g., https://pact.yihan.app).'
    );
  }

  return { serverUrl, privateKey, chainId };
}

/**
 * Like getConfig(), but throws if PACT_WALLET_PRIVATE_KEY is not set.
 * Use this in examples that require authentication (creator-agent, worker-agent).
 * The task-finder example does not need a private key and should use getConfig() directly.
 */
export function getAuthenticatedConfig(): ReturnType<typeof getConfig> & { privateKey: string } {
  const config = getConfig();
  if (!config.privateKey) {
    throw new Error(
      'PACT_WALLET_PRIVATE_KEY is required for authenticated examples.\n' +
      'Set it in your .env file. For local Anvil testing, use one of the\n' +
      'pre-funded accounts printed by start-anvil.sh.\n' +
      'NEVER use a mainnet private key in example scripts.'
    );
  }
  return config as ReturnType<typeof getConfig> & { privateKey: string };
}
