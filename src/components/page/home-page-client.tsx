"use client";

import * as React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { Experience } from "@/components/sections/experience";
import { Portfolio } from "@/components/sections/portfolio";
import { Skills } from "@/components/sections/skills";
import { Contact } from "@/components/sections/contact";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingGateProvider, useAssetQueue } from "@/hooks/use-asset-queue";
import { useCriticalAssets } from "@/hooks/use-critical-assets";

/**
 * Page content wrapped in a visibility gate.
 *
 * `visibility: hidden` means:
 * - Layout is computed (zero CLS when switching to visible).
 * - No painting overhead (unlike opacity:0).
 * - No pointer events.
 * - Screen readers still see the content (accessibility).
 *
 * When isReady flips → visibility:visible + overlay starts fading.
 * The content appears instantly as the overlay fades away.
 */
function PageContent({ children }: { children: React.ReactNode }) {
  const { isReady } = useAssetQueue();
  return (
    <div
      style={{ visibility: isReady ? "visible" : "hidden" }}
      className="contents"
    >
      {children}
    </div>
  );
}

/**
 * Client-side page shell.
 *
 * 1. LoadingGateProvider receives critical keys + gallery URLs.
 * 2. LoadingOverlay renders a full-screen barrier (z-[9999]).
 * 3. PageContent is `visibility: hidden` until all critical images report.
 * 4. When isReady flips:
 *    a. PageContent becomes visibility:visible (instant, zero CLS).
 *    b. LoadingOverlay fades out via CSS transition (500ms).
 *    c. SectionReveal observers start (animations play during fade).
 * 5. Gallery images pre-fetch silently in the background (requestIdleCallback).
 */
export function HomePageClient() {
  const { criticalKeys, galleryUrls } = useCriticalAssets();

  return (
    <LoadingGateProvider criticalKeys={criticalKeys} galleryUrls={galleryUrls}>
      {/* Full-screen barrier — fades out when critical assets loaded */}
      <LoadingOverlay />

      {/* Actual page — visibility:hidden until ready, then visibility:visible */}
      <PageContent>
        <div id="top" className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <Hero />
            <Portfolio />
            <Experience />
            <Skills />
            <Contact />
          </main>
          <Footer />
        </div>
      </PageContent>
    </LoadingGateProvider>
  );
}