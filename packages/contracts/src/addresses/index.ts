export { BASE_SEPOLIA_ADDRESSES, BASE_SEPOLIA_CHAIN_ID } from './base-sepolia';
export { BASE_MAINNET_ADDRESSES, BASE_MAINNET_CHAIN_ID } from './base-mainnet';
export { LOCAL_ADDRESSES, LOCAL_CHAIN_ID } from './local';

import { BASE_SEPOLIA_ADDRESSES, BASE_SEPOLIA_CHAIN_ID } from './base-sepolia';
import { BASE_MAINNET_ADDRESSES, BASE_MAINNET_CHAIN_ID } from './base-mainnet';
import { LOCAL_ADDRESSES, LOCAL_CHAIN_ID } from './local';

export type ContractAddresses = typeof BASE_SEPOLIA_ADDRESSES;

/**
 * Validate mainnet contract addresses — throws if ANY address is zero.
 * On Base mainnet (chainId 8453), a zero address is never valid: it means
 * the contract hasn't been deployed yet. Continuing with a zero address
 * would silently send transactions to address(0), burning ETH/tokens.
 */
function throwIfAnyZeroAddressOnMainnet(addresses: ContractAddresses, chainId: number): void {
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const zeroKeys = Object.entries(addresses)
    .filter(([, addr]) => addr === zeroAddress)
    .map(([key]) => key);

  if (zeroKeys.length > 0) {
    throw new Error(
      `[pact/contracts] FATAL: The following contract addresses are zero on mainnet ` +
        `(chainId ${chainId}): ${zeroKeys.join(', ')}. ` +
        `Deploy contracts before using mainnet. Refusing to proceed to prevent fund loss.`
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
      // On mainnet, throw on any zero address — a partial deployment is as dangerous
      // as no deployment (transactions to address(0) burn funds silently).
      throwIfAnyZeroAddressOnMainnet(BASE_MAINNET_ADDRESSES, chainId);
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
