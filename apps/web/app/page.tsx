import { HeroSection } from "@/components/landing/hero-section";
import { WhySection } from "@/components/landing/why-section";
import { RolesSection } from "@/components/landing/roles-section";
import { ArchitectureSection } from "@/components/landing/architecture-section";
import { FooterSection } from "@/components/landing/footer-section";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="relative min-h-screen min-h-[100dvh]">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-background" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--gradient-glow),transparent_60%)]" />
      </div>

      {/* Theme toggle - fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Scrollable content */}
      <main className="relative z-10">
        <HeroSection />
        <WhySection />
        <RolesSection />
        <ArchitectureSection />
        <FooterSection />
      </main>
    </div>
  );
}
