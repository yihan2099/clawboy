import { EscrowVaultABI, getContractAddresses } from '@clawboy/contracts';
import { getPublicClient } from '../client/public-client';
import { withContractRetry, type RetryConfig } from '../utils/retry';

/**
 * Get default chain ID from environment
 */
function getDefaultChainId(): number {
  return parseInt(process.env.CHAIN_ID || '84532', 10);
}

/**
 * Get EscrowVault contract address
 */
export function getEscrowVaultAddress(chainId?: number): `0x${string}` {
  const addresses = getContractAddresses(chainId || getDefaultChainId());
  return addresses.escrowVault;
}

/**
 * Get escrow balance for a task with automatic retry on transient failures
 */
export async function getEscrowBalance(
  taskId: bigint,
  chainId?: number,
  retryConfig?: RetryConfig
): Promise<{
  token: `0x${string}`;
  amount: bigint;
}> {
  const resolvedChainId = chainId || getDefaultChainId();
  const publicClient = getPublicClient(resolvedChainId);
  const addresses = getContractAddresses(resolvedChainId);

  const result = await withContractRetry(
    () =>
      publicClient.readContract({
        address: addresses.escrowVault,
        abi: EscrowVaultABI,
        functionName: 'getBalance',
        args: [taskId],
      }),
    retryConfig
  );

  const [token, amount] = result as [`0x${string}`, bigint];
  return { token, amount };
}
