import {
  createWalletClient,
  http,
  type WalletClient,
  type Chain,
  type Transport,
  type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChain, getDefaultRpcUrl } from './public-client';

/**
 * Validate that a string is a well-formed private key before passing to viem.
 * Must be 0x-prefixed, 66 characters total (0x + 64 hex digits = 32 bytes).
 *
 * @throws {Error} with a descriptive message if the format is invalid
 */
export function validatePrivateKeyFormat(privateKey: string): asserts privateKey is `0x${string}` {
  if (typeof privateKey !== 'string') {
    throw new Error('Private key must be a string');
  }
  if (!privateKey.startsWith('0x')) {
    throw new Error(
      'Private key must start with 0x prefix. ' +
      'Example: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    );
  }
  if (privateKey.length !== 66) {
    throw new Error(
      `Private key must be 66 characters (0x + 64 hex digits), got ${privateKey.length}. ` +
      'A valid private key is 32 bytes (256 bits) encoded as hex.'
    );
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error(
      'Private key contains invalid characters. Must be 0x followed by 64 hexadecimal digits.'
    );
  }
}

/**
 * Get default chain ID from environment
 */
function getDefaultChainId(): number {
  return parseInt(process.env.CHAIN_ID || '84532', 10);
}

/**
 * Create a wallet client from a private key
 */
export function createWalletFromPrivateKey(
  privateKey: `0x${string}`,
  chainId?: number,
  rpcUrl?: string
): WalletClient<Transport, Chain, Account> {
  validatePrivateKeyFormat(privateKey);
  const resolvedChainId = chainId || getDefaultChainId();
  const account = privateKeyToAccount(privateKey);
  const chain = getChain(resolvedChainId);
  const url = rpcUrl || getDefaultRpcUrl(resolvedChainId);

  return createWalletClient({
    account,
    chain,
    transport: http(url),
  });
}

/**
 * Get wallet address from private key
 */
export function getAddressFromPrivateKey(privateKey: `0x${string}`): `0x${string}` {
  validatePrivateKeyFormat(privateKey);
  const account = privateKeyToAccount(privateKey);
  return account.address;
}

/**
 * Sign a message with a private key
 */
export async function signMessage(
  privateKey: `0x${string}`,
  message: string
): Promise<`0x${string}`> {
  validatePrivateKeyFormat(privateKey);
  const account = privateKeyToAccount(privateKey);
  return account.signMessage({ message });
}

/**
 * Sign typed data (EIP-712)
 */
export async function signTypedData(
  privateKey: `0x${string}`,
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: `0x${string}`;
  },
  types: Record<string, Array<{ name: string; type: string }>>,
  primaryType: string,
  message: Record<string, unknown>
): Promise<`0x${string}`> {
  validatePrivateKeyFormat(privateKey);
  const account = privateKeyToAccount(privateKey);
  return account.signTypedData({
    domain,
    types,
    primaryType,
    message,
  });
}
