/**
 * ERC20 Token Utilities
 *
 * Helper functions for working with ERC20 tokens including
 * allowance checking, balance queries, and amount formatting.
 */

import { formatUnits, parseUnits, type PublicClient } from 'viem';

/** Standard ERC20 ABI for the functions we need */
const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

/**
 * Get the allowance of an ERC20 token
 * @param client - Viem public client
 * @param token - Token contract address
 * @param owner - Address of the token owner
 * @param spender - Address of the spender (e.g., EscrowVault)
 * @returns The allowance amount in token base units
 */
export async function getTokenAllowance(
  client: PublicClient,
  token: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`
): Promise<bigint> {
  const allowance = await client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  });
  return allowance;
}

/**
 * Get the balance of an ERC20 token for an address
 * @param client - Viem public client
 * @param token - Token contract address
 * @param owner - Address to check balance for
 * @returns The balance in token base units
 */
export async function getTokenBalance(
  client: PublicClient,
  token: `0x${string}`,
  owner: `0x${string}`
): Promise<bigint> {
  const balance = await client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [owner],
  });
  return balance;
}

/**
 * Format a token amount from base units to human-readable string
 * @param amount - Amount in base units (e.g., wei)
 * @param decimals - Token decimals (e.g., 6 for USDC, 18 for ETH)
 * @param maxDecimals - Maximum decimal places to show (default: 4)
 * @returns Formatted string (e.g., "100.00")
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals: number = 4
): string {
  const value = formatUnits(amount, decimals);
  const parts = value.split('.');

  if (parts.length === 1) {
    return value;
  }

  const truncatedDecimals = parts[1].slice(0, maxDecimals);
  // Remove trailing zeros
  const trimmed = truncatedDecimals.replace(/0+$/, '');
  return trimmed ? `${parts[0]}.${trimmed}` : parts[0];
}

/**
 * Parse a human-readable token amount to base units
 * @param amount - Human-readable amount (e.g., "100.50")
 * @param decimals - Token decimals (e.g., 6 for USDC, 18 for ETH)
 * @returns Amount in base units
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  // Clean the input
  const cleaned = amount.trim().replace(/,/g, '');
  return parseUnits(cleaned, decimals);
}

/**
 * Format a token amount with symbol
 * @param amount - Amount in base units
 * @param decimals - Token decimals
 * @param symbol - Token symbol (e.g., "USDC")
 * @param maxDecimals - Maximum decimal places to show
 * @returns Formatted string with symbol (e.g., "100.00 USDC")
 */
export function formatTokenAmountWithSymbol(
  amount: bigint,
  decimals: number,
  symbol: string,
  maxDecimals: number = 4
): string {
  return `${formatTokenAmount(amount, decimals, maxDecimals)} ${symbol}`;
}

/**
 * Check if an address has sufficient allowance for a token transfer
 * @param client - Viem public client
 * @param token - Token contract address
 * @param owner - Address of the token owner
 * @param spender - Address of the spender
 * @param amount - Required amount in base units
 * @returns True if allowance is sufficient
 */
export async function hasEnoughAllowance(
  client: PublicClient,
  token: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint
): Promise<boolean> {
  const allowance = await getTokenAllowance(client, token, owner, spender);
  return allowance >= amount;
}

/**
 * Check if an address has sufficient balance of a token
 * @param client - Viem public client
 * @param token - Token contract address
 * @param owner - Address to check
 * @param amount - Required amount in base units
 * @returns True if balance is sufficient
 */
export async function hasEnoughBalance(
  client: PublicClient,
  token: `0x${string}`,
  owner: `0x${string}`,
  amount: bigint
): Promise<boolean> {
  const balance = await getTokenBalance(client, token, owner);
  return balance >= amount;
}
