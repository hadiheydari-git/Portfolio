"use client";

import * as React from "react";
import { projects } from "@/lib/content";

/* ------------------------------------------------------------------ */
/*  Display order — matches the bento grid layout.                     */
/* ------------------------------------------------------------------ */

const PROJECT_DISPLAY_ORDER = [
  "dutar-dashboard",
  "dutar-shop",
  "dev-solutions",
  "mafia-master",
];

/* ------------------------------------------------------------------ */
/*  Critical keys — images that gate page visibility.                  */
/* ------------------------------------------------------------------ */

const CRITICAL_KEYS: string[] = [
  "header:avatar",
  "hero:headshot",
  // Portfolio covers are lazy-loaded via next/image — not on the critical path.
  // Source files are up to 8640×4320; decoding them synchronously blocked scroll.
];

/* ------------------------------------------------------------------ */
/*  Gallery URLs — pre-fetched after critical phase.                   */
/* ------------------------------------------------------------------ */

function buildGalleryUrls(): string[] {
  const urls: string[] = [];
  for (const id of PROJECT_DISPLAY_ORDER) {
    const p = projects.find((x) => x.id === id);
    if (!p) continue;
    for (const g of p.gallery) {
      urls.push(g.src);
    }
  }
  return urls;
}

const GALLERY_URLS: string[] = buildGalleryUrls();

/* ------------------------------------------------------------------ */
/*  Hook — returns stable constants.                                   */
/* ------------------------------------------------------------------ */

/** Returns the critical image keys and gallery URLs for the loading gate. */
export function useCriticalAssets(): {
  criticalKeys: string[];
  galleryUrls: string[];
} {
  return React.useMemo(
    () => ({ criticalKeys: CRITICAL_KEYS, galleryUrls: GALLERY_URLS }),
    [],
  );
}