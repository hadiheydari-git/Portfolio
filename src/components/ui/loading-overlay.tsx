"use client";

import * as React from "react";
import { useAssetQueue } from "@/hooks/use-asset-queue";

/**
 * Full-screen loading barrier — blank black screen.
 *
 * CRITICAL: This overlay MUST be removed from the DOM the instant
 * `isReady` flips. Even at opacity:0, a `position: fixed; z-[9999]`
 * element creates a compositing layer ABOVE the header (z-50), which
 * breaks `backdrop-filter` on the header nav. The browser's backdrop
 * compositor samples from layers above the element — if the overlay
 * (even transparent) is above the header, backdrop-filter samples
 * from the overlay instead of the page content behind the header.
 *
 * This is why blur worked after switching language (React re-render
 * recomputes compositing) but not on first load in Persian (overlay
 * still in DOM during the 600ms fade-out window).
 *
 * Solution: remove the overlay IMMEDIATELY. No fade-out. The page
 * content's own reveal animations (SectionReveal, hero stagger, etc.)
 * provide the visual transition from the black screen.
 */
export function LoadingOverlay() {
  const { isReady } = useAssetQueue();

  React.useEffect(() => {
    const html = document.documentElement;
    if (isReady) {
      html.classList.remove("is-loading");
    } else {
      html.classList.add("is-loading");
    }
  }, [isReady]);

  // Remove from DOM immediately when ready — no fade, no delay.
  // This is the ONLY way to guarantee backdrop-filter works on
  // first load in both RTL and LTR.
  if (isReady) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black"
      aria-hidden
    />
  );
}
