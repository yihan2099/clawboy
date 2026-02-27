/**
 * Shared configuration for Pact examples
 */

export function getConfig() {
  const serverUrl = process.env.PACT_SERVER_URL || 'http://localhost:3001';
  const privateKey = process.env.PACT_WALLET_PRIVATE_KEY;
  const chainId = parseInt(process.env.CHAIN_ID || '31337', 10);

  return { serverUrl, privateKey, chainId };
}
