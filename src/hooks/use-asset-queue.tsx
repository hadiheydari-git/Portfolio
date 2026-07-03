"use client";

import * as React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Phase = "loading" | "ready" | "complete";

export type LoadingGateReturn = {
  /** Current phase. */
  phase: Phase;
  /** True once every critical image is loaded. */
  isReady: boolean;
  /** True once background gallery pre-fetching is also finished. */
  isFullyLoaded: boolean;
  /** Report a critical image load (or error — never blocks forever). */
  reportCritical: (key: string) => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const Ctx = React.createContext<LoadingGateReturn | null>(null);

/**
 * Standard hook — throws if used outside <LoadingGateProvider>.
 */
export function useAssetQueue(): LoadingGateReturn {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useAssetQueue must be used inside <LoadingGateProvider>");
  return ctx;
}

/**
 * Safe variant — returns true when no provider is present.
 * Used by SectionReveal so it works both inside and outside the gate.
 */
export function useGateReady(): boolean {
  const ctx = React.useContext(Ctx);
  return ctx ? ctx.isReady : true;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type LoadingGateProviderProps = {
  children: React.ReactNode;
  /**
   * Unique keys for every image that must load before the page becomes
   * visible.  Order does not matter — all must report before isReady flips.
   */
  criticalKeys: string[];
  /**
   * Gallery / modal image URLs to pre-fetch in the background AFTER the
   * page is fully visible.  Batched 6-at-a-time via requestIdleCallback.
   */
  galleryUrls?: string[];
};

/**
 * Production-grade loading gate.
 *
 * Architecture:
 * ─────────────
 * 1. CRITICAL PHASE — All `criticalKeys` images use <Image priority> with
 *    `onLoad → reportCritical(key)`.  We track loaded keys in a Set.
 *    Once every key is present → `isReady` flips to true.
 *
 * 2. DEFERRED PHASE — After `isReady`, gallery images are pre-fetched
 *    in batches of 6 using `requestIdleCallback` so the main thread
 *    stays responsive.  Errors are silently ignored (gallery images are
 *    non-critical).
 *
 * No "tick" counter, no per-image re-renders for consumers, no polling.
 * The only state changes are: loadedSet grows → isReady flips → phase
 * transitions.  This minimises React re-renders to at most 7 (one per
 * critical image + one for isReady + one for complete).
 */
export function LoadingGateProvider({
  children,
  criticalKeys,
  galleryUrls = [],
}: LoadingGateProviderProps) {
  // Stable ref — criticalKeys is a module-level constant, never changes.
  const criticalKeysRef = React.useRef(criticalKeys);

  const [loadedSet, setLoadedSet] = React.useState<Set<string>>(() => new Set());
  const [isReady, setIsReady] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [isFullyLoaded, setIsFullyLoaded] = React.useState(false);

  // --- Report a critical image loaded (or errored) ---
  const reportCritical = React.useCallback((key: string) => {
    setLoadedSet((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  // --- Derive isReady from loadedSet ---
  React.useEffect(() => {
    if (isReady) return; // already ready, skip check
    if (criticalKeysRef.current.every((k) => loadedSet.has(k))) {
      setIsReady(true);
      setPhase("ready");
    }
  }, [loadedSet, isReady]);

  // --- Safety timeout: force isReady after 4 s so the page NEVER stays blank ---
  React.useEffect(() => {
    if (isReady) return;
    const id = setTimeout(() => {
      setIsReady(true);
      setPhase("ready");
    }, 4_000);
    return () => clearTimeout(id);
  }, [isReady]);

  // --- Phase 2: Background gallery pre-fetch ---
  React.useEffect(() => {
    if (!isReady || galleryUrls.length === 0) return;
    let cancelled = false;

    const encode = (u: string) => encodeURI(u).replace(/&/g, "%26");

    const run = async () => {
      const BATCH = 6;
      for (let i = 0; i < galleryUrls.length; i += BATCH) {
        if (cancelled) return;
        const batch = galleryUrls.slice(i, i + BATCH);
        await Promise.all(
          batch.map(
            (url) =>
              new Promise<void>((resolve) => {
                const img = new Image();
                img.decoding = "async";
                img.onload = () => resolve();
                img.onerror = () => resolve(); // non-critical — never block
                img.src = encode(url);
                if (img.complete) resolve();
              }),
          ),
        );
        // Yield to main thread between batches
        await new Promise((r) => setTimeout(r, 0));
      }
      if (!cancelled) {
        setPhase("complete");
        setIsFullyLoaded(true);
      }
    };

    // Start via requestIdleCallback for non-blocking kickoff
    const start =
      "requestIdleCallback" in window
        ? () => (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run)
        : () => setTimeout(run, 200);

    start();
    return () => {
      cancelled = true;
    };
  }, [isReady, galleryUrls]);

  const value = React.useMemo<LoadingGateReturn>(
    () => ({ phase, isReady, isFullyLoaded, reportCritical }),
    [phase, isReady, isFullyLoaded, reportCritical],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}