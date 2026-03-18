import { NavHeader } from '@/components/landing/nav-header';
import { HeroSection } from '@/components/landing/hero-section';
import { GettingStartedSection } from '@/components/landing/getting-started-section';
import { FooterSection } from '@/components/landing/footer-section';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="relative min-h-screen min-h-[100dvh]">
      <div className="fixed inset-0 bg-background" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--gradient-glow),transparent_60%)]" />
      </div>

      <NavHeader />

      <main className="relative z-10">
        <HeroSection />
        <Separator className="max-w-2xl mx-auto" />
        <GettingStartedSection />
        <Separator className="max-w-2xl mx-auto" />
        <FooterSection />
      </main>
    </div>
  );
}
