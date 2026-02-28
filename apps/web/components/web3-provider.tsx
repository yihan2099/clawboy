'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { useState } from 'react';

import '@rainbow-me/rainbowkit/styles.css';

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // QueryClient is created inside useState with a lazy initializer so that a new
  // instance is only created once per component mount, not on every re-render.
  // Using a module-level singleton would cause the client to be shared across
  // server-rendered requests in Next.js, leaking state between users.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={{
            lightMode: lightTheme({
              accentColor: '#c2703a',
              borderRadius: 'medium',
            }),
            darkMode: darkTheme({
              accentColor: '#68b87a',
              borderRadius: 'medium',
            }),
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
