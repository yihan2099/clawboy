// TODO(#083): The fixed radial-gradient background causes a full repaint on iOS Safari
// during scroll because it is attached to a position:fixed element. Fix options:
// (1) use `will-change: transform` on the gradient div to promote it to its own
// compositor layer, (2) replace position:fixed with a CSS background on <body>, or
// (3) use a simpler static gradient that does not trigger GPU repaints on scroll.
import { DashboardNav } from '@/components/dashboard-nav';
import { Web3Provider } from '@/components/web3-provider';
import { Toaster } from '@/components/ui/sonner';
import { CommandSearch } from '@/components/command-search';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <div className="relative min-h-screen min-h-[100dvh]">
        <div className="fixed inset-0 bg-background" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--gradient-glow),transparent_60%)]" />
        </div>
        <DashboardNav />
        <main className="relative z-10 container mx-auto px-4 py-6">{children}</main>
        <Toaster />
        <CommandSearch />
      </div>
    </Web3Provider>
  );
}
