/**
 * Authentication helper for Pact examples
 */
import type { PactApiClient } from '@pactprotocol/mcp-client';
import { privateKeyToAccount } from 'viem/accounts';

export async function authenticate(
  client: PactApiClient,
  privateKey: string
): Promise<{ address: string }> {
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // Get challenge
  const { challenge } = await client.callTool<{
    challenge: string;
    walletAddress: string;
  }>('auth_get_challenge', { walletAddress: account.address });

  // Sign challenge
  const signature = await account.signMessage({ message: challenge });

  // Verify and get session
  const { sessionId } = await client.callTool<{ sessionId: string }>(
    'auth_verify',
    {
      walletAddress: account.address,
      signature,
      challenge,
    }
  );

  client.setSessionId(sessionId);
  return { address: account.address };
}
