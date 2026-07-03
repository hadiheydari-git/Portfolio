"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssetQueue, type Phase } from "@/hooks/use-asset-queue";

// ---------------------------------------------------------------------------
// Polished full-screen loading overlay.
// Blocks the page until the asset queue reports `isReady`.
// Uses a thin progress bar + phase label for visual feedback.
// ---------------------------------------------------------------------------

const PHASE_LABEL: Record<Phase, string> = {
  idle: "",
  critical: "Loading essential assets\u2026",
  standard: "Preparing layout\u2026",
  deferred: "Pre-fetching gallery\u2026",
  complete: "",
};

export function LoadingGate({ children }: { children: React.ReactNode }) {
  const { phase, progress, isReady } = useAssetQueue();

  // Once revealed, never re-show the overlay (even if HMR re-renders).
  const [revealed, setRevealed] = React.useState(false);
  const hasRevealedOnce = React.useRef(false);

  React.useEffect(() => {
    if (isReady && !hasRevealedOnce.current) {
      hasRevealedOnce.current = true;
      // Tiny delay so the last progress frame paints inside the overlay.
      requestAnimationFrame(() => setRevealed(true));
    }
  }, [isReady]);

  const overlayVisible = !revealed;

  return (
    <>
      <AnimatePresence>
        {overlayVisible && (
          <motion.div
            key="loading-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          >
            {/* Centered content */}
            <div className="flex flex-col items-center gap-8">
              {/* Animated ring */}
              <div className="loading-ring relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-foreground/10" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-transparent loading-ring-spin"
                  style={{
                    borderBlockStartColor:
                      "color-mix(in oklch, var(--foreground) 70%, transparent)",
                    borderInlineStartColor:
                      "color-mix(in oklch, var(--foreground) 40%, transparent)",
                  }}
                />
                {/* Inner dot */}
                <span className="h-2 w-2 rounded-full bg-foreground/30" />
              </div>

              {/* Progress bar */}
              <div className="flex w-48 flex-col items-center gap-2.5">
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-foreground/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                </div>
                {/* Phase label */}
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground/70 tabular-nums">
                  {PHASE_LABEL[phase]}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content — hidden behind the overlay until revealed */}
      <div
        style={{ visibility: revealed ? "visible" : "hidden" }}
        className={revealed ? "page-revealed" : ""}
      >
        {children}
      </div>
    </>
  );
}