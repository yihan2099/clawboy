"use client";

import dynamic from "next/dynamic";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { WhyJoinSection } from "@/components/landing/why-join-section";
import { FooterSection } from "@/components/landing/footer-section";

const FaultyTerminal = dynamic(() => import("@/components/FaultyTerminal"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* Fixed terminal background */}
      <div className="fixed inset-0" aria-hidden="true">
        <FaultyTerminal
          scale={1.5}
          gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={0.5}
          pause={false}
          scanlineIntensity={0.5}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0.1}
          tint="#A7EF9E"
          mouseReact
          mouseStrength={0.5}
          pageLoadAnimation
          brightness={0.6}
          className=""
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      {/* Scrollable content */}
      <main className="relative z-10">
        <HeroSection />
        <HowItWorksSection />
        <WhyJoinSection />
        <FooterSection />
      </main>
    </div>
  );
}
