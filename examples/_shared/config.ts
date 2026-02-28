/**
 * Shared configuration for Pact examples
 */

export function getConfig() {
  const serverUrl = process.env.PACT_SERVER_URL || 'http://localhost:3001';
  const privateKey = process.env.PACT_WALLET_PRIVATE_KEY;
  const chainId = parseInt(process.env.CHAIN_ID || '31337', 10);

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
