"use client";

import * as React from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ZoomIn, ChevronLeft, ChevronRight, ArrowUpRight, ChevronDown, RotateCcw } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SmartImage } from "@/components/ui/smart-image";
import { ToolIcon } from "@/components/ui/tool-icon";
import type { Project, ToolCategory, GalleryImage } from "@/lib/content";
import { getResponsibilityIcon } from "@/lib/responsibility-icons";
import { cn } from "@/lib/utils";

/** Shared URL encoder — same logic as SmartImage so lightbox images
 *  with spaces or '&' in filenames load correctly. */
function encodeSrc(src: string): string {
  return encodeURI(src).replace(/&/g, "%26");
}

/** Build a Next.js Image Optimization URL (/_next/image) for heavy source
 *  images (e.g. Dev Solutions' 1.5MB 5760×13820 screenshots) — the server
 *  returns a pre-resized + recompressed variant instead of the raw file.
 *  Widths: w=640 for gallery thumbnails, w=1920 for full-HD lightbox;
 *  q=80 like bento covers. `url` must be URL-encoded for the optimizer. */
function optimizedSrc(src: string, width: number, quality: number = 80): string {
  const encoded = encodeURIComponent(encodeSrc(src));
  return `/_next/image?url=${encoded}&w=${width}&q=${quality}`;
}

/* Stable no-op stopPropagation handler — module-scope so React sees the
 * same reference every render and skips re-attaching the DOM listener. */
const stopPropagation = (e: React.SyntheticEvent) => {
  e.stopPropagation();
};

type Props = {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CATEGORY_ORDER: ToolCategory[] = [
  "design",
  "research",
  "prototyping",
  "dev",
  "management",
];

/* ── Gallery batch size ── module-level so the value is stable across renders. */
const GALLERY_BATCH_SIZE = 3;

/* ── Modal content stagger ── sections fade up one by one with an 80ms
   stagger, 250ms after the container settles. */

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.25,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ── Cover aperture reveal ── */

const coverMediaVariants: Variants = {
  hidden: {
    opacity: 0,
    filter: "blur(24px) brightness(0.3)",
    scale: 1.08,
  },
  show: {
    opacity: 1,
    filter: "blur(0px) brightness(1)",
    scale: 1,
    transition: {
      duration: 1.2,
      delay: 0.15,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Post-reveal variant — framer-motion does NOT clear properties absent
// from a new variant, so `filter: "none"` must be set explicitly.
const coverMediaVariantsDone: Variants = {
  hidden: { opacity: 1, scale: 1, filter: "none" },
  show: { opacity: 1, scale: 1, filter: "none" },
};

const coverMediaVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] },
  },
};

export function ProjectModal({ project, open, onOpenChange }: Props) {
  const { t, tt, locale } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  // Wait for the container entrance to finish before animating children.
  const [contentAnimate, setContentAnimate] = React.useState(
    () => prefersReducedMotion
  );
  const [galleryReady, setGalleryReady] = React.useState(
    () => prefersReducedMotion
  );
  const [portalReady, setPortalReady] = React.useState(false);
  const [modalOpenKey, setModalOpenKey] = React.useState(0);
  // True after the aperture reveal — swap to a variant with
  // `filter: "none"` (framer-motion re-applies variant values on re-render).
  const [coverRevealDone, setCoverRevealDone] = React.useState(false);
  // True once the cover image/video has loaded; the aperture reveal is
  // gated on this so the blur→sharp transition runs with the image visible.
  const [coverMediaReady, setCoverMediaReady] = React.useState(false);
  const openSequenceRef = React.useRef(0);
  // Timer ref for delaying child animations until the container's
  // entrance animation completes.
  const parentAnimationTimerRef = React.useRef<number | null>(null);
  const [lightboxImg, setLightboxImg] = React.useState<GalleryImage | null>(null);
  // ── Derived lightbox values (memoized) ── stable across re-renders
  // (e.g. during pinch-zoom state updates) unless the image changes.
  const lightboxIndex = React.useMemo(
    () => lightboxImg && project ? project.gallery.indexOf(lightboxImg) : -1,
    [lightboxImg, project]
  );
  const lightboxTotal = project?.gallery.length ?? 0;
  const isDevSolutions = project?.id === "dev-solutions";
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const imageWrapperRef = React.useRef<HTMLDivElement>(null);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to the modal panel motion.div — used to clear transform +
  // willChange after the entrance animation. A persistent GPU layer with
  // any non-`none` transform disables subpixel anti-aliasing in Chrome.
  const modalPanelRef = React.useRef<HTMLDivElement>(null);
  // Tracks pointer-down position to distinguish a real tap (< 8px → close)
  // from a drag, and whether the pointer started inside the image wrapper
  // (tapping the image never closes the lightbox).
  const pointerDownRef = React.useRef<{
    x: number;
    y: number;
    pointerId: number;
    targetIsImage: boolean;
  } | null>(null);
  // True once the currently-displayed lightbox image has finished loading
  // (reset per image so the skeleton shows/hides correctly).
  const [lightboxImgLoaded, setLightboxImgLoaded] = React.useState(false);
  // Loaded sources cached for the modal's lifetime (reuse on back-nav).
  const loadedLightboxSourcesRef = React.useRef<Set<string>>(new Set());
  // True once ANY image has loaded this session; unlike
  // `lightboxImgLoaded` it does NOT reset per slide, so the capsule
  // doesn't unmount/remount on each slide change.
  const [lightboxReady, setLightboxReady] = React.useState(false);
  // X-button visibility on desktop: shows only while the mouse is moving,
  // auto-hides after ~2s idle; mobile uses a [@media(hover:none)] override.
  const [isImgHovered, setIsImgHovered] = React.useState(false);

  // ── Tall-image scrollable frame (Dev Solutions images 1 & 3) ──
  // Tall portraits (aspectRatio < 1) get a 16:9 "autofill" frame: the image
  // fills the frame width, overflows height, user scrolls vertically.
  // A "scroll" hint slides in 1.5s after open and out on first scroll.
  const [scrollHintVisible, setScrollHintVisible] = React.useState(false);
  const [scrollAvailable, setScrollAvailable] = React.useState(false);
  const lightboxScrollFrameRef = React.useRef<HTMLDivElement>(null);
  const scrollHintTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Lightbox pinch-zoom + pan (mobile) ── handled in JS via Pointer
  // Events because native pinch-zoom's one-finger pan conflicts with the
  // overlay's overflow-y-auto. 2 fingers: pinch zoom (1x-5x); 1 finger:
  // pan when zoomed, scroll/tap at 1x. touch-action: none on the <img>.
  const [lightboxZoom, setLightboxZoom] = React.useState(1);
  const [lightboxPan, setLightboxPan] = React.useState({ x: 0, y: 0 });
  const zoomPointersRef = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  // ── Pinch gesture start state ── newZoom = startZoom * (curDist /
  // startDist); the absolute-from-start distance avoids jitter from
  // finger wobble.
  const pinchStartDistRef = React.useRef<number | null>(null);
  const pinchStartZoomRef = React.useRef<number | null>(null);
  const lastPanPointRef = React.useRef<{ x: number; y: number } | null>(null);
  // Read current zoom in pointer handlers without re-creating callbacks
  const lightboxZoomRef = React.useRef(1);
  React.useEffect(() => { lightboxZoomRef.current = lightboxZoom; }, [lightboxZoom]);
  // Read current pan in pointer handlers without re-creating callbacks;
  // pinch-anchor math needs the latest pan synchronously.
  const lightboxPanRef = React.useRef({ x: 0, y: 0 });
  React.useEffect(() => { lightboxPanRef.current = lightboxPan; }, [lightboxPan]);

  // ── Cached image dimensions for clamp math + pinch anchor ──
  // Captured ONCE at gesture start (avoids forced-layout reads per move).
  // `natCenterX/Y` = image center before any transform (anchors the pinch
  // midpoint); `offsetWidth/Height` are pre-transform, valid all gesture.
  const imgDimsRef = React.useRef<{
    imgW: number;
    imgH: number;
    contW: number;
    contH: number;
    natCenterX: number;
    natCenterY: number;
  } | null>(null);

  // ── Smooth zoom animation for double-tap ── CSS `transition: transform`
  // animates the <img> while true; auto-resets after 450ms + buffer and is
  // cancelled immediately when a manual gesture starts.
  const [zoomAnimating, setZoomAnimating] = React.useState(false);
  const zoomAnimTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startZoomAnimation = React.useCallback(() => {
    setZoomAnimating(true);
    if (zoomAnimTimerRef.current) clearTimeout(zoomAnimTimerRef.current);
    // 500ms = 450ms transition + buffer; removing the transition early
    // would make the transform jump mid-animation.
    zoomAnimTimerRef.current = setTimeout(() => setZoomAnimating(false), 500);
  }, []);

  // ── "Double-tap to reset" hint ── shows 8s after the user zooms in,
  // auto-hides after 3s; re-shows after another 8s if they zoom again.
  const [zoomResetHintVisible, setZoomResetHintVisible] = React.useState(false);
  const zoomResetHintTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomResetHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (lightboxZoom > 1) {
      // Clear any pending show/hide timers from a previous zoom cycle.
      if (zoomResetHintTimerRef.current) clearTimeout(zoomResetHintTimerRef.current);
      if (zoomResetHideTimerRef.current) clearTimeout(zoomResetHideTimerRef.current);
      // Start hidden, then show after 8s, then auto-hide after 3s more.
      setZoomResetHintVisible(false);
      zoomResetHintTimerRef.current = setTimeout(() => {
        setZoomResetHintVisible(true);
        zoomResetHideTimerRef.current = setTimeout(() => {
          setZoomResetHintVisible(false);
        }, 3000);
      }, 8000);
    } else {
      // Zoom returned to 1x → hide immediately and cancel all timers.
      setZoomResetHintVisible(false);
      if (zoomResetHintTimerRef.current) {
        clearTimeout(zoomResetHintTimerRef.current);
        zoomResetHintTimerRef.current = null;
      }
      if (zoomResetHideTimerRef.current) {
        clearTimeout(zoomResetHideTimerRef.current);
        zoomResetHideTimerRef.current = null;
      }
    }
    return () => {
      if (zoomResetHintTimerRef.current) {
        clearTimeout(zoomResetHintTimerRef.current);
        zoomResetHintTimerRef.current = null;
      }
      if (zoomResetHideTimerRef.current) {
        clearTimeout(zoomResetHideTimerRef.current);
        zoomResetHideTimerRef.current = null;
      }
    };
  }, [lightboxZoom]);

  // ── Progressive gallery batch loading ── images load in sequential
  // batches of 3; the next batch starts only when the current one fully
  // loads (or errors). `activeBatch` (1-indexed): earlier batches stay
  // rendered, the active renders SmartImage, later render skeleton only
  // (no <img> → no network request). `loadedInBatchCount` reaching the
  // batch size advances the batch.
  const [activeBatch, setActiveBatch] = React.useState(1);
  const [loadedInBatchCount, setLoadedInBatchCount] = React.useState(0);

  // ── Stable gallery batch-loaded callback ── stable per-(batch,
  // activeBatch) to keep React.memo on DevSolutionsThumb effective;
  // counts the load only when `imageBatch === activeBatch` (via ref).
  const makeGalleryOnLoad = React.useCallback(
    (imageBatch: number) => () => {
      // Functional updater; reads the LATEST activeBatch via a ref.
      if (imageBatch === activeBatchRef.current) {
        setLoadedInBatchCount((c) => c + 1);
      }
    },
    []
  );
  // Mirrors `activeBatch` into a ref for the memoized callback above.
  const activeBatchRef = React.useRef(activeBatch);
  React.useEffect(() => {
    activeBatchRef.current = activeBatch;
  }, [activeBatch]);

  // True when the lightbox image is a tall Dev Solutions screenshot
  // (aspectRatio < 1) — the only ones getting the 16:9 scrollable frame.
  const isDevSolutionsTall = React.useMemo(
    () =>
      isDevSolutions &&
      lightboxImg?.aspectRatio !== undefined &&
      lightboxImg.aspectRatio < 1,
    [isDevSolutions, lightboxImg]
  );

  // ── Lightbox navigation callbacks ── index via `indexOf` inside the
  // callback keeps them stable so effects don't re-subscribe per slide.
  const lightboxPrev = React.useCallback(() => {
    if (!project || !lightboxImg) return;
    const gallery = project.gallery;
    const total = gallery.length;
    if (total === 0) return;
    const curIdx = gallery.indexOf(lightboxImg);
    if (curIdx < 0) return;
    const newIdx = curIdx <= 0 ? total - 1 : curIdx - 1;
    setLightboxImg(gallery[newIdx]);
  }, [project, lightboxImg]);

  const lightboxNext = React.useCallback(() => {
    if (!project || !lightboxImg) return;
    const gallery = project.gallery;
    const total = gallery.length;
    if (total === 0) return;
    const curIdx = gallery.indexOf(lightboxImg);
    if (curIdx < 0) return;
    const newIdx = curIdx >= total - 1 ? 0 : curIdx + 1;
    setLightboxImg(gallery[newIdx]);
  }, [project, lightboxImg]);

  // Reset lightbox state on close so the next open starts fresh; also
  // clears hint/zoom timers so none leak.
  React.useEffect(() => {
    if (!open) {
      requestAnimationFrame(() => {
        setLightboxImg(null);
        setIsImgHovered(false);
        setLightboxImgLoaded(false);
        setLightboxReady(false);
        // Clear the tall-image scroll-hint timer + state.
        setScrollHintVisible(false);
        if (scrollHintTimerRef.current) {
          clearTimeout(scrollHintTimerRef.current);
          scrollHintTimerRef.current = null;
        }
        // Clear the zoom-reset hint timer + state.
        setZoomResetHintVisible(false);
        if (zoomResetHintTimerRef.current) {
          clearTimeout(zoomResetHintTimerRef.current);
          zoomResetHintTimerRef.current = null;
        }
        if (zoomResetHideTimerRef.current) {
          clearTimeout(zoomResetHideTimerRef.current);
          zoomResetHideTimerRef.current = null;
        }
        // Cancel any in-progress double-tap zoom animation.
        setZoomAnimating(false);
        if (zoomAnimTimerRef.current) {
          clearTimeout(zoomAnimTimerRef.current);
          zoomAnimTimerRef.current = null;
        }
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }
      });
    }
  }, [open]);

  // Reset content animation state whenever the modal opens/closes.
  React.useEffect(() => {
    if (!open || !project) {
      setPortalReady(false);
      setContentAnimate(false);
      setGalleryReady(false);
      setCoverRevealDone(false);
      setCoverMediaReady(false);
      // Reset gallery batch loading so the next open starts from batch 1.
      setActiveBatch(1);
      setLoadedInBatchCount(0);
      if (parentAnimationTimerRef.current) {
        clearTimeout(parentAnimationTimerRef.current);
        parentAnimationTimerRef.current = null;
      }
      return;
    }

    setContentAnimate(false);
    setGalleryReady(false);
    setPortalReady(false);
    setCoverMediaReady(false);
    // Each project's gallery starts from batch 1.
    setActiveBatch(1);
    setLoadedInBatchCount(0);
    // Defensive: reset on OPEN too — a stale `true` would skip the
    // aperture animation on quick reopen.
    setCoverRevealDone(false);

    const sequence = ++openSequenceRef.current;
    const timer = window.setTimeout(() => {
      if (sequence !== openSequenceRef.current) return;
      setModalOpenKey((prev) => prev + 1);
      setPortalReady(true);
    }, 0);

    if (prefersReducedMotion) {
      setContentAnimate(true);
      setGalleryReady(true);
    }

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, project?.id, prefersReducedMotion]);

  // Per-slide reset: skeleton for the new image, clear X-hide timers.
  // `lightboxReady` / `isImgHovered` intentionally NOT reset.
  React.useEffect(() => {
    // New slide starts at natural scale, needing a fresh double-click
    // before wheel zoom.
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    lightboxZoomRef.current = 1;
    lightboxPanRef.current = { x: 0, y: 0 };
    // Always show the loading state for a newly selected slide (even
    // cached) to avoid an instant pop + layout shift.
    setLightboxImgLoaded(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [lightboxImg?.src]);

  // ── Tall-image scroll hint + frame scroll reset ──
  // Effect A resets hint state + scrollTop per image; Effect B starts the
  // 1500ms timer once the image is loaded AND scroll is possible (gating
  // on `lightboxImgLoaded` avoids a spurious scroll event on load
  // dismissing the hint). Scroll > 5px dismisses (filters sub-pixel).

  // Effect A — reset on image change.
  React.useEffect(() => {
    setScrollHintVisible(false);
    setScrollAvailable(false);
    if (scrollHintTimerRef.current) {
      clearTimeout(scrollHintTimerRef.current);
      scrollHintTimerRef.current = null;
    }
    // Reset scroll to top when navigating between tall images.
    if (lightboxScrollFrameRef.current) {
      lightboxScrollFrameRef.current.scrollTop = 0;
    }
  }, [lightboxImg?.src]);

  // Measure whether vertical scroll is possible in the tall frame (short
  // images may fit entirely → hint never appears). Checked next frame
  // after layout and on resize; +4px tolerance for sub-pixel rounding.
  React.useEffect(() => {
    if (!isDevSolutionsTall || !lightboxImgLoaded) {
      setScrollAvailable(false);
      return;
    }

    const check = () => {
      const frame = lightboxScrollFrameRef.current;
      if (!frame) return;
      setScrollAvailable(frame.scrollHeight > frame.clientHeight + 4);
    };

    // Check next frame so layout is settled, and re-check on resize.
    const id = requestAnimationFrame(check);
    window.addEventListener("resize", check);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", check);
    };
  }, [isDevSolutionsTall, lightboxImgLoaded, lightboxImg?.src]);

  // Effect B — start the 1.5s hint timer once the tall image has loaded
  // AND scroll is possible (otherwise the hint never appears).
  React.useEffect(() => {
    if (!isDevSolutionsTall || !lightboxImgLoaded || !scrollAvailable) return;

    // 1500ms delay, counted from when the image is VISIBLE (loaded).
    scrollHintTimerRef.current = setTimeout(() => {
      setScrollHintVisible(true);
    }, 1500);

    return () => {
      if (scrollHintTimerRef.current) {
        clearTimeout(scrollHintTimerRef.current);
        scrollHintTimerRef.current = null;
      }
    };
  }, [isDevSolutionsTall, lightboxImgLoaded, scrollAvailable, lightboxImg?.src]);

  // ── Gallery batch advancement ── advance when the active batch fully
  // loads; the last batch may be smaller than GALLERY_BATCH_SIZE.
  React.useEffect(() => {
    if (!project) return;
    const total = project.gallery.length;
    if (total === 0) return;
    const batchStart = (activeBatch - 1) * GALLERY_BATCH_SIZE;
    const expectedSize = Math.min(GALLERY_BATCH_SIZE, total - batchStart);
    if (expectedSize <= 0) return; // no images in this batch (shouldn't happen)
    if (loadedInBatchCount < expectedSize) return; // still waiting
    // All images in this batch are done. Advance if more batches remain.
    const nextBatchStart = activeBatch * GALLERY_BATCH_SIZE;
    if (nextBatchStart < total) {
      setActiveBatch((b) => b + 1);
      setLoadedInBatchCount(0);
    }
  }, [loadedInBatchCount, activeBatch, project]);

  // ── Lightbox zoom/pan reset on image change ── new image at 1x,
  // centered; clear cached dims.
  React.useEffect(() => {
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    lightboxZoomRef.current = 1;
    lightboxPanRef.current = { x: 0, y: 0 };
    zoomPointersRef.current.clear();
    pinchStartDistRef.current = null;
    pinchStartZoomRef.current = null;
    lastPanPointRef.current = null;
    // Clear cached dims so the next gesture captures fresh measurements.
    imgDimsRef.current = null;
  }, [lightboxImg?.src]);

  // ── Lightbox zoom/pan pointer handlers ── track active pointers to
  // detect 2-finger pinch vs 1-finger pan; touch-action: none → JS.
  const onZoomPointerDown = React.useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    zoomPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // ── Cancel any in-progress double-tap zoom animation ── sync the
    // zoom/pan refs to the CURRENT visual state so a gesture starting
    // mid-animation doesn't jump.
    if (zoomAnimating) {
      setZoomAnimating(false);
      if (zoomAnimTimerRef.current) {
        clearTimeout(zoomAnimTimerRef.current);
        zoomAnimTimerRef.current = null;
      }
      const imgEl = e.currentTarget as HTMLImageElement;
      const dims = imgDimsRef.current;
      if (imgEl && dims) {
        const rect = imgEl.getBoundingClientRect();
      // Visual zoom/pan from the current rect vs cached natural size/center.
        const visualZoom = rect.width / dims.imgW;
        const visualPanX = rect.left + rect.width / 2 - dims.natCenterX;
        const visualPanY = rect.top + rect.height / 2 - dims.natCenterY;
        lightboxZoomRef.current = visualZoom;
        lightboxPanRef.current = { x: visualPanX, y: visualPanY };
        setLightboxZoom(visualZoom);
        setLightboxPan({ x: visualPanX, y: visualPanY });
      }
    }

    // ── Cache image dimensions for clamp math + pinch anchor ── captured
    // ONCE per gesture (avoids forced-layout reads per move). `natCenter`
    // = transformed rect center - current pan; `offsetWidth/Height` are
    // pre-transform layout sizes. Captured on EVERY pointer-down —
    // one-finger pan needs them for clamping too.
    const img = e.currentTarget as HTMLImageElement;
    const container = img?.parentElement ?? null;
    if (img && container) {
      const rect = img.getBoundingClientRect();
      const pan = lightboxPanRef.current;
      imgDimsRef.current = {
        imgW: img.offsetWidth,
        imgH: img.offsetHeight,
        contW: container.offsetWidth,
        contH: container.offsetHeight,
        natCenterX: rect.left + rect.width / 2 - pan.x,
        natCenterY: rect.top + rect.height / 2 - pan.y,
      };
    }

    if (zoomPointersRef.current.size === 1) {
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    } else if (zoomPointersRef.current.size === 2) {
      // ── Pinch gesture START ── capture starting distance + zoom.
      const pts = Array.from(zoomPointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(
        pts[1].x - pts[0].x,
        pts[1].y - pts[0].y
      );
      pinchStartZoomRef.current = lightboxZoomRef.current;
    }
  }, []);

  const onZoomPointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!zoomPointersRef.current.has(e.pointerId)) return;
    zoomPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (zoomPointersRef.current.size >= 2
        && pinchStartDistRef.current !== null
        && pinchStartZoomRef.current !== null) {
      // ── Pinch zoom (2 fingers) — ABSOLUTE-from-start ──
      // newZoom = startZoom * (curDist / startDist); a direct function of
      // absolute finger distance avoids the jitter a per-event ratio
      // causes. DAMPENING (0.85) gives fine control without lag.
      const pts = Array.from(zoomPointersRef.current.values()).slice(0, 2);
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);

      const startDist = pinchStartDistRef.current;
      const startZoom = pinchStartZoomRef.current;
      // Guard against division by zero.
      if (startDist > 0 && startZoom !== null) {
        // Absolute distance ratio from gesture start
        const distRatio = dist / startDist;
        // Mild, symmetric dampening for fine control
        const DAMPENING = 0.85;
        const zoomFactor = 1 + (distRatio - 1) * DAMPENING;
        const targetZoom = startZoom * zoomFactor;

        // ── New zoom + anchor-kept pan from cached refs (no DOM reads /
        // layout reflow per event).
        const zOld = lightboxZoomRef.current;
        const newZoom = Math.max(1, Math.min(5, targetZoom));
        // `actualRatio` accounts for clamping at 1 or 5 — keeps the pinch
        // anchor accurate. Skip setState when nothing changed.
        const actualRatio = newZoom / zOld;
        if (actualRatio === 1) return;

        setLightboxZoom(newZoom);
        // Update ref immediately for same-frame events.
        lightboxZoomRef.current = newZoom;

        if (newZoom === 1) {
          // Returned to 1x → reset pan so the image is centered
          setLightboxPan({ x: 0, y: 0 });
          lightboxPanRef.current = { x: 0, y: 0 };
        } else {
          // ── Pinch anchor: keep the pinch midpoint under the fingers ──
          // panNew = (M - natCenter) * (1 - actualRatio) + panOld *
          // actualRatio, then clamp so the image edge stays within the
          // container edge.
          const dims = imgDimsRef.current;
          const panOld = lightboxPanRef.current;
          if (dims) {
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;
            const offsetX = midX - dims.natCenterX;
            const offsetY = midY - dims.natCenterY;
            let panX = offsetX * (1 - actualRatio) + panOld.x * actualRatio;
            let panY = offsetY * (1 - actualRatio) + panOld.y * actualRatio;
            // Clamp pan so the image edge cannot pass the container edge.
            const zoomedW = dims.imgW * newZoom;
            const zoomedH = dims.imgH * newZoom;
            const maxPanX = Math.max(0, (zoomedW - dims.contW) / 2);
            const maxPanY = Math.max(0, (zoomedH - dims.contH) / 2);
            panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
            panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
            setLightboxPan({ x: panX, y: panY });
            lightboxPanRef.current = { x: panX, y: panY };
          }
        }
      }
    } else if (zoomPointersRef.current.size === 1 && lastPanPointRef.current) {
      // ── One-finger drag ──
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;

      if (lightboxZoomRef.current > 1) {
        // Zoomed in → 2D pan, clamped via cached dims (no DOM reads);
        // center transform-origin: maxPan = max(0, (zoomed - container)/2).
        const dims = imgDimsRef.current;
        if (dims) {
          const zoom = lightboxZoomRef.current;
          const zoomedW = dims.imgW * zoom;
          const zoomedH = dims.imgH * zoom;
          const maxPanX = Math.max(0, (zoomedW - dims.contW) / 2);
          const maxPanY = Math.max(0, (zoomedH - dims.contH) / 2);
          setLightboxPan(p => {
            const np = {
              x: Math.max(-maxPanX, Math.min(maxPanX, p.x + dx)),
              y: Math.max(-maxPanY, Math.min(maxPanY, p.y + dy)),
            };
            lightboxPanRef.current = np;
            return np;
          });
        } else {
          // Fallback: no cached dims → pan without clamp.
          setLightboxPan(p => {
            const np = { x: p.x + dx, y: p.y + dy };
            lightboxPanRef.current = np;
            return np;
          });
        }
      } else if (lightboxScrollFrameRef.current) {
        // Not zoomed + tall frame → scroll it vertically (touch-action:
        // none disabled native scrolling).
        lightboxScrollFrameRef.current.scrollTop -= dy;
      }
      // Not zoomed + no scroll frame → nothing (tap-to-close handles it)

      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const onZoomPointerUp = React.useCallback((e: React.PointerEvent) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    zoomPointersRef.current.delete(e.pointerId);
    if (zoomPointersRef.current.size < 2) {
      // Pinch ended → a new second finger starts a FRESH pinch.
      pinchStartDistRef.current = null;
      pinchStartZoomRef.current = null;
    }
    if (zoomPointersRef.current.size === 1) {
      const [p] = Array.from(zoomPointersRef.current.values());
      lastPanPointRef.current = p;
    } else if (zoomPointersRef.current.size === 0) {
      lastPanPointRef.current = null;
    }
  }, []);

  // Double-tap toggles zoom (two pointer-downs within 300ms): at 1x →
  // 1.8x centered on the tap point (smooth 0.45s transition); zoomed →
  // reset to 1x. pan = clickOffset * (1 - zoomNew), then clamped.
  const lastTapRef = React.useRef(0);
  const onZoomDoubleTap = React.useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected → toggle zoom with smooth animation
      lastTapRef.current = 0;
      // Enable CSS transition so the zoom change animates smoothly.
      startZoomAnimation();

      if (lightboxZoomRef.current > 1) {
        // Currently zoomed → zoom OUT to 1x
        setLightboxZoom(1);
        setLightboxPan({ x: 0, y: 0 });
        lightboxZoomRef.current = 1;
        lightboxPanRef.current = { x: 0, y: 0 };
      } else {
        // At 1x → zoom IN to 1.8x centered on the tap point.
        const img = e.currentTarget;
        const container = img?.parentElement ?? null;
        const zoomNew = 1.8;

        if (img && container) {
          // Click offset relative to the image's center (rect is natural
          // at zoom=1, pan=0).
          const rect = img.getBoundingClientRect();
          const clickOffsetX = e.clientX - (rect.left + rect.width / 2);
          const clickOffsetY = e.clientY - (rect.top + rect.height / 2);
          // Pan needed to keep the tap point under the cursor after scaling
          let panX = clickOffsetX * (1 - zoomNew);
          let panY = clickOffsetY * (1 - zoomNew);
          // Clamp pan; also cache dims (+ natural center) for subsequent
          // pan/pinch.
          const imgW = img.offsetWidth;
          const imgH = img.offsetHeight;
          const contW = container.offsetWidth;
          const contH = container.offsetHeight;
          // At zoom=1, pan=0, the natural center = transformed center.
          const natCenterX = rect.left + rect.width / 2;
          const natCenterY = rect.top + rect.height / 2;
          imgDimsRef.current = { imgW, imgH, contW, contH, natCenterX, natCenterY };
          const zoomedW = imgW * zoomNew;
          const zoomedH = imgH * zoomNew;
          const maxPanX = Math.max(0, (zoomedW - contW) / 2);
          const maxPanY = Math.max(0, (zoomedH - contH) / 2);
          panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
          panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
          setLightboxZoom(zoomNew);
          setLightboxPan({ x: panX, y: panY });
          lightboxZoomRef.current = zoomNew;
          lightboxPanRef.current = { x: panX, y: panY };
        } else {
          // Fallback: zoom to 1.8x centered (no tap-point compensation)
          setLightboxZoom(zoomNew);
          setLightboxPan({ x: 0, y: 0 });
          lightboxZoomRef.current = zoomNew;
          lightboxPanRef.current = { x: 0, y: 0 };
        }
      }
    } else {
      lastTapRef.current = now;
    }
  }, []);

  // Keyboard nav — RTL-aware arrows: LTR ArrowLeft=prev / ArrowRight=next;
  // RTL (Persian) reversed ("previous" is to the right).
  React.useEffect(() => {
    if (!lightboxImg) return;
    const isRTL = document.documentElement.dir === "rtl" || document.documentElement.lang === "fa";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isRTL) lightboxNext(); else lightboxPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isRTL) lightboxPrev(); else lightboxNext();
      }
      // Escape closes the lightbox only — preventDefault keeps Radix
      // Dialog from also closing the modal underneath.
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setLightboxImg(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightboxImg, lightboxPrev, lightboxNext]);

  // ── Stable overlay handlers (useCallback, empty deps) ── they only use
  // refs + stable setters. RTL-aware arrow actions live inline (need `locale`).
  const handleOverlayPointerDown = React.useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      targetIsImage: imageWrapperRef.current
        ? imageWrapperRef.current.contains(e.target as Node)
        : false,
    };
  }, []);

  const handleOverlayPointerUp = React.useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dist = Math.hypot(dx, dy);
    // Close only on a real tap (< 8px) outside the image wrapper.
    if (dist < 8 && !start.targetIsImage) {
      setLightboxImg(null);
    }
  }, []);

  // Mouse-enter/move: show the X and arm a 2000ms hide timer.
  const handleOverlayMouseEnterOrMove = React.useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    setIsImgHovered(true);
    hideTimerRef.current = setTimeout(() => setIsImgHovered(false), 2000);
  }, []);

  // X-button click — stopPropagation so it doesn't trigger tap-to-close.
  const closeLightboxWithStop = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxImg(null);
  }, []);

  return (
    <DialogPrimitive.Root
      open={open}
      // Guard: while the lightbox is open, swallow modal-close attempts.
      onOpenChange={(nextOpen) => {
        if (!nextOpen && lightboxImg) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <AnimatePresence>
        {open && project && portalReady && (
          <DialogPrimitive.Portal forceMount>
            {/* Backdrop — hidden behind lightbox's opaque bg when open */}
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  transform: "translateZ(0)",
                  backfaceVisibility: "hidden",
                  willChange: "opacity",
                  outline: "1px solid transparent",
                }}
                className="modal-overlay-noise fixed inset-0 z-50 isolate bg-black/30 backdrop-blur-md"
              />
            </DialogPrimitive.Overlay>

            {/* Content */}
            <DialogPrimitive.Content
              asChild
              onPointerDownOutside={lightboxImg ? (e) => e.preventDefault() : undefined}
              onInteractOutside={lightboxImg ? (e) => e.preventDefault() : undefined}
            >
              <motion.div
                key={modalOpenKey}
                initial={{ opacity: 0, y: 16 }}
                // Panel opens immediately (not gated on the cover — slow
                // loads would look broken); the cover has its own gate below.
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                // After the entrance animation, start the inner staggered
                // content (with a small buffer for delayed first-opens).
                onAnimationComplete={() => {
                  if (!open) return;
                  // Clear willChange + transform after entrance so the
                  // browser can demote the element off its GPU layer — a
                  // persistent layer with non-`none` transform disables
                  // subpixel anti-aliasing in Chrome (subtle text blur).
                  const el = modalPanelRef.current;
                  if (el && !prefersReducedMotion) {
                    el.style.willChange = "auto";
                    el.style.transform = "none";
                    el.style.translate = "0 0";
                  }
                  if (prefersReducedMotion) {
                    setContentAnimate(true);
                    setGalleryReady(true);
                    return;
                  }
                  if (parentAnimationTimerRef.current) {
                    clearTimeout(parentAnimationTimerRef.current);
                  }
                  parentAnimationTimerRef.current = window.setTimeout(() => {
                    setContentAnimate(true);
                    setGalleryReady(true);
                    parentAnimationTimerRef.current = null;
                  }, 40); // small buffer to keep entrance snappy
                }}
                ref={modalPanelRef}
                // No willChange here — cleared in onAnimationComplete to
                // avoid a persistent GPU layer.
                style={{ borderWidth: 0 }}
                className={cn(
                  // Desktop centering via inset + margin:auto — NO
                  // transform (would promote a GPU layer and blur text).
                  "fixed inset-x-0 bottom-0 z-60 mx-auto flex w-full max-w-3xl flex-col rounded-t-[2rem] sm:inset-y-6 sm:inset-x-0 sm:m-auto sm:max-h-[calc(100vh-48px)] sm:rounded-[2rem]",
                  lightboxImg
                    ? "max-h-none overflow-hidden border-0 bg-transparent pointer-events-none"
                    : "max-h-[92vh] overflow-hidden bg-background shadow-2xl"
                )}
              >
                {/* Close button — hidden when lightbox is open. Entrance
                    gated on `coverMediaReady` (the panel is invisible
                    until then). */}
                {!lightboxImg && (
                  <DialogPrimitive.Close asChild>
                    <motion.button
                      type="button"
                      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.7 }}
                      animate={coverMediaReady ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute end-6 top-6 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-background/70 backdrop-blur transition-colors duration-300 hover:bg-secondary sm:end-8 sm:top-8 dark:border-white/10"
                      aria-label={t("portfolio.modal.close")}
                    >
                      <X className="h-5 w-5" />
                    </motion.button>
                  </DialogPrimitive.Close>
                )}

                {/* Scrollable body — hidden when lightbox is open. */}
                <div ref={scrollRef} className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-none", lightboxImg && "opacity-0 pointer-events-none")}>
                  {/* Cover — aperture reveal. Solid bg prevents flash
                      during the filter transition. */}
                  <div
                    style={{
                      backgroundColor: "var(--background)",
                      marginBottom: -2,
                      // GPU layer promotion ONLY during the reveal; dropped
                      // afterwards so the heavily downscaled cover renders
                      // on the main compositor layer (GPU layers can blur it).
                      ...(!coverRevealDone && !prefersReducedMotion
                        ? { transform: "translateZ(0)", backfaceVisibility: "hidden" as const }
                        : {}),
                    }}
                    className="relative aspect-[16/9] w-full compat-video-frame overflow-hidden rounded-t-[2rem] sm:rounded-t-[2rem]"
                  >
                    <motion.div
                      // Explicit initial/animate. When `coverRevealDone`,
                      // swap the animate target to `filter: "none"` /
                      // `scale: 1` — framer-motion applies these as inline
                      // styles, clearing the animation-time blur/scale.
                      //
                      // GATING on `coverMediaReady`: the aperture animation
                      // only runs AFTER the image/video has loaded; before
                      // that `animate` mirrors `initial` so the cover stays
                      // invisible + blurred until the media is ready.
                      initial={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, filter: "blur(24px) brightness(0.3)", scale: 1.08 }
                      }
                      animate={
                        prefersReducedMotion
                          ? coverMediaReady
                            ? { opacity: 1 }
                            : { opacity: 0 }
                          : coverRevealDone
                            ? { opacity: 1, scale: 1, filter: "none" }
                            : coverMediaReady
                              ? { opacity: 1, filter: "blur(0px) brightness(1)", scale: 1 }
                              : { opacity: 0, filter: "blur(24px) brightness(0.3)", scale: 1.08 }
                      }
                      transition={
                        prefersReducedMotion
                          ? { duration: 0.4, delay: 0.15 }
                          : coverRevealDone
                            ? { duration: 0 } // instant swap, no re-animation
                            : { duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }
                      }
                      onAnimationComplete={() => {
                        if (!prefersReducedMotion && !coverRevealDone && coverMediaReady) {
                          setCoverRevealDone(true);
                        }
                      }}
                      className="relative h-full w-full origin-center"
                    >
                      {isDevSolutions ? (
                        <video
                          src="/videos/dev-solutions-demo-optimized.webm"
                          poster="/images/Dev Solutions/Thumbnail.webp"
                          preload="metadata"
                          autoPlay
                          loop
                          muted
                          playsInline
                          onLoadedMetadata={() => {
                            requestAnimationFrame(() => setCoverMediaReady(true));
                          }}
                          onLoadedData={() => {
                            // Defer to next frame so framer-motion commits
                            // the hidden `initial` state before we flip to
                            // shown — cached re-opens can fire onLoad
                            // synchronously during mount and skip the reveal.
                            requestAnimationFrame(() => setCoverMediaReady(true));
                          }}
                          // Same safety net as the Image onError below.
                          onError={() => {
                            requestAnimationFrame(() => setCoverMediaReady(true));
                          }}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        /* next/image (NOT SmartImage) for the modal cover:
                         * 8K sources would blur under ~11× bilinear
                         * downscale in a plain <img>; next/image serves
                         * pre-sized variants. `sizes` reflects max-w-3xl
                         * (768px) desktop / 100vw mobile. The motion.div
                         * parent is `relative` so `fill` works. `onLoad`
                         * (network OR cache) gates the aperture via
                         * `coverMediaReady`; the rAF wrapper lets
                         * framer-motion mount with the hidden initial
                         * state first so cached re-opens still animate. */
                        <Image
                          key={`${project.id}-cover`}
                          src={project.cover}
                          alt={tt(project.title)}
                          fill
                          sizes="(max-width: 768px) 100vw, 768px"
                          quality={80}
                          priority
                          draggable={false}
                          onLoad={() => {
                            requestAnimationFrame(() => setCoverMediaReady(true));
                          }}
                          // Safety net: on load failure flip the flag anyway
                          // so the panel doesn't stay invisible forever.
                          onError={() => {
                            requestAnimationFrame(() => setCoverMediaReady(true));
                          }}
                          className="object-cover"
                        />
                      )}
                    </motion.div>
                    {/* Cover bottom fade. mafia-master & dev-solutions
                        (bright covers) get a taller + stronger black fade;
                        all others use `from-background` to blend into the
                        content area below. */}
                    <div
                      className={cn(
                        "modal-cover-fade pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent",
                        project.id === "mafia-master" || project.id === "dev-solutions"
                          ? "modal-cover-fade-strong h-2/3 from-black/95 via-black/60 via-black/25"
                          : "modal-cover-fade-soft h-1/2 from-background"
                      )}
                    />

                    {/* Project link — glass pill overlaid on the cover,
                        bottom corner opposite the reading direction.
                        Entrance gated on `coverMediaReady`. */}
                    {project.link && (
                      <motion.a
                        href={project.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.9 }}
                        animate={coverMediaReady ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.5, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                          "absolute bottom-4 z-20 inline-flex items-center gap-1.5 rounded-full",
                          "border border-white/15 bg-white/10 px-3.5 py-1.5",
                          "text-xs font-medium text-white backdrop-blur-md backdrop-saturate-150",
                          "[box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.15)]",
                          "transition-colors duration-300",
                          "hover:bg-white/25 hover:text-white hover:border-white/25",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                          // LTR → bottom-right; RTL → bottom-left.
                          locale === "fa" ? "left-4" : "right-4"
                        )}
                      >
                        <span>{tt(project.link.label)}</span>
                        <ArrowUpRight
                          className={cn(
                            "h-3.5 w-3.5",
                            // Mirror the arrow for RTL so it points in the
                            // reading direction.
                            locale === "fa" ? "-scale-x-100" : ""
                          )}
                        />
                      </motion.a>
                    )}
                  </div>

                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate={contentAnimate ? "show" : "hidden"}
                    className="flex flex-col gap-8 p-6 sm:p-8"
                  >
                    {/* Header */}
                    <motion.div variants={itemVariants}>
                      <DialogPrimitive.Title asChild>
                        <div className="flex flex-col gap-3">
                          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            {tt(project.title)}
                          </h2>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{tt(project.role)}</span>
                            <span className="inline-block h-3.5 w-0.5 shrink-0 bg-muted-foreground/40" />
                            <span>{tt(project.year)}</span>
                          </div>
                        </div>
                      </DialogPrimitive.Title>
                    </motion.div>

                    {/* Overview */}
                    <motion.div variants={itemVariants}>
                      <Section title={t("portfolio.modal.overview")}>
                        <p className="text-sm leading-relaxed text-foreground/80 sm:text-[15px]">
                          {tt(project.overview)}
                        </p>
                      </Section>
                    </motion.div>

                    {/* Tools (categorized) — only show when project has tools */}
                    {project.tools.length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Section title={t("portfolio.modal.tools")}>
                        <div className="flex flex-wrap gap-2">
                          {project.tools.map((tool) => (
                            <span
                              key={tool.name}
                              dir="ltr"
                              className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary dark:border-white/10"
                            >
                              <ToolIcon name={tool.name} className="h-4 w-4 shrink-0" />
                              {tool.name}
                            </span>
                          ))}
                        </div>
                      </Section>
                    </motion.div>
                    )}

                    {/* Gallery */}
                    <motion.div variants={itemVariants}>
                      <Section title={t("portfolio.modal.gallery")}>
                      <div dir={locale === "fa" ? "rtl" : "ltr"} className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3 sm:gap-2.5">
                        {project.gallery.map((img, i) => {
                          const galleryRatio = img.aspectRatio ?? 1.5;
                          const aspectStyle = !isDevSolutions
                            ? {
                                aspectRatio: String(galleryRatio),
                                "--gallery-padding": `${100 / galleryRatio}%`,
                              }
                            : undefined;

                          // ── Progressive batch loading ──
                          // Only images whose batch (floor(i/3)+1) is <=
                          // activeBatch get a real <img>; later batches
                          // render skeleton only (no network/decode work).
                          // The button is always clickable — a tap on a
                          // not-yet-loaded cell opens the lightbox, which
                          // loads the full image itself.
                          const imageBatch = Math.floor(i / GALLERY_BATCH_SIZE) + 1;
                          const isImageActive = imageBatch <= activeBatch;

                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setLightboxImg(img)}
                              className="gallery-item group/img relative w-full cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-secondary/30"
                            >
                              <div
                                className={cn(
                                  "relative w-full overflow-hidden compat-gallery-frame",
                                  isDevSolutions && "aspect-[16/9] compat-video-frame",
                                  isDevSolutions && { "--gallery-padding": "56.25%" }
                                )}
                                style={aspectStyle}
                              >
                                {isImageActive ? (
                                  isDevSolutions ? (
                                    /* ── Dev Solutions gallery thumbnail — optimized ──
                                       Source images are extremely heavy
                                       (5760×13820 = 1.5MB, ~320MB decoded
                                       bitmap per thumbnail). Route through
                                       /_next/image?url=...&w=640&q=80 so the
                                       server returns a pre-resized +
                                       recompressed variant (~4MB decoded).
                                       w=640 covers the 3-col grid cell (~240px,
                                       480px retina). Visually identical to
                                       the raw path at display size. */
                                    <DevSolutionsThumb
                                      src={img.src}
                                      alt={tt(img.alt)}
                                      isTallPortrait={
                                        img.aspectRatio !== undefined &&
                                        img.aspectRatio < 1
                                      }
                                      onLoad={makeGalleryOnLoad(imageBatch)}
                                    />
                                  ) : (
                                    <SmartImage
                                      src={img.src}
                                      alt={tt(img.alt)}
                                      natural
                                      aspectRatio={img.aspectRatio}
                                      skeleton
                                      gradientClassName={project.accent}
                                      className="absolute inset-0"
                                      imgClassName="transition-transform duration-500 ease-out group-hover/img:scale-[1.02]"
                                      onLoad={makeGalleryOnLoad(imageBatch)}
                                    />
                                  )
                                ) : (
                                  /* ── Inactive-batch placeholder ── no <img>
                                     → no network/decode work; pure skeleton
                                     shimmer until `activeBatch` advances. */
                                  <div
                                    className={cn(
                                      "absolute inset-0 skeleton-shimmer",
                                      isDevSolutions ? "h-full w-full" : undefined
                                    )}
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              {/* Dark overlay — fades in on hover.
                                  Pointer-events-none so it doesn't block
                                  the button click. */}
                              <div className="gallery-hover-overlay pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/img:bg-black/40" />
                              {/* Centered zoom icon — appears on hover. */}
                              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                                <span className="flex h-10 w-10 scale-90 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover/img:scale-100 group-hover/img:opacity-100">
                                  <ZoomIn className="h-5 w-5" />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      </Section>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>

      {/* ── Lightbox ── portaled to document.body (OUTSIDE the Radix
          Dialog Portal) to escape Radix's `react-remove-scroll` capture-
          phase touchmove lock, which would disable native touch-scroll on
          mobile. Close on: overlay tap outside the image, or the X button;
          image taps and drags never close. Tap = < 8px movement, and the
          overlay is `touch-action: pan-y` + `overscroll-contain`. */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {lightboxImg && project && (
              <motion.div
                key="lightbox-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  // ─── Lightbox overlay (unified mobile = desktop) ───
                  // Inner content uses `my-auto` (NOT `justify-center`)
                  // for centering: centers when there is free space, falls
                  // back to top-alignment when content overflows
                  // (`justify-center` + overflow cuts off the top).
                  // `overscroll-contain` prevents scroll chaining.
                  //
                  // ── touch-action: pan-y ── allows native vertical
                  // scrolling on the overlay but blocks native pinch-zoom,
                  // which we handle in JS on the <img> (touch-action: none).
                  // The overlay itself never scrolls — tall images expose
                  // their own scroll container.
                  "modal-overlay-noise fixed inset-0 z-[200] flex h-[100dvh] min-h-[100dvh] max-h-[100dvh] compat-lightbox-viewport flex-col items-center pt-6 pb-6 max-sm:pt-5 max-sm:pb-3 pointer-events-auto overflow-hidden overscroll-none scrollbar-none bg-black/30 backdrop-blur-md",
                  "max-sm:[touch-action:pan-y]"
                )}
              // Stop wheel events from reaching the document, where
              // `react-remove-scroll` (Radix Dialog) preventDefaults them
              // and kills native scroll on this overlay.
              onWheel={(e) => {
              // Consume wheel at the lightbox boundary so it can never
              // scroll the page behind.
                e.preventDefault();
                e.stopPropagation();
              }}
              // Same for touchmove — `react-remove-scroll` captures it at
              // the document level too.
              onTouchMoveCapture={stopPropagation}
              onPointerDown={handleOverlayPointerDown}
              onPointerUp={handleOverlayPointerUp}
              // ── X-button auto-show/hide (desktop) ── attached to the
              // overlay so the X reappears on mouse movement ANYWHERE in
              // the lightbox; hides after 2000ms idle; mobile uses the
              // [@media(hover:none)] CSS override.
              onMouseEnter={handleOverlayMouseEnterOrMove}
              onMouseMove={handleOverlayMouseEnterOrMove}
            >
              <div className="flex flex-col items-center my-auto">

                {/* Image — AnimatePresence mode="wait" so only the image
                    swaps with animation; the capsule stays put. */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={lightboxImg.src}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={cn(
                      // ── Image wrapper ── `w-full` for DevSolutions
                      // (inner container centers the 16:9 frame); `w-auto`
                      // otherwise so the overlay's items-center centers it.
                      "relative inline-block rounded-2xl overflow-hidden",
                      isDevSolutions ? "w-full" : "w-auto"
                    )}
                    ref={imageWrapperRef}
                    // NOTE: mouse enter/move handlers live on the overlay
                    // (parent) so the X shows on movement anywhere in the
                    // lightbox, not just over the image.
                  >
                    {/* Skeleton while the lightbox image loads. Shown ONLY
                        for non-DevSolutions (DevSolutions has its own —
                        rendering both caused a double skeleton). */}
                    {!isDevSolutions && (lightboxImgLoaded ? null : (
                      /* ── Non-Dev-Solutions skeleton — 9:16 portrait ──
                         Fills the lightbox's vertical budget
                         (calc(100vh-142px), mobile 112px); width derives
                         from the 9:16 ratio; max-w caps the width with
                         32px / 64px side margins. */
                      <div
                        className="skeleton-shimmer rounded-2xl h-[calc(100vh-142px)] max-sm:h-[calc(100vh-112px)] w-auto max-w-[calc(100vw-4rem)] sm:max-w-[calc(100vw-8rem)]"
                        style={{ aspectRatio: lightboxImg.aspectRatio ?? 0.46 }}
                        aria-hidden="true"
                      />
                    ))}

                    {/* Close button — desktop: visible while the mouse is
                        moving, auto-hides after idle; mobile: always
                        visible via [@media(hover:none)]. */}
                    <button
                      type="button"
                      onClick={closeLightboxWithStop}
                      onPointerDown={stopPropagation}
                      onPointerUp={stopPropagation}
                      className={cn(
                        "absolute top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/80",
                        locale === "fa" ? "left-3" : "right-3",
                        // Desktop: show/hide based on mouse activity
                        isImgHovered
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none",
                        // Mobile: always visible
                        "[@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto"
                      )}
                      aria-label={t("portfolio.modal.close")}
                    >
                      <X className="h-5 w-5" />
                    </button>

                    {/* "Double-tap to reset" hint — pill at bottom-center,
                        shows 8s after zoom > 1, auto-hides 3s later.
                        Never coexists with the scroll hint (that shows
                        only at zoom=1). STRUCTURE: outer wrapper handles
                        absolute positioning only (no transform); the inner
                        motion.div handles all animation — avoids
                        framer-motion's transform pipeline overriding CSS
                        centering. `px-16` prevents overlap with the X. */}
                    <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-30 flex justify-center px-16">
                      <AnimatePresence>
                        {zoomResetHintVisible && lightboxZoom > 1 && (
                          <motion.div
                            initial={
                              prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 8, scale: 0.96 }
                            }
                            animate={
                              prefersReducedMotion
                                ? { opacity: 1 }
                                : { opacity: 1, y: 0, scale: 1 }
                            }
                            exit={
                              prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 8, scale: 0.96 }
                            }
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 backdrop-blur-sm"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-white" />
                            <span className="text-xs font-medium text-white whitespace-nowrap">
                              {t("portfolio.modal.resetHint")}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {isDevSolutionsTall ? (
                      /* ── Tall Dev Solutions lightbox image ──
                         Tall screenshots (aspectRatio < 1) in a 16:9
                         "autofill" frame: image fills the frame width,
                         overflows height, user scrolls vertically
                         (overflow-y-auto + overscroll-contain +
                         touch-action: pan-y on the scroll frame).
                         A "scroll" hint slides in 1.5s after open and
                         out on first scroll. */
                      <div
                        className={cn(
                          "relative rounded-2xl overflow-hidden bg-black",
                          // ── Height-bound 16:9 frame ── height fills the
                          // lightbox's vertical budget (142px desktop /
                          // 112px mobile reserved space); aspect-video
                          // derives the width; max-w is a safety cap for
                          // narrow viewports (height still fills).
                          "h-[calc(100vh-142px)] aspect-video max-w-[calc(100vw-3rem)] max-sm:h-[calc(100vh-112px)]"
                        )}
                      >
                        {/* Scrollable inner container — holds the
                            full-height image; ref resets scrollTop on
                            image change. */}
                        <div
                          ref={lightboxScrollFrameRef}
                          // Keep native wheel scrolling inside this frame.
                          onWheel={(e) => e.stopPropagation()}
                          onScroll={(e) => {
                            // Dismiss the hint only after > 5px of scroll —
                            // filters sub-pixel adjustments from reflow /
                            // scroll-anchoring when the image loads.
                            if (e.currentTarget.scrollTop > 5) {
                              setScrollHintVisible(false);
                            }
                          }}
                          style={{
                            // Disable CSS scroll anchoring — Chrome's
                            // anchor adjustment when the tall image loads
                            // can fire a spurious scroll event that
                            // dismisses the hint.
                            overflowAnchor: "none",
                          }}
                          className={cn(
                            "absolute inset-0 overflow-y-auto scroll-smooth overscroll-contain scrollbar-none",
                            // `touch-action: pan-y` on the frame allows
                            // vertical scrolling but blocks native
                            // pinch-zoom; the <img> has its own
                            // `touch-action: none` for JS pinch/pan.
                            "[touch-action:pan-y]"
                          )}
                        >
                          {/* Skeleton while the tall image loads. */}
                          {lightboxImgLoaded ? null : (
                            <div
                              className="skeleton-shimmer absolute inset-0 rounded-2xl"
                              aria-hidden="true"
                            />
                          )}
                          <img
                            // w=1920 (NOT 828) — the frame is ~1668px wide on
                            // a 1920×1080 desktop; w=828 forced a 2× upscale
                            // → visible blur. Still ~9× smaller than the raw
                            // 320MB source bitmap.
                            src={optimizedSrc(lightboxImg.src, 1920, 80)}
                            alt={tt(lightboxImg.alt)}
                            // eager + async decode + high priority: the
                            // lightbox image is the focal point; async
                            // decoding keeps the main thread free for the
                            // entrance animation.
                            loading="eager"
                            decoding="async"
                            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                            fetchPriority="high"
                            className={cn(
                              // w-full → fills the frame width; h-auto →
                              // natural (tall) height overflows and creates
                              // scrollable content; block → no baseline gap.
                              "w-full h-auto block transition-opacity duration-300",
                              lightboxImgLoaded ? "opacity-100" : "opacity-0"
                            )}
                            draggable={false}
                            // ── Pinch-zoom + pan ── touch-action: none →
                            // JS receives all pointer events; the transform
                            // is a no-op at zoom=1, pan={0,0}.
                            style={{
                              touchAction: "none",
                              // ── GPU-layer optimization ── use
                              // `transform: "none"` (not a no-op
                              // translate/scale) at zoom=1 so the element
                              // is NOT promoted to a GPU layer — full-
                              // quality resampling on the main compositor
                              // layer, no subtle blur on heavy downscale.
                              // The `none` → `scale()` transition on
                              // double-tap still animates (CSS interpolates
                              // `none` as identity).
                              transform:
                                lightboxZoom !== 1 ||
                                lightboxPan.x !== 0 ||
                                lightboxPan.y !== 0
                                  ? `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`
                                  : "none",
                              transformOrigin: "center center",
                              // Smooth transition only while `zoomAnimating`
                              // (double-tap); manual pinch/pan tracks 1:1.
                              transition: zoomAnimating
                                ? "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)"
                                : "none",
                            }}
                            onPointerDown={onZoomPointerDown}
                            onPointerMove={onZoomPointerMove}
                            onPointerUp={onZoomPointerUp}
                            onPointerCancel={onZoomPointerUp}
                            onClick={onZoomDoubleTap}
                            onLoad={() => {
                               loadedLightboxSourcesRef.current.add(lightboxImg.src);
                               setLightboxImgLoaded(true);
                              setLightboxReady(true);
                            }}
                            onError={() => {
                               loadedLightboxSourcesRef.current.add(lightboxImg.src);
                               setLightboxImgLoaded(true);
                              setLightboxReady(true);
                            }}
                          />
                        </div>

                        {/* Scroll hint — slides in at bottom-center 1.5s
                            after open (soft animation, gentle exit drift).
                            STRUCTURE: outer wrapper handles positioning
                            only (no transform); inner motion.div handles
                            all animation — otherwise framer-motion's
                            transform pipeline would override CSS
                            translateX centering. */}
                        <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-30 flex justify-center">
                          <AnimatePresence>
                            {scrollHintVisible && (
                              <motion.div
                                initial={
                                  prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: 24, scale: 0.96 }
                                }
                                animate={
                                  prefersReducedMotion
                                    ? { opacity: 1 }
                                    : { opacity: 1, y: 0, scale: 1 }
                                }
                                exit={
                                  prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: 24, scale: 0.96 }
                                }
                                transition={{
                                  duration: 0.7,
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                                className="flex flex-col items-center gap-1.5"
                              >
                                <span className="text-sm font-medium text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]">
                                  {t("portfolio.modal.scrollHint")}
                                </span>
                                <motion.div
                                  animate={
                                    prefersReducedMotion
                                      ? undefined
                                      : { y: [0, 6, 0] }
                                  }
                                  transition={
                                    prefersReducedMotion
                                      ? undefined
                                      : {
                                          duration: 1.4,
                                          repeat: Infinity,
                                          ease: "easeInOut",
                                        }
                                  }
                                >
                                  <ChevronDown className="h-5 w-5 text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]" />
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ) : isDevSolutions ? (
                      /* ── Dev Solutions non-tall lightbox image ──
                         Landscape screenshots (ratio > 1). Fixed-height
                         container fills the vertical budget on all
                         breakpoints; `flex items-center justify-center`
                         centers the image within. */
                      <div className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl h-[calc(100vh-142px)] max-sm:h-[calc(100vh-112px)]">
                        {lightboxImgLoaded ? null : (
                          /* ── Non-tall Dev Solutions skeleton — 16:9
                             landscape; height-bound on all breakpoints,
                             width derived from 16:9, max-w-full. */
                          <div
                            className="skeleton-shimmer rounded-2xl h-[calc(100vh-142px)] max-sm:h-[calc(100vh-112px)] w-auto aspect-video max-w-full"
                            aria-hidden="true"
                          />
                        )}
                        <img
                          src={optimizedSrc(lightboxImg.src, 1920, 80)}
                          alt={tt(lightboxImg.alt)}
                          // eager + async decode + high priority; w=1920
                          // covers full-HD displays.
                          loading="eager"
                          decoding="async"
                          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                          fetchPriority="high"
                          className={cn(
                            // ── Non-tall DevSol image ── mobile: capped at
                            // width (32px margins), natural height; desktop:
                            // capped at container height and 64px margins.
                            "max-w-[calc(100vw-4rem)] w-auto h-auto block rounded-2xl transition-opacity duration-300 sm:max-h-full sm:max-w-[calc(100vw-8rem)]",
                            lightboxImgLoaded ? "opacity-100 relative z-10" : "absolute inset-0 opacity-0"
                          )}
                          draggable={false}
                          // ── Pinch-zoom + pan ── same logic as the
                          // tall-image variant above.
                          style={{
                            touchAction: "none",
                            // ── GPU-layer optimization ── `transform:
                            // "none"` at zoom=1 avoids a GPU layer and
                            // keeps full-quality resampling; the `none`
                            // → `scale()` transition still animates.
                            transform:
                              lightboxZoom !== 1 ||
                              lightboxPan.x !== 0 ||
                              lightboxPan.y !== 0
                                ? `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`
                                : "none",
                            transformOrigin: "center center",
                            transition: zoomAnimating
                              ? "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)"
                              : "none",
                          }}
                          onPointerDown={onZoomPointerDown}
                          onPointerMove={onZoomPointerMove}
                          onPointerUp={onZoomPointerUp}
                          onPointerCancel={onZoomPointerUp}
                          onClick={onZoomDoubleTap}
                          onLoad={() => {
                            loadedLightboxSourcesRef.current.add(lightboxImg.src);
                            setLightboxImgLoaded(true);
                            setLightboxReady(true);
                          }}
                          onError={() => {
                            loadedLightboxSourcesRef.current.add(lightboxImg.src);
                            setLightboxImgLoaded(true);
                            setLightboxReady(true);
                          }}
                        />
                      </div>
                    ) : (
                      <img
                        src={optimizedSrc(lightboxImg.src, 1920, 80)}
                        alt={tt(lightboxImg.alt)}
                        // eager + async decode + high priority; w=1920
                        // covers full-HD displays.
                        loading="eager"
                        decoding="async"
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                        fetchPriority="high"
                        className={cn(
                          // ── Non-Dev-Solutions image ── capped at
                          // max-h-[calc(100vh-142px)] (mobile 112px) so it
                          // always fits alongside the capsule; `w-auto`
                          // derives width from the capped height; max-w caps
                          // with 32px / 64px side margins.
                          "h-auto w-auto block max-h-[calc(100vh-142px)] max-sm:max-h-[calc(100vh-112px)] max-w-[calc(100vw-4rem)] sm:max-w-[calc(100vw-8rem)] transition-opacity duration-300",
                          lightboxImgLoaded ? "opacity-100" : "absolute inset-0 opacity-0"
                        )}
                        draggable={false}
                        // ── Pinch-zoom + pan ── same logic as the
                        // tall-image variant above.
                        style={{
                          touchAction: "none",
                          transform: `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`,
                          transformOrigin: "center center",
                          transition: zoomAnimating
                            ? "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)"
                            : "none",
                        }}
                        onPointerDown={onZoomPointerDown}
                        onPointerMove={onZoomPointerMove}
                        onPointerUp={onZoomPointerUp}
                        onPointerCancel={onZoomPointerUp}
                        onClick={onZoomDoubleTap}
                        onLoad={() => {
                          loadedLightboxSourcesRef.current.add(lightboxImg.src);
                          setLightboxImgLoaded(true);
                          setLightboxReady(true);
                        }}
                        onError={() => {
                          loadedLightboxSourcesRef.current.add(lightboxImg.src);
                          setLightboxImgLoaded(true);
                          setLightboxReady(true);
                        }}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Capsule — arrows + counter. Visibility driven by
                    `lightboxReady` (not per-image `lightboxImgLoaded`) so
                    it doesn't unmount/remount per slide; only the counter
                    text updates. The wrapper's 20px padding doubles as the
                    gap above and stops taps NEAR the capsule from
                    closing the lightbox. */}
                {lightboxTotal > 1 && (
                  <div
                    // ── Capsule wrapper ── `mt-0` + `p-5` = 20px safe area
                    // doubling as the gap above; `max-sm:pb-3` tightens the
                    // bottom padding on mobile.
                    className="mt-0 p-5 max-sm:pb-3"
                    onPointerDown={stopPropagation}
                    onPointerUp={stopPropagation}
                    onClick={stopPropagation}
                  >
                    {/* ── Capsule (slide nav) ── 48px tall on mobile
                        (max-sm:h-12), 58px on desktop; w-64 everywhere.
                        ── RTL-aware arrows ── the capsule is ALWAYS
                        dir="ltr" so ChevronLeft stays visually LEFT;
                        what changes per locale is the ACTION: LTR
                        ChevronLeft=prev, RTL ChevronLeft=next (Persian
                        reading flow: "previous" is to the right). */}
                    {lightboxReady ? (
                    <div dir="ltr" className="flex w-64 items-center justify-between rounded-full border border-white/20 bg-black/60 px-2 py-1.5 backdrop-blur-sm max-sm:h-12 max-sm:py-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); locale === "fa" ? lightboxNext() : lightboxPrev(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors duration-200 hover:text-white"
                        aria-label={locale === "fa" ? t("portfolio.modal.next") : t("portfolio.modal.previous")}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <span className="mx-2 h-5 w-px bg-white/20" />
                      {/* ── Slide counter — locale-aware direction ──
                          The counter span takes its dir from the locale so
                          users read it naturally: Persian `dir="rtl"` puts
                          the current number on the RIGHT ("1 از 9");
                          English `dir="ltr"` gives "1 of 9". `<bdi>`
                          wrappers isolate each number's bidi run so the
                          visual order is deterministic. */}
                      <span
                        dir={locale === "fa" ? "rtl" : "ltr"}
                        className="flex items-center gap-2 text-sm font-medium text-white/90"
                      >
                        <bdi>{lightboxIndex + 1}</bdi>
                        <span>{t("portfolio.modal.slideOf")}</span>
                        <bdi>{lightboxTotal}</bdi>
                      </span>
                      <span className="mx-2 h-5 w-px bg-white/20" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); locale === "fa" ? lightboxPrev() : lightboxNext(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors duration-200 hover:text-white"
                        aria-label={locale === "fa" ? t("portfolio.modal.previous") : t("portfolio.modal.next")}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </div>
                    ) : (
                      <div
                        className="skeleton-shimmer h-[58px] w-64 rounded-full border border-white/10 max-sm:h-12"
                        aria-label="Loading image controls"
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </DialogPrimitive.Root>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ── DevSolutionsThumb ── optimized gallery thumbnail for Dev Solutions.
   Its source screenshots are extremely heavy (up to 5760×13820, ~320MB
   decoded bitmap each), so this routes through /_next/image w=640 q=80
   (server-resized + recompressed → ~4MB decoded) instead of loading the
   raw URL like SmartImage. Visually identical at thumbnail size: same
   16:9 cell, object-cover / object-top crop, hover zoom, skeleton,
   fade-in. Hydration-gap fix: on mount, flip to loaded for
   already-complete (cached) images so the batch counter advances.
   React.memo keeps thumbnails from re-rendering during pinch-zoom
   (onLoad is stabilized via `makeGalleryOnLoad`). */
const DevSolutionsThumb = React.memo(function DevSolutionsThumb({
  src,
  alt,
  isTallPortrait,
  onLoad,
}: {
  src: string;
  alt: string;
  isTallPortrait: boolean;
  onLoad?: () => void;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Hydration gap fix — cached images may already be complete on mount.
  React.useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
      onLoad?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Skeleton while loading; removed from the DOM once loaded. */}
      {!loaded && (
        <div className="absolute inset-0 skeleton-shimmer" aria-hidden="true" />
      )}
      <img
        ref={imgRef}
        src={optimizedSrc(src, 640, 80)}
        alt={alt}
        // lazy + async decode + low priority — the gallery is below the
        // fold and must not compete with the cover for bandwidth.
        loading="lazy"
        decoding="async"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        fetchPriority="low"
        draggable={false}
        className={cn(
          // Same structure as SmartImage (relative + h-full w-full +
          // object-cover) so the 16:9 crop behavior is identical.
          "relative h-full w-full object-cover",
          // Hide until loaded. Note: `transition-transform` below wins
          // over `transition-opacity`, so the image pops in (no fade) —
          // matching the existing gallery behavior exactly.
          !loaded && "opacity-0",
          loaded && "opacity-100 transition-opacity duration-300",
          // Hover zoom — same as every other gallery cell.
          "transition-transform duration-500 ease-out group-hover/img:scale-[1.02]",
          // `object-top` shows the TOP of tall portrait screenshots;
          // landscape stays centered (default).
          isTallPortrait ? "object-top" : ""
        )}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          // Treat errors as "done" so the batch counter still advances.
          setLoaded(true);
          onLoad?.();
        }}
      />
    </div>
  );
});
