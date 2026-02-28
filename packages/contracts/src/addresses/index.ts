export { BASE_SEPOLIA_ADDRESSES, BASE_SEPOLIA_CHAIN_ID } from './base-sepolia';
export { BASE_MAINNET_ADDRESSES, BASE_MAINNET_CHAIN_ID } from './base-mainnet';
export { LOCAL_ADDRESSES, LOCAL_CHAIN_ID } from './local';

import { BASE_SEPOLIA_ADDRESSES, BASE_SEPOLIA_CHAIN_ID } from './base-sepolia';
import { BASE_MAINNET_ADDRESSES, BASE_MAINNET_CHAIN_ID } from './base-mainnet';
import { LOCAL_ADDRESSES, LOCAL_CHAIN_ID } from './local';

export type ContractAddresses = typeof BASE_SEPOLIA_ADDRESSES;

/**
 * Check if all contract addresses in a set are zero (placeholder).
 * Emits a runtime warning to prevent accidental use of undeployed addresses.
 */
function warnIfAllZeroAddresses(addresses: ContractAddresses, chainId: number): void {
  const allZero = Object.values(addresses).every(
    (addr) => addr === '0x0000000000000000000000000000000000000000'
  );
  if (allZero) {
    console.warn(
      `[pact/contracts] WARNING: All contract addresses for chain ${chainId} are zero (placeholder). ` +
        `Transactions will silently fail or revert. Do NOT use in production until contracts are deployed.`
    );
  }
}

/**
 * Get contract addresses for a given chain ID
 */
export function getContractAddresses(chainId: number): ContractAddresses {
  switch (chainId) {
    case LOCAL_CHAIN_ID:
      return LOCAL_ADDRESSES;
    case BASE_SEPOLIA_CHAIN_ID:
      return BASE_SEPOLIA_ADDRESSES;
    case BASE_MAINNET_CHAIN_ID:
      warnIfAllZeroAddresses(BASE_MAINNET_ADDRESSES, chainId);
      return BASE_MAINNET_ADDRESSES;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

/**
 * Check if a chain ID is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return (
    chainId === LOCAL_CHAIN_ID ||
    chainId === BASE_SEPOLIA_CHAIN_ID ||
    chainId === BASE_MAINNET_CHAIN_ID
  );
}
