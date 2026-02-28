import { http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// ENVIRONMENT: 'pact-dev' is a placeholder projectId that only works in WalletConnect's
// development mode. In production, set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to the real
// project ID from https://cloud.walletconnect.com/ or WalletConnect connections will fail.
if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  console.warn(
    '[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — using placeholder. ' +
    'WalletConnect connections may fail in production.'
  );
}

export const config = getDefaultConfig({
  appName: 'Pact',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'pact-dev',
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
});
