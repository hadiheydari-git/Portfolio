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

/** Build a Next.js Image Optimization URL for a heavy source image.
 *
 *  WHY THIS EXISTS — Dev Solutions gallery images 1 and 3 are extremely
 *  heavy (5760×13820 = 1.5MB, and 5760×8012 = 775KB). A plain <img>
 *  forces the browser to:
 *    1. Download the full 1.5MB / 775KB payload.
 *    2. Allocate a decoded bitmap at native resolution (~320MB for the
 *       5760×13820 image!) before it can be downscaled for display.
 *    3. Decode that bitmap on the main thread, blocking the gallery's
 *       fade-in animation and causing the modal to feel janky / stuck.
 *
 *  Using `/_next/image?url=...&w=...&q=...` makes the server return a
 *  pre-resized + recompressed variant. At w=640 the 1.5MB image becomes
 *  ~80KB and the decoded bitmap is ~4MB instead of ~320MB — decode time
 *  drops from hundreds of ms to ~10ms. No visual difference in the
 *  lightbox (the displayed image is also ~640-800px wide) but a huge
 *  performance win.
 *
 *  PARAMETERS:
 *  - `w` (width): the maximum display width. For the tall-image scroll
 *    frame, the inner <img> is rendered at w-full of a frame whose
 *    width is constrained by `max-w-[calc(100vw-3rem)]`. On a typical
 *    desktop that's ~700-900px. w=828 gives a comfortable retina-quality
 *    variant. For the standard landscape branch, w=1920 covers full-HD.
 *  - `q` (quality): 80 — same as bento-card covers.
 *
 *  URL ENCODING: Next.js's image optimizer requires the `url` query
 *  parameter to be URL-encoded (so `/images/Dev Solutions/...` becomes
 *  `%2Fimages%2FDev%20Solutions%2F...`). We use encodeURIComponent on
 *  the already-encoded path so spaces, ampersands, and slashes are
 *  properly escaped in the query string.
 */
function optimizedSrc(src: string, width: number, quality: number = 80): string {
  const encoded = encodeURIComponent(encodeSrc(src));
  return `/_next/image?url=${encoded}&w=${width}&q=${quality}`;
}

/* Stable no-op stopPropagation handler — used as `onWheelCapture` and
 * `onTouchMoveCapture` on the lightbox overlay. Defining it ONCE at
 * module scope (rather than as an inline arrow function in JSX) means
 * React's reconciler sees the SAME function reference on every render
 * and skips re-attaching the DOM event listener. Tiny win per render,
 * but during pinch-zoom (hundreds of re-renders per second) it adds up. */
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

/* ── Gallery batch size (module-level constant) ───────────────────────
   Promoted to module scope so the value is stable across renders.
   Previously lived inside the component body, which created a fresh
   const on every render and made the batch-advancement effect's
   dependency array look like it depended on a non-stable value.
   The effect itself already excluded it via the array, but lifting
   it removes any ambiguity for future maintainers and lets the
   compiler treat it as a true constant. */
const GALLERY_BATCH_SIZE = 3;

/* ── Modal content stagger animation ──────────────────────────────────
   The modal container scales+fades in (handled below). Inside, each
   section (header, overview, role, tools, gallery) fades up one by
   one with a 80ms stagger, starting 250ms after the container settles.
   This creates a smooth, progressive "content builds up" feel. */

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

/* ── Cover aperture reveal ───────────────────────────────────────────
   Thumbnail enters with a camera-lens "aperture" feel: blurred, dimmed,
   and slightly zoomed, then sharpens to full clarity. */

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

// Post-reveal variant — used after the aperture animation completes.
// Explicitly sets `filter: "none"` (NOT omitted) because framer-motion
// does NOT clear properties that are absent from the new variant — it keeps
// the last animated value. So we must explicitly override `filter` to "none"
// to disable the filter pipeline (which otherwise stays active as
// `blur(0px) brightness(1)` and can render with a hair of softness on some
// Chromium versions). Also drops `scale` to avoid a persistent transform.
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
  // Controls when the interior staggered content should begin animating.
  // We wait for the container's entrance animation to finish so child
  // content (especially images) does not participate in the open.
  const [contentAnimate, setContentAnimate] = React.useState(
    () => prefersReducedMotion
  );
  const [galleryReady, setGalleryReady] = React.useState(
    () => prefersReducedMotion
  );
  const [portalReady, setPortalReady] = React.useState(false);
  const [modalOpenKey, setModalOpenKey] = React.useState(0);
  // When true, the cover aperture reveal has finished and we strip the
  // `filter: blur(0px) brightness(1)` from the cover motion.div. Framer-motion
  // re-applies variant values on re-render, so we can't just imperatively
  // clear the inline style — instead we swap to a variant without `filter`
  // once the animation is done, letting the browser render the cover at
  // full native sharpness.
  const [coverRevealDone, setCoverRevealDone] = React.useState(false);
  // True once the cover image/video has finished loading. The aperture
  // reveal animation is GATED on this — without it, on first open the
  // motion.div animates from blur(24px)→blur(0px) while the image is
  // still loading, so the user never sees the blur transition; the
  // image just pops in suddenly once it loads (by which point blur is
  // already at 0). By waiting for `coverMediaReady`, the aperture
  // effect runs WITH the image visible, producing the intended
  // camera-lens reveal on first open AND on cached re-opens.
  const [coverMediaReady, setCoverMediaReady] = React.useState(false);
  const openSequenceRef = React.useRef(0);
  // Timer ref used to delay starting child animations until after the
  // container's entrance animation completes (handles slow-first-open).
  const parentAnimationTimerRef = React.useRef<number | null>(null);
  const [lightboxImg, setLightboxImg] = React.useState<GalleryImage | null>(null);
  // ── Derived lightbox values (memoized) ──
  // `lightboxIndex` is computed via `indexOf` on `project.gallery` (a stable
  // array reference), so the result is stable across re-renders UNLESS the
  // displayed image actually changes. Memoizing prevents re-computing on
  // every state change (e.g. during pinch-zoom, when `lightboxZoom` /
  // `lightboxPan` update hundreds of times per second).
  // `lightboxTotal` and `isDevSolutions` are similarly stable per project.
  const lightboxIndex = React.useMemo(
    () => lightboxImg && project ? project.gallery.indexOf(lightboxImg) : -1,
    [lightboxImg, project]
  );
  const lightboxTotal = project?.gallery.length ?? 0;
  const isDevSolutions = project?.id === "dev-solutions";
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const imageWrapperRef = React.useRef<HTMLDivElement>(null);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to the modal panel motion.div — used in onAnimationComplete to clear
  // the post-animation transform + willChange so the browser can demote the
  // element off its GPU compositor layer. A persistent GPU layer with any
  // non-`none` transform disables subpixel anti-aliasing for text in Chrome,
  // producing the "subtle blur" effect users see on modal text.
  const modalPanelRef = React.useRef<HTMLDivElement>(null);
  // Tracks the pointer-down position on the lightbox overlay so we can
  // distinguish a real tap (< 8px movement → close) from a touch-drag
  // (≥ 8px movement → do nothing, let the browser scroll the image).
  // Also records whether the pointer started INSIDE the image wrapper
  // — tapping the image itself should never close the lightbox (only
  // the X button or the overlay background should).
  const pointerDownRef = React.useRef<{
    x: number;
    y: number;
    pointerId: number;
    targetIsImage: boolean;
  } | null>(null);
  // True once the currently-displayed lightbox image has finished
  // loading. Reset to false whenever the displayed image changes so
  // the skeleton placeholder shows/hides correctly (per-image).
  const [lightboxImgLoaded, setLightboxImgLoaded] = React.useState(false);
  // True once ANY image has loaded in the current lightbox session.
  // Unlike `lightboxImgLoaded`, this does NOT reset when the user
  // navigates between slides — it stays true for the entire session
  // so the capsule (prev/next/counter) doesn't animate (unmount/remount)
  // on each slide change. Only resets when the lightbox closes.
  const [lightboxReady, setLightboxReady] = React.useState(false);
  // Controls X-button visibility on desktop. True ONLY while the mouse
  // is actively moving over the image; auto-set to false after 1s of no
  // movement. On mobile (hover:none devices) the X is always visible
  // via a CSS media-query override.
  // IMPORTANT: this is NOT set to true on slide change — the X must
  // remain hidden until the user actually moves the mouse over the
  // new image. Only `onMouseEnter` / `onMouseMove` on the image
  // wrapper set this to true.
  const [isImgHovered, setIsImgHovered] = React.useState(false);

  // ── Tall-image scrollable frame (Dev Solutions images 1 & 3) ──────
  // These two screenshots are very tall portraits (aspectRatio < 1).
  // In the lightbox they get a SPECIAL 16:9 "autofill" frame: the image
  // fills the frame's width, its natural height overflows the frame, and
  // the user can scroll VERTICALLY inside the frame to pan through the
  // full screenshot. This is the only place in the lightbox where we
  // intentionally crop height + enable internal scroll.
  //
  // A "scroll" hint (text + chevron-down) slides in at the bottom-center
  // of the frame 1.5s after the lightbox opens, and slides OUT (downward,
  // exiting from the bottom of the image) as soon as the user starts
  // scrolling inside the frame.
  const [scrollHintVisible, setScrollHintVisible] = React.useState(false);
  const [scrollAvailable, setScrollAvailable] = React.useState(false);
  const lightboxScrollFrameRef = React.useRef<HTMLDivElement>(null);
  const scrollHintTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Lightbox pinch-zoom + pan (mobile) ──
  // Custom JS-based pinch-to-zoom and one-finger pan for lightbox images.
  //
  // WHY NOT use the browser's native pinch-zoom (touch-action: pinch-zoom)?
  // Native pinch-zoom creates a "visual viewport" zoom. After zooming, a
  // one-finger drag is supposed to pan the visual viewport — BUT if there's
  // a scrollable container (overflow-y-auto) under the touch, the browser
  // scrolls that container instead of panning the zoomed view. Our lightbox
  // overlay is overflow-y-auto (for tall images), so native pinch-zoom +
  // one-finger pan was broken: the user could zoom in with 2 fingers but
  // couldn't pan around with 1 finger.
  //
  // By handling pinch-zoom in JS via Pointer Events, we get full control:
  //   - 2 fingers: pinch to zoom (1x to 5x), zooms toward pinch center
  //   - 1 finger (when zoomed > 1x): pan in any direction (2D)
  //   - 1 finger (when zoom = 1x): normal behavior — for tall images,
  //     scrolls the frame vertically; for others, does nothing (tap closes)
  //
  // touch-action: none on the <img> tells the browser NOT to handle any
  // touch gesture natively, so JS receives all pointer events.
  const [lightboxZoom, setLightboxZoom] = React.useState(1);
  const [lightboxPan, setLightboxPan] = React.useState({ x: 0, y: 0 });
  const zoomPointersRef = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  // ── Pinch gesture start state ──
  // Instead of tracking the PREVIOUS finger distance (per-event ratio,
  // which amplifies finger wobble into zoom jitter), we track the
  // distance + zoom level at the MOMENT the 2-finger pinch began.
  //
  // Each pointermove then computes: newZoom = startZoom * (curDist / startDist).
  // This makes zoom a direct function of absolute finger distance, so
  // micro-wobbles produce proportionally tiny zoom changes (not sudden
  // reversals). See `onZoomPointerMove` for the full rationale.
  const pinchStartDistRef = React.useRef<number | null>(null);
  const pinchStartZoomRef = React.useRef<number | null>(null);
  const lastPanPointRef = React.useRef<{ x: number; y: number } | null>(null);
  // Read current zoom in pointer handlers without re-creating callbacks
  const lightboxZoomRef = React.useRef(1);
  React.useEffect(() => { lightboxZoomRef.current = lightboxZoom; }, [lightboxZoom]);
  // Read current pan in pointer handlers without re-creating callbacks.
  // Needed for pinch-anchor math: when pinch-zooming, we compute the new
  // pan from the old pan + the pinch midpoint, so we need the LATEST pan
  // value synchronously (state may be stale within the same frame).
  const lightboxPanRef = React.useRef({ x: 0, y: 0 });
  React.useEffect(() => { lightboxPanRef.current = lightboxPan; }, [lightboxPan]);

  // ── Cached image dimensions for clamp math + pinch anchor ──
  // Stores the image's natural rendered size (offsetWidth/Height), its
  // container's size, AND the image's natural center in screen coords —
  // all captured ONCE at the start of each gesture (in
  // `onZoomPointerDown`). This avoids expensive forced-layout reads on
  // every pointer-move event, which was the main cause of lag during
  // rapid pinch-zoom.
  //
  // `natCenterX/Y` = the image's center position on screen BEFORE any
  // transform. This is the anchor point for pinch-zoom: when the user
  // pinches at midpoint M, the image point under M stays under M as zoom
  // changes. Computed as:
  //   natCenter = transformedRectCenter - currentPan
  // because `transform: translate(pan) scale(zoom)` shifts the natural
  // center by exactly `pan` (scaling around center doesn't move the
  // center).
  //
  // `offsetWidth/Height` are LAYOUT properties — they reflect the
  // element's box size BEFORE any CSS transform. Scaling an element
  // via `transform: scale()` does NOT change its `offsetWidth`, so
  // these cached values remain valid for the entire gesture regardless
  // of how much the user zooms.
  const imgDimsRef = React.useRef<{
    imgW: number;
    imgH: number;
    contW: number;
    contH: number;
    natCenterX: number;
    natCenterY: number;
  } | null>(null);

  // ── Smooth zoom animation for double-tap ──
  // When `zoomAnimating` is true, a CSS `transition: transform 0.3s` is
  // applied to the <img>, so double-tap zoom-in/out animates smoothly
  // instead of jumping instantly. Set to true by `onZoomDoubleTap`, auto-
  // reset to false after 350ms (slightly longer than the 300ms transition
  // to ensure the transition completes before disabling). Also reset to
  // false immediately if the user starts a manual gesture (pinch/pan) —
  // see `onZoomPointerDown` for the mid-animation visual-state sync that
  // prevents jumps when a gesture interrupts an animation.
  const [zoomAnimating, setZoomAnimating] = React.useState(false);
  const zoomAnimTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startZoomAnimation = React.useCallback(() => {
    setZoomAnimating(true);
    if (zoomAnimTimerRef.current) clearTimeout(zoomAnimTimerRef.current);
    // 500ms = 450ms transition + 50ms buffer. The transition must
    // complete before we remove it, otherwise the transform would jump
    // mid-animation when `zoomAnimating` flips back to false.
    zoomAnimTimerRef.current = setTimeout(() => setZoomAnimating(false), 500);
  }, []);

  // ── "Double-tap to reset" hint ──
  // Shows a small pill at the BOTTOM-center of the lightbox image after
  // the user has been zoomed in (zoom > 1) for 8 seconds. The 8s delay
  // gives the user time to explore the zoomed image first, then gently
  // reminds them they can double-tap to return to 1x. Auto-hides after
  // 3s. Re-shows (after another 8s delay) if the user zooms in again
  // after returning to 1x.
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

  // ── Progressive gallery batch loading ──
  // Gallery images load in sequential batches of GALLERY_BATCH_SIZE (3),
  // starting from the top. Batch 1 = images 0-2, Batch 2 = images 3-5, etc.
  // The next batch does NOT start loading until the current batch's images
  // have all finished loading (or errored). This limits simultaneous
  // network requests + image-decode work, keeping the modal snappy on
  // lower-end devices.
  //
  // - `activeBatch` (1-indexed): which batch is currently allowed to load.
  //   Images in batches < activeBatch are already loaded (stay rendered).
  //   Images in batch === activeBatch render SmartImage and report load.
  //   Images in batches > activeBatch render a skeleton placeholder only
  //   (no <img>, so no network request) until their batch becomes active.
  // - `loadedInBatchCount`: how many images in the current active batch
  //   have finished loading. When this reaches the batch's expected size,
  //   we advance to the next batch and reset the counter.
  const [activeBatch, setActiveBatch] = React.useState(1);
  const [loadedInBatchCount, setLoadedInBatchCount] = React.useState(0);

  // ── Stable gallery batch-loaded callback ──
  // Each gallery cell (DevSolutionsThumb and SmartImage) gets this SAME
  // callback reference (via the memoized `makeGalleryOnLoad` factory).
  // Without memoization, every parent re-render would create a NEW closure
  // for each cell's onLoad, which would:
  //   1. Cause React.memo on DevSolutionsThumb to see a new prop and bail
  //      out of memoization, re-rendering every thumbnail on every parent
  //      state change (e.g. during pinch-zoom in the lightbox, when the
  //      parent re-renders hundreds of times per second).
  //   2. Re-create the <img>'s onLoad handler inside SmartImage, which is
  //      harmless but wasteful.
  //
  // The factory returns a stable callback per (batch, activeBatch) pair.
  // When `activeBatch` advances, new factory closures are produced — but
  // only the cells in the new batch change; cells in earlier batches have
  // already loaded and their onLoad won't fire again anyway.
  //
  // IMPORTANT — the closure captures `imageBatch` and `activeBatch` at
  // creation time. We only count the load if `imageBatch === activeBatch`.
  // If the parent re-renders with a new `activeBatch`, only the cells in
  // the new active batch will see a matching condition — exactly the
  // intended progressive-loading behavior.
  const makeGalleryOnLoad = React.useCallback(
    (imageBatch: number) => () => {
      // Use the functional updater so we don't add `activeBatch` as a dep
      // — the closure reads the LATEST activeBatch via a ref.
      if (imageBatch === activeBatchRef.current) {
        setLoadedInBatchCount((c) => c + 1);
      }
    },
    []
  );
  // Mirror `activeBatch` into a ref so the memoized callback above can
  // read the latest value without being recreated on every batch advance.
  // Otherwise `makeGalleryOnLoad` would be recreated on every batch change,
  // defeating the memoization of DevSolutionsThumb.
  const activeBatchRef = React.useRef(activeBatch);
  React.useEffect(() => {
    activeBatchRef.current = activeBatch;
  }, [activeBatch]);

  // True when the current lightbox image is a tall Dev Solutions
  // screenshot (aspectRatio < 1) — i.e. image 1 (0.417) or image 3 (0.719).
  // These are the ONLY two images that get the 16:9 scrollable frame.
  //
  // MEMOIZED — `lightboxImg` is a stable object reference from project.gallery
  // (same array index returned on each render), so the memoization cache hits
  // whenever the displayed image hasn't changed. This prevents re-computing
  // the boolean on every parent re-render (e.g. during pinch-zoom, when
  // `lightboxZoom` / `lightboxPan` change hundreds of times per second).
  const isDevSolutionsTall = React.useMemo(
    () =>
      isDevSolutions &&
      lightboxImg?.aspectRatio !== undefined &&
      lightboxImg.aspectRatio < 1,
    [isDevSolutions, lightboxImg]
  );

  // ── Lightbox navigation callbacks ──
  // Both rely only on `project.gallery` (a stable array reference from the
  // project object) and the current `lightboxImg`. Instead of tracking
  // `lightboxIndex` / `lightboxTotal` (which add reactive deps and force
  // the callback to be recreated on every slide change), we look up the
  // current index INSIDE the callback via `indexOf`. This keeps the
  // callbacks stable across lightbox navigation — preventing downstream
  // effects (like the keyboard handler below) from re-subscribing on
  // every arrow press.
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

  // Reset lightbox when modal closes.
  // Both `lightboxImgLoaded` AND `lightboxReady` reset here so the
  // next time the user opens the lightbox, the skeleton + capsule
  // behave correctly from scratch. `isImgHovered` resets to false so
  // the X starts hidden when the lightbox re-opens.
  React.useEffect(() => {
    if (!open) {
      requestAnimationFrame(() => {
        setLightboxImg(null);
        setIsImgHovered(false);
        setLightboxImgLoaded(false);
        setLightboxReady(false);
        // Also clear the tall-image scroll-hint timer + state so a
        // stale timer doesn't fire after the lightbox has closed and
        // leak the hint into the next open.
        setScrollHintVisible(false);
        if (scrollHintTimerRef.current) {
          clearTimeout(scrollHintTimerRef.current);
          scrollHintTimerRef.current = null;
        }
        // Also clear the zoom-reset hint timer + state so a stale timer
        // doesn't fire after the lightbox has closed and leak the hint
        // into the next open.
        setZoomResetHintVisible(false);
        if (zoomResetHintTimerRef.current) {
          clearTimeout(zoomResetHintTimerRef.current);
          zoomResetHintTimerRef.current = null;
        }
        if (zoomResetHideTimerRef.current) {
          clearTimeout(zoomResetHideTimerRef.current);
          zoomResetHideTimerRef.current = null;
        }
        // Also cancel any in-progress double-tap zoom animation so a
        // stale timer doesn't fire after the lightbox has closed.
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
      // Reset gallery batch loading so the next open starts fresh from
      // batch 1. Without this, reopening the modal would inherit the
      // previous activeBatch and skip the progressive loading.
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
    // Reset gallery batch loading on project change too — different
    // projects have different galleries and we want each to start from
    // batch 1.
    setActiveBatch(1);
    setLoadedInBatchCount(0);
    // Defensive: reset `coverRevealDone` on OPEN too, not just on close.
    // If the user reopens the modal quickly (before the close-reset has
    // fully propagated), `coverRevealDone` could still be `true` from the
    // previous open. The newly-mounted cover motion.div would then see
    // `animate = { opacity: 1, scale: 1, filter: "none" }` with
    // `transition: { duration: 0 }` — skipping the aperture animation
    // entirely. This is the root cause of the "cover animation sometimes
    // doesn't run on 2nd/3rd open" bug.
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

  // Per-slide reset: when the displayed image changes, reset the
  // per-image loaded flag (so the skeleton shows for the new image)
  // and clear any pending X-button auto-hide timer.
  // IMPORTANT:
  //  - `lightboxReady` is intentionally NOT reset — it stays true for
  //    the entire session so the capsule doesn't unmount/remount.
  //  - `isImgHovered` is intentionally NOT set to true here. The X
  //    button must NOT auto-appear on slide change — it should only
  //    appear when the user actually moves the mouse over the image
  //    (via onMouseEnter / onMouseMove on the image wrapper).
  //  - We DO clear the auto-hide timer so a stale timer from the
  //    previous image doesn't fire and hide the X while the user is
  //    actively moving the mouse over the new image.
  React.useEffect(() => {
    requestAnimationFrame(() => {
      setLightboxImgLoaded(false);
    });
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [lightboxImg?.src]);

  // ── Tall-image scroll hint + frame scroll-position reset ─────────
  // For the two TALL Dev Solutions screenshots (aspectRatio < 1), the
  // lightbox renders them inside a 16:9 "autofill" frame whose height
  // crops the image and lets the user scroll VERTICALLY inside the frame
  // to pan through the full screenshot.
  //
  // This is split into TWO effects for robustness:
  //
  // Effect A (runs on every image change):
  //   - Resets `scrollHintVisible` to false.
  //   - Clears any pending hint timer.
  //   - Resets the frame's `scrollTop` to 0 (so navigating between two
  //     tall images starts the new one at the top).
  //
  // Effect B (runs when image is loaded AND it's a tall image):
  //   - Starts a 1500ms timer.
  //   - When the timer fires, `scrollHintVisible` flips to true and the
  //     "scroll" hint slides in at the bottom-center of the frame.
  //
  // WHY gate the timer on `lightboxImgLoaded` (not just on image change):
  //   The tall image is loaded via a plain <img>. On FIRST open (uncached),
  //   the image can take >1.5s to load. If the timer started at click time
  //   (image change), it would fire while the skeleton is still showing —
  //   and then when the image finally loads, the dramatic content-height
  //   change (0 → very tall) can trigger spurious scroll events in some
  //   browsers (scroll-anchoring, reflow), which immediately dismiss the
  //   hint via the `onScroll` handler. The user would never see it.
  //
  //   By gating on `lightboxImgLoaded`, the timer starts ONLY after the
  //   image is actually visible. The hint then appears 1.5s after the
  //   image is visible (≈ 1.5s after lightbox open for cached images).
  //   No content-height change can happen after this point, so no
  //   spurious scroll event can dismiss the hint before the user sees it.
  //
  // The hint is dismissed (slides out softly) the moment the user scrolls
  // more than 5px inside the frame — handled by the `onScroll` callback
  // on the frame element (the 5px threshold filters out sub-pixel scroll
  // adjustments from browser reflow).

  // Effect A — reset on image change.
  React.useEffect(() => {
    setScrollHintVisible(false);
    setScrollAvailable(false);
    if (scrollHintTimerRef.current) {
      clearTimeout(scrollHintTimerRef.current);
      scrollHintTimerRef.current = null;
    }
    // Reset scroll position to top — applies to ALL images (harmless for
    // non-tall images because their frame ref is null), but ESSENTIAL
    // when navigating between two tall images so the new one starts at
    // the top instead of inheriting the previous scroll offset.
    if (lightboxScrollFrameRef.current) {
      lightboxScrollFrameRef.current.scrollTop = 0;
    }
  }, [lightboxImg?.src]);

  // Effect — measure whether vertical scroll is actually possible inside
  // the tall image's frame. If the frame is so tall that the image fits
  // entirely without overflow, there's nothing to scroll, so we keep
  // `scrollAvailable = false` and the hint timer (Effect B below) never
  // fires — the "Scroll" hint never appears.
  //
  // This handles the mobile-portrait edge case: on a tall narrow phone,
  // the frame's height (calc(100vh - 112px)) can exceed the image's
  // rendered height (frameWidth / aspectRatio), so the image fits inside
  // the frame without overflowing. For example, on an iPhone 14 (390×844):
  //   - Frame width: 390 - 48 = 342px
  //   - Frame height: 844 - 112 = 732px
  //   - Image 1 (aspectRatio 0.417) rendered height: 342 / 0.417 = 820px → overflow
  //   - On a smaller image with aspectRatio ~0.5, rendered height would be
  //     684px → FITS inside the 732px frame → no scroll possible.
  //
  // The check uses requestAnimationFrame to ensure the image's full
  // height is laid out before measuring. We also re-check on window
  // resize (e.g., device rotation, browser UI show/hide) so the
  // availability state stays in sync with the actual frame size.
  //
  // +4px tolerance filters out sub-pixel rounding differences between
  // scrollHeight and clientHeight that don't represent real overflow.
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

    // Check on next frame to ensure layout is settled.
    const id = requestAnimationFrame(check);

    // Re-check on resize (device rotation, browser UI show/hide).
    window.addEventListener("resize", check);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", check);
    };
  }, [isDevSolutionsTall, lightboxImgLoaded, lightboxImg?.src]);

  // Effect B — start the 1.5s hint timer once the tall image has loaded
  // AND vertical scroll is actually possible. If the image fits entirely
  // inside the frame (no overflow), `scrollAvailable` stays false and the
  // timer never starts — the "Scroll" hint never appears.
  React.useEffect(() => {
    if (!isDevSolutionsTall || !lightboxImgLoaded || !scrollAvailable) return;

    // 1500ms delay before the hint slides in — counted from when the
    // image is VISIBLE (loaded), not from click time. This matches the
    // user's spec: "وقتی لایت باکس باز میشه پس از یک و نیم ثانیه
    // اسکرول کنید بیاد" = "when the lightbox opens, after 1.5s, the
    // scroll hint should appear"
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

  // ── Gallery batch advancement ──
  // When all images in the current active batch have loaded (or errored),
  // advance to the next batch so its images can start loading. The last
  // batch may have fewer than GALLERY_BATCH_SIZE images — we compute the
  // expected size from the gallery length.
  //
  // Example: gallery of 8 images, BATCH_SIZE=3
  //   - Batch 1 (images 0-2): expected 3 → when 3 loaded, advance to batch 2
  //   - Batch 2 (images 3-5): expected 3 → when 3 loaded, advance to batch 3
  //   - Batch 3 (images 6-7): expected 2 → when 2 loaded, no more batches
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

  // ── Lightbox zoom/pan: reset on image change ──
  // When the user navigates to a different lightbox image (or closes the
  // lightbox), reset zoom and pan so the new image starts at 1x, centered.
  React.useEffect(() => {
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    lightboxZoomRef.current = 1;
    lightboxPanRef.current = { x: 0, y: 0 };
    zoomPointersRef.current.clear();
    pinchStartDistRef.current = null;
    pinchStartZoomRef.current = null;
    lastPanPointRef.current = null;
    // Clear cached dims so the next gesture captures fresh measurements
    // (the new image may have different dimensions).
    imgDimsRef.current = null;
  }, [lightboxImg?.src]);

  // ── Lightbox zoom/pan: pointer handlers ──
  // These are attached to each <img> in the lightbox (all 3 branches:
  // tall Dev Sol, non-tall Dev Sol, non-Dev Sol). They track active
  // pointers to detect 2-finger pinch vs 1-finger pan/drag.
  //
  // touch-action: none on the <img> ensures the browser does NOT handle
  // any touch gesture natively — all touch events come through as pointer
  // events for JS to handle.
  const onZoomPointerDown = React.useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    zoomPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // ── Cancel any in-progress double-tap zoom animation ──
    // If the user starts a manual gesture (pinch/pan) while a double-tap
    // zoom animation is still running, we must:
    //   1. Stop the CSS transition (set `zoomAnimating = false`) so the
    //      transform freezes at its CURRENT visual state.
    //   2. Sync `lightboxZoomRef`/`lightboxPanRef` to the CURRENT visual
    //      state (not the animation target), so subsequent pinch/pan math
    //      starts from where the user actually sees the image.
    // Without this sync, the refs would have the animation TARGET values
    // while the visual state is mid-transition — causing a jarring jump
    // when the gesture begins.
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
        // Visual zoom = current rect width / natural (untransformed) width.
        const visualZoom = rect.width / dims.imgW;
        // Visual pan = rect center - natural center. natCenter was cached
        // at the start of the double-tap (when zoom=1, pan=0) so it's the
        // TRUE natural center, valid throughout the animation.
        const visualPanX = rect.left + rect.width / 2 - dims.natCenterX;
        const visualPanY = rect.top + rect.height / 2 - dims.natCenterY;
        lightboxZoomRef.current = visualZoom;
        lightboxPanRef.current = { x: visualPanX, y: visualPanY };
        setLightboxZoom(visualZoom);
        setLightboxPan({ x: visualPanX, y: visualPanY });
      }
    }

    // ── Cache image dimensions for clamp math + pinch anchor ──
    // Capture the image's natural rendered size (offsetWidth/Height), its
    // container's size, AND the image's natural center in screen coords —
    // all ONCE at the start of the gesture. This avoids expensive
    // forced-layout reads on every pointer-move event, which was the main
    // cause of lag during rapid pinch-zoom.
    //
    // `natCenterX/Y` (the image's center BEFORE any transform) is derived
    // from the CURRENT transformed bounding rect minus the current pan.
    // This works because `transform: translate(pan) scale(zoom)` with
    // `transform-origin: center center` shifts the natural center by
    // exactly `pan` (scaling around the center doesn't move the center).
    // So: natCenter = transformedRectCenter - pan.
    //
    // `offsetWidth/Height` are LAYOUT properties — they reflect the
    // element's box size BEFORE any CSS transform. Scaling an element
    // via `transform: scale()` does NOT change its `offsetWidth`, so
    // these cached values remain valid for the entire gesture regardless
    // of how much the user zooms.
    //
    // We capture on EVERY pointer-down (not just when size === 2)
    // because one-finger pan also needs these values for clamping.
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
      // ── Pinch gesture START ──
      // Capture the starting finger distance AND the current zoom level.
      // All subsequent pointermove events compute zoom directly from
      // these values (see `onZoomPointerMove`), so the zoom level is a
      // smooth function of absolute finger distance — no per-event
      // jitter from finger wobble.
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
      // ── Pinch zoom (2 fingers) — ABSOLUTE-from-start approach ──
      //
      // THE PROBLEM THIS SOLVES:
      // The previous implementation used a PER-EVENT ratio:
      //   ratio = currentDist / previousEventDist
      //   newZoom = oldZoom * ratio
      // This means each pointermove event compares finger distance
      // against the IMMEDIATELY PREVIOUS event. Human fingers are never
      // perfectly steady — during a deliberate pinch-OUT, fingers
      // micro-wobble (momentarily coming 2-5% closer before continuing
      // apart). Each micro-wobble made ratio < 1, causing a zoom-OUT
      // event in the middle of a zoom-IN gesture. The result: stutter,
      // jitter, and the "lag bug" the user reported ("while zooming in,
      // it zooms out several times").
      //
      // The dead-zone fix (ignoring < 3% changes) didn't fully work
      // because finger wobble can exceed 3%, and because the dead zone
      // still updated `lastDist`, causing accumulated drift.
      //
      // THE SOLUTION — absolute-from-start:
      // Instead of comparing to the previous event, compare to the
      // START of the gesture. The zoom level becomes a DIRECT function
      // of absolute finger distance:
      //   newZoom = startZoom * (currentDist / startDist)
      //
      // Example (startDist=100, startZoom=1):
      //   dist=110 → zoom=1.10  (fingers apart → zoom in)
      //   dist=108 → zoom=1.08  (slight wobble → TINY zoom decrease, proportional)
      //   dist=115 → zoom=1.15  (fingers further → zoom in more)
      //   dist=150 → zoom=1.50  (large pinch → large zoom)
      //
      // The wobble at dist=108 produces a 2% zoom decrease — barely
      // visible, and CRUCIALLY it never fights the user's intent. The
      // zoom monotonically tracks finger distance. No sudden reversals.
      //
      // DAMPENING (0.85): a mild factor applied to the distance ratio
      // so the user has fine control — a 100% increase in finger
      // distance gives 85% increase in zoom. This makes the gesture
      // feel "weighted" without making it feel laggy.
      const pts = Array.from(zoomPointersRef.current.values()).slice(0, 2);
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);

      const startDist = pinchStartDistRef.current;
      const startZoom = pinchStartZoomRef.current;
      // Guard against division by zero (shouldn't happen — a 2-finger
      // pinch always has nonzero distance, but be safe).
      if (startDist > 0 && startZoom !== null) {
        // Absolute distance ratio from gesture start
        const distRatio = dist / startDist;
        // Mild dampening for fine control (both directions identical,
        // so no asymmetry bias)
        const DAMPENING = 0.85;
        const zoomFactor = 1 + (distRatio - 1) * DAMPENING;
        const targetZoom = startZoom * zoomFactor;

        // ── Compute new zoom + anchor-kept pan using cached refs ──
        // PERFORMANCE: We read from `lightboxZoomRef.current` (a cheap ref
        // read) and `imgDimsRef.current` (cached at gesture start) instead
        // of calling setState inside a setState updater or reading
        // `offsetWidth` (which forces layout reflow). The ref is updated
        // manually immediately so subsequent events in the same animation
        // frame see the latest value.
        const zOld = lightboxZoomRef.current;
        const newZoom = Math.max(1, Math.min(5, targetZoom));
        // `actualRatio` accounts for clamping at 1 or 5 AND for the
        // difference between the absolute target and the current zoom.
        // Using this in the pan formula keeps the anchor accurate.
        const actualRatio = newZoom / zOld;
        // Guard: if actualRatio is 1 (no change), skip the setState
        // entirely — avoids unnecessary re-renders on every micro-event.
        if (actualRatio === 1) return;

        setLightboxZoom(newZoom);
        // Update ref immediately so the next pointer event in the same
        // frame uses the correct zoom value (not a stale one).
        lightboxZoomRef.current = newZoom;

        if (newZoom === 1) {
          // Returned to 1x → reset pan so the image is centered
          setLightboxPan({ x: 0, y: 0 });
          lightboxPanRef.current = { x: 0, y: 0 };
        } else {
          // ── Pinch anchor: keep the pinch midpoint under the fingers ──
          // When zoom changes from zOld to newZoom, the image point under
          // the pinch midpoint M should stay at M. The transform is
          // `translate(pan) scale(zoom)` with origin `center center`, so a
          // point at offset `d` from the natural center ends up at
          // `natCenter + d * zoom + pan`. The point under M (in image
          // coords) is `d = (M - natCenter - panOld) / zOld`. After zoom
          // change, we want `M = natCenter + d * newZoom + panNew`, so:
          //   panNew = M - natCenter - d * newZoom
          //          = (M - natCenter) * (1 - actualRatio) + panOld * actualRatio
          // This keeps the pinch midpoint anchored. The pan is then
          // clamped so the image edge stays within the container edge.
          const dims = imgDimsRef.current;
          const panOld = lightboxPanRef.current;
          if (dims) {
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;
            const offsetX = midX - dims.natCenterX;
            const offsetY = midY - dims.natCenterY;
            let panX = offsetX * (1 - actualRatio) + panOld.x * actualRatio;
            let panY = offsetY * (1 - actualRatio) + panOld.y * actualRatio;
            // Clamp pan so the image edge cannot be dragged past the
            // container edge.
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
        // Zoomed in → pan the image (2D, any direction), CLAMPED so the
        // image edge cannot be dragged past the container edge. Uses
        // cached dims from `imgDimsRef` (captured at pointer-down) — no
        // DOM reads here, which keeps the move handler cheap and smooth.
        //
        // Clamp math (using cached dims):
        //   - `dims.imgW/imgH` = image's natural rendered size (before
        //     transform; stable regardless of zoom level).
        //   - `zoomedW/H = imgSize * zoom` = visual size after scale.
        //   - `dims.contW/contH` = the clipping parent's size.
        //   - `maxPan = max(0, (zoomed - container) / 2)` because the
        //     transform-origin is `center center`, so half of the overflow
        //     is the maximum displacement in each direction.
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
          // Fallback: no cached dims (shouldn't happen — captured at
          // pointer-down) → pan without clamp.
          setLightboxPan(p => {
            const np = { x: p.x + dx, y: p.y + dy };
            lightboxPanRef.current = np;
            return np;
          });
        }
      } else if (lightboxScrollFrameRef.current) {
        // Not zoomed + tall image frame exists → scroll the frame
        // vertically (replaces the native scroll that touch-action: none
        // disabled). Scrolling UP (dy > 0) should decrease scrollTop.
        lightboxScrollFrameRef.current.scrollTop -= dy;
      }
      // Not zoomed + no scroll frame → do nothing (let tap-to-close handle it)

      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const onZoomPointerUp = React.useCallback((e: React.PointerEvent) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    zoomPointersRef.current.delete(e.pointerId);
    if (zoomPointersRef.current.size < 2) {
      // Pinch ended (one finger lifted or both lifted) → clear the
      // gesture-start state. If the user puts a second finger back down,
      // a FRESH pinch starts with new start values (capturing the CURRENT
      // zoom as the new startZoom). This is the correct behavior: the
      // user lifted a finger, so the previous gesture is over.
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

  // Double-tap to TOGGLE zoom (common UX pattern in photo viewers).
  // Detected via two rapid pointer-down events on the same target within
  // 300ms.
  //
  // Behavior:
  //   - NOT zoomed (zoom === 1) + double-tap → zoom IN to 1.8x, centered on
  //     the tap point (the tapped spot stays under the cursor). 1.8x is a
  //     satisfying "camera lens" zoom — enough to inspect detail clearly
  //     without losing orientation. The CSS transition (0.45s easeOutExpo)
  //     gives a smooth, cinematic zoom-in feel.
  //   - Zoomed (zoom > 1) + double-tap → zoom OUT to 1x (reset), with the
  //     same smooth transition.
  //
  // Tap-point zoom math:
  //   The image has `transform-origin: center center`. Scaling by `zoomNew`
  //   moves a point at offset `d` from the image center to `d * zoomNew`.
  //   To keep the tap point under the cursor after scaling, we translate
  //   by `d * (1 - zoomNew)` — i.e. `pan = clickOffset * (1 - zoomNew)`.
  //   The pan is then clamped to maxPan so the image edge stays within
  //   the container edge (same clamp logic as the one-finger pan handler).
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
        // Currently at 1x → zoom IN to 1.8x centered on the tap point.
        // 1.8x is a satisfying "camera lens" zoom level — enough to
        // inspect detail clearly without losing orientation. Combined
        // with the 0.45s easeOutExpo transition, this feels like a
        // deliberate lens zoom rather than a snap.
        const img = e.currentTarget;
        const container = img?.parentElement ?? null;
        const zoomNew = 1.8;

        if (img && container) {
          // `getBoundingClientRect()` returns the image's CURRENT rendered
          // position (at zoom=1, pan=0, this is the natural rect). The
          // click offset is calculated relative to the image's center.
          const rect = img.getBoundingClientRect();
          const clickOffsetX = e.clientX - (rect.left + rect.width / 2);
          const clickOffsetY = e.clientY - (rect.top + rect.height / 2);
          // Pan needed to keep the tap point under the cursor after scaling
          let panX = clickOffsetX * (1 - zoomNew);
          let panY = clickOffsetY * (1 - zoomNew);
          // Clamp pan so the image edge cannot be dragged past the
          // container edge. Also cache dims (+ natural center) for
          // subsequent pan/pinch.
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

  // Keyboard nav inside lightbox
  // ── RTL-aware arrow direction ──
  // In LTR (English): ArrowLeft → previous, ArrowRight → next (forward = right)
  // In RTL (Persian): ArrowLeft → next, ArrowRight → previous (forward = left,
  //   because Persian reading flows right-to-left, so "back/previous" is to
  //   the right and "forward/next" is to the left). This matches the user's
  //   expectation that the right arrow goes to the previous image in RTL.
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
      // Escape closes the lightbox (NOT the modal). We preventDefault
      // so the Radix Dialog doesn't also receive the Escape and close
      // the modal underneath.
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setLightboxImg(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightboxImg, lightboxPrev, lightboxNext]);

  // ── Stable overlay handlers (useCallback, empty deps) ──────────────
  // These handlers ONLY use refs (pointerDownRef, imageWrapperRef,
  // hideTimerRef) and stable state setters (setLightboxImg,
  // setIsImgHovered) — no reactive state. So they can be created ONCE
  // with an empty dependency array. This means:
  //   - The motion.div overlay element does NOT get a new prop reference
  //     on every parent re-render (e.g. during pinch-zoom when
  //     `lightboxZoom` / `lightboxPan` change hundreds of times per
  //     second). React's reconciler sees the same handler reference and
  //     skips re-attaching the DOM event listener.
  //   - The motion.div's className still updates (it depends on locale,
  //     which is fine) but the behavioral handlers stay stable.
  //
  // The arrow-direction logic for the capsule (LTR vs RTL) is handled
  // inside the JSX (it depends on `locale`, which IS reactive) — that's
  // a small inline closure that recreates with `locale`, which is fine
  // because `locale` changes extremely rarely (only when the user
  // switches language).
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
    // Only close if:
    //   1. This was a real tap (< 8px movement), not a drag, AND
    //   2. The pointer did NOT start inside the image wrapper
    //      (so tapping the image itself never closes the lightbox).
    if (dist < 8 && !start.targetIsImage) {
      setLightboxImg(null);
    }
  }, []);

  // Shared implementation of the mouse-enter / mouse-move handler.
  // Both events trigger the SAME behavior: clear any pending hide timer,
  // mark the image as hovered (so the X button shows), and arm a new
  // 2000ms hide timer. Using a single callback for both keeps the code
  // DRY and gives a single stable reference for the JSX.
  const handleOverlayMouseEnterOrMove = React.useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    setIsImgHovered(true);
    hideTimerRef.current = setTimeout(() => setIsImgHovered(false), 2000);
  }, []);

  // Stable click handler for the X button — calls stopPropagation so the
  // click event doesn't bubble up to the overlay's tap-to-close handler
  // (which is a no-op since we're already closing, but stopPropagation is
  // the safer pattern). Same as the inline `(e) => { e.stopPropagation();
  // setLightboxImg(null); }` it replaced, but with a stable reference.
  const closeLightboxWithStop = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxImg(null);
  }, []);

  return (
    <DialogPrimitive.Root
      open={open}
      // Guard: when the lightbox is open, ANY attempt to close the modal
      // (via clicking outside, pressing Escape, etc.) is intercepted and
      // ignored — only the lightbox should close in that state. The
      // lightbox is closed by its own pointer handlers (tap on overlay
      // background or X button), which call setLightboxImg(null).
      onOpenChange={(nextOpen) => {
        if (!nextOpen && lightboxImg) {
          // Lightbox is open — swallow the modal-close attempt.
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <AnimatePresence>
        {open && project && portalReady && (
          <DialogPrimitive.Portal forceMount>
            {/* Backdrop — hidden behind lightbox's opaque bg when lightbox is open */}
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
                className="fixed inset-0 z-50 isolate bg-black/50 backdrop-blur-md"
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
                // GATE the panel entrance on `coverMediaReady` so the panel
                // (with its shadow-2xl + bg-background) NEVER appears before
                // the cover image has loaded. Previously the panel entered
                // immediately while the cover sat at opacity:0 + brightness:0.3
                // — producing an empty rectangle with a shadow ("page with a
                // shadow, no image") until the image loaded. Now the panel
                // stays at opacity:0 + y:16 until coverMediaReady flips to
                // true, then it animates in simultaneously with the cover's
                // aperture reveal.
                //
                // The backdrop overlay still fades in immediately (separate
                // motion.div above), so the user sees the screen dim right
                // away and knows something is loading.
                animate={{
                  opacity: coverMediaReady ? 1 : 0,
                  y: coverMediaReady ? 0 : 16,
                }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                // When the parent entrance animation completes we trigger
                // the inner staggered content to animate. For slow or
                // delayed first-open scenarios we wait a short fixed
                // buffer (parent animation duration + small margin)
                // to avoid child animations running too quickly.
                onAnimationComplete={() => {
                  if (!open) return;
                  // Clear the willChange hint + transform so the browser can
                  // demote this element off its dedicated GPU compositor
                  // layer. A persistent GPU layer with any non-`none`
                  // transform disables subpixel anti-aliasing for text in
                  // Chrome/Chromium, producing the "subtle blur" effect on
                  // modal text. Clearing it post-animation restores crisp
                  // text rendering. We animate only opacity + y (no scale)
                  // so framer-motion leaves no lingering scale transform.
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
                // No willChange here — it's added only during the entrance
                // animation via the initial/animate transition and cleared
                // in onAnimationComplete to avoid a persistent GPU layer.
                style={{ borderWidth: 0 }}
                className={cn(
                  // Centering on desktop uses `sm:inset-y-6 sm:inset-x-0 sm:m-auto`
                  // which sets margin:auto within a container that has 24px (6 ×
                  // 4px) top + bottom insets — this centers the panel BOTH
                  // horizontally AND vertically WITHOUT any transform, while
                  // keeping a 24px gap from the top and bottom of the viewport.
                  // Avoiding transform is critical: a persistent transform
                  // (even translate(-50%,-50%)) promotes the element to a
                  // GPU compositor layer, which disables subpixel AA for text
                  // in Chrome and produces the "subtle blur" effect.
                  // Mobile uses a bottom sheet (fixed bottom-0, no centering).
                  "fixed inset-x-0 bottom-0 z-60 mx-auto flex w-full max-w-3xl flex-col rounded-t-[2rem] sm:inset-y-6 sm:inset-x-0 sm:m-auto sm:max-h-[calc(100vh-48px)] sm:rounded-[2rem]",
                  lightboxImg
                    ? "max-h-none overflow-hidden border-0 bg-transparent pointer-events-none"
                    : "max-h-[92vh] overflow-hidden bg-background shadow-2xl"
                )}
              >
                {/* Close button — hidden when lightbox is open.
                    Positioned to match the modal body's padding (p-6 on
                    mobile = 1.5rem, sm:p-8 on desktop = 2rem) so the X
                    aligns with the inner content edge instead of hugging
                    the modal border. Sized to match the lightbox close
                    button (h-11 w-11 / X h-5 w-5) for visual consistency.
                    Animated entrance: fades + scales in shortly after the
                    panel becomes visible.

                    IMPORTANT — gating on `coverMediaReady`:
                    The parent panel sits at opacity:0 + y:16 until
                    `coverMediaReady` flips true (we gate the panel entrance
                    on the cover image loading). Without also gating this
                    button's entrance on the same flag, framer-motion would
                    start the button's 0.3s delay timer from MOUNT time —
                    so by the time the panel finally appears (after image
                    load), the button would already be at opacity:1 and the
                    entrance animation would be invisible. Tying `animate`
                    to `coverMediaReady` ensures the button starts its
                    fade+scale ONLY once the panel is actually visible. */}
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

                {/* Scrollable body — hidden when lightbox is open.
                    Uses native overflow-y-auto + scrollbar-none so NO
                    scrollbar is visible (per user request — only the main
                    page scroll should show). Scrolling still works via
                    wheel/touch/keyboard. overscroll-contain prevents
                    scroll chaining to the page behind. */}
                <div ref={scrollRef} className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-none", lightboxImg && "opacity-0 pointer-events-none")}>
                  {/* Cover — aperture reveal (blur + brightness + scale).
                      Solid bg-background on the container prevents flash
                      through during the filter transition. Works for both
                      video (Dev Solutions) and images. */}
                  <div
                    style={{
                      backgroundColor: "var(--background)",
                      marginBottom: -2,
                      // GPU layer promotion ONLY during the reveal animation.
                      // After reveal (`coverRevealDone`), we drop translateZ(0) +
                      // backfaceVisibility so the cover image renders on the
                      // main compositor layer with full-quality resampling.
                      // A persistent GPU layer causes Chromium to use bilinear
                      // texture sampling for the heavily downscaled cover
                      // (8K source → ~768px display, ~11× downscale), producing
                      // a subtle blur. Same pattern used on the modal panel
                      // itself (see onAnimationComplete on the panel above).
                      ...(!coverRevealDone && !prefersReducedMotion
                        ? { transform: "translateZ(0)", backfaceVisibility: "hidden" as const }
                        : {}),
                    }}
                    className="relative aspect-[16/9] w-full overflow-hidden rounded-t-[2rem] sm:rounded-t-[2rem]"
                  >
                    <motion.div
                      // Use explicit initial/animate (not variants) so we
                      // have full control over the post-animation state.
                      // When `coverRevealDone` is true, we swap the animate
                      // target to one with `filter: "none"` and `scale: 1` —
                      // framer-motion applies these as inline styles, which
                      // clears the animation-time blur/scale. The outer
                      // wrapper (see above) drops its `translateZ(0)` +
                      // `backfaceVisibility: hidden` once reveal is done so
                      // the cover image renders on the main compositor layer
                      // with full-quality resampling (avoids the subtle blur
                      // that GPU-composited layers exhibit for heavily
                      // downscaled images like our 8K source → 768px display).
                      //
                      // GATING on `coverMediaReady`: the aperture animation
                      // only runs AFTER the image/video has loaded. Before
                      // that, `animate` mirrors `initial` so framer-motion
                      // does nothing (no transition), keeping the cover
                      // invisible + blurred until the media is ready. This
                      // ensures the camera-lens reveal is VISIBLE on first
                      // open (when the image takes time to load) instead of
                      // animating an empty container and having the image
                      // pop in after the blur has already cleared.
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
                          src="/videos/dev-solutions-demo.webm"
                          autoPlay
                          loop
                          muted
                          playsInline
                          onLoadedData={() => {
                            // Defer to next frame so framer-motion has time to
                            // commit the hidden `initial` state before we flip
                            // to the shown `animate` target. Without this, on
                            // cached re-opens the browser can fire onLoad/
                            // onLoadedData synchronously during mount, causing
                            // framer-motion to see initial=shown and skip the
                            // aperture animation entirely.
                            requestAnimationFrame(() => setCoverMediaReady(true));
                          }}
                          // Safety net: same pattern as the Image onError above.
                          onError={() => {
                            requestAnimationFrame(() => setCoverMediaReady(true));
                          }}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        /* next/image (NOT SmartImage) for the modal cover.
                         *
                         * Cover source images are 8K (8640×4320). A plain <img>
                         * forces the browser to bilinearly downscale ~11×
                         * (8640px → 768px display), producing a subtle blur.
                         * next/image generates a srcset of pre-sized variants
                         * so the browser receives an image close to display size.
                         *
                         * `sizes` tells the optimizer the true rendered width:
                         * modal is max-w-3xl = 768px on desktop, full width on
                         * mobile. On a 2× retina display, the browser picks the
                         * 1920w variant (closest to 768×2 = 1536).
                         *
                         * The motion.div parent has `relative` in its className
                         * so next/image `fill` (position: absolute) fills the
                         * motion.div, ensuring the reveal animation's scale/blur
                         * transform applies to the image.
                         *
                         * `onLoad` fires when the image has finished loading
                         * (from network OR cache). This gates the aperture
                         * animation above via `coverMediaReady`. The
                         * requestAnimationFrame wrapper defers the state flip
                         * so framer-motion has time to mount with the hidden
                         * initial state first — without it, cached re-opens
                         * can fire onLoad synchronously during mount, causing
                         * framer-motion to see initial=shown and skip the
                         * aperture animation. */
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
                          // Safety net: if the cover fails to load, flip
                          // coverMediaReady anyway so the modal panel does
                          // not stay invisible forever (we gate the panel
                          // entrance on this flag — see the motion.div above).
                          // The cover container's bg-background will show
                          // through as a clean empty area instead of leaving
                          // the whole modal stuck at opacity:0.
                          onError={() => {
                            requestAnimationFrame(() => setCoverMediaReady(true));
                          }}
                          className="object-cover"
                        />
                      )}
                    </motion.div>
                    {/* Cover bottom fade.
                        - Mafia Master & Dev Solutions: these covers are bright,
                          so they get a taller + stronger black fade (h-2/3,
                          from-black/95) so the shadow reads ON the image
                          instead of vanishing — and never looks like a white
                          shadow in light theme.
                        - All other projects: `from-background` so the cover
                          blends seamlessly into the modal content area below. */}
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent",
                        project.id === "mafia-master" || project.id === "dev-solutions"
                          ? "h-2/3 from-black/95 via-black/60 via-black/25"
                          : "h-1/2 from-background"
                      )}
                    />

                    {/* Project link — overlaid on the cover, bottom corner
                        opposite to the reading direction (so it never collides
                        with the modal's text column). Sits over the cover's
                        dark gradient fade. Glass pill styled to match the
                        bento card's "مشاهده" button: semi-transparent bg +
                        backdrop-blur + subtle inset highlight, with a hover
                        color swap (no scale). Reads clearly in both light &
                        dark themes because the cover bottom always has a
                        strong black fade. Hidden when no link.
                        Animated entrance: fades + slides up + scales in
                        after the cover has begun its aperture reveal, so
                        the button feels like it emerges from the cover. */}
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
                          // Opposite corner to the reading direction:
                          // LTR → bottom-right; RTL → bottom-left.
                          locale === "fa" ? "left-4" : "right-4"
                        )}
                      >
                        <span>{tt(project.link.label)}</span>
                        <ArrowUpRight
                          className={cn(
                            "h-3.5 w-3.5",
                            // Mirror the arrow for RTL (Persian) so it points
                            // in the reading direction — same pattern as the
                            // bento card's "مشاهده" button.
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
                          const aspectStyle = !isDevSolutions
                            ? { aspectRatio: String(img.aspectRatio ?? 1.5) }
                            : undefined;

                          // ── Progressive batch loading ──
                          // Each image belongs to a 1-indexed batch:
                          //   batch = floor(i / 3) + 1
                          // Only images whose batch is <= activeBatch get a
                          // real <img> (via SmartImage). Images in later
                          // batches render only a skeleton placeholder — no
                          // <img> in the DOM means no network request and no
                          // decode work, so the device only processes 3 images
                          // at a time. Once the current batch's images all
                          // load, `activeBatch` advances (see the batch
                          // advancement effect above) and the next batch's
                          // SmartImages mount and start loading.
                          //
                          // The button is always clickable — if the user
                          // taps a not-yet-loaded cell, the lightbox opens
                          // and loads the full image directly (the lightbox
                          // has its own loading state, so this is fine).
                          const imageBatch = Math.floor(i / GALLERY_BATCH_SIZE) + 1;
                          const isImageActive = imageBatch <= activeBatch;

                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setLightboxImg(img)}
                              className="group/img relative w-full cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-secondary/30"
                            >
                              <div
                                className={cn(
                                  "relative w-full overflow-hidden",
                                  isDevSolutions && "aspect-[16/9]"
                                )}
                                style={aspectStyle}
                              >
                                {isImageActive ? (
                                  isDevSolutions ? (
                                    /* ── Dev Solutions gallery thumbnail — OPTIMIZED ──
                                       Source images are extremely heavy:
                                         - Image 1 "1-DS Index":  5760×13820 = 1.5MB
                                         - Image 3 "3-Blog page": 5760×8012  = 775KB
                                       Loading these RAW (as SmartImage does) forces
                                       the browser to download the full payload AND
                                       allocate a decoded bitmap at native resolution
                                       (~320MB for the 5760×13820 image!) for EACH
                                       thumbnail. The first batch (3 images) loads
                                       simultaneously, so the modal was hit with
                                       ~480MB of decoded bitmap work on first open —
                                       the root cause of the "modal doesn't render
                                       properly with heavy images" bug.

                                       Fix: route through /_next/image?url=...&w=640&q=80
                                       so the Next.js server returns a pre-resized +
                                       recompressed variant (~80KB, decoded bitmap
                                       ~4MB). At w=640 the variant covers the gallery's
                                       display size (3-col grid ≈ 240px, 2× retina =
                                       480px) with retina-quality headroom. Visual
                                       output is IDENTICAL to the raw SmartImage path
                                       at the displayed size — same object-cover crop,
                                       same object-top alignment for tall images, same
                                       hover scale, same skeleton-shimmer placeholder.
                                       Only the underlying bytes/bitmaps change. */
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
                                      imgClassName="transition-transform duration-500 ease-out group-hover/img:scale-[1.02]"
                                      onLoad={makeGalleryOnLoad(imageBatch)}
                                    />
                                  )
                                ) : (
                                  /* ── Inactive-batch placeholder ──
                                     No <img> is rendered, so the browser
                                     makes NO network request and does NO
                                     decode work for this cell. We show only
                                     the skeleton-shimmer animation so the
                                     user sees a consistent placeholder
                                     matching the active cells' loading
                                     state. When `activeBatch` advances to
                                     include this image, the placeholder is
                                     swapped for a real SmartImage which
                                     starts loading immediately. */
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
                              <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/img:bg-black/40" />
                              {/* Centered zoom icon — appears on hover. */}
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
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

      {/* ── Lightbox ─────────────────────────────────────────────────
          Rendered via React.createPortal(…, document.body) so it lives
          OUTSIDE the Radix Dialog Portal. This is critical: Radix Dialog
          uses `react-remove-scroll` which attaches a capture-phase
          `touchmove` preventDefault on the document while the dialog is
          open. That lock covers any descendant of the Dialog Portal,
          which would silently disable native touch-scroll on the
          lightbox image on mobile.

          By portaling the lightbox directly to document.body (sibling
          of the Radix Portal, not a child), we escape the scroll lock
          and the browser's native touch scrolling works on the overlay.

          Closing rules:
          - Tap on the overlay background (outside the image) → close.
          - Tap on the image → do NOT close (image is for viewing only).
          - Tap on the X button → close.
          - Touch-drag on the image → scroll the image (mobile), never close.

          Touch handling on mobile:
          - The overlay is the scroll container (overflow-y-auto on mobile).
          - We track pointer down/move/up: only treat it as a "tap-to-close"
            when the pointer moved less than 8px between down and up (a real
            tap, not a drag) AND the target is NOT inside the image wrapper.
          - `touch-action: pan-y` lets the browser handle vertical
            scrolling natively so drag works smoothly on mobile.
          - `overscroll-contain` keeps the scroll inside this overlay
            instead of bleeding through to the page behind. */}
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
                  // ─── Lightbox overlay (UNIFIED standard — mobile = desktop) ───────
                  // The lightbox uses the SAME layout standard on ALL breakpoints:
                  //   - VERTICAL padding: pt-6 pb-6 (24px top + 24px bottom).
                  //   - HORIZONTAL margin: driven by each image's own max-width
                  //     (max-w-[calc(100vw-4rem)] on mobile, sm:max-w-[calc(100vw-8rem)]
                  //     on desktop = 32px / 64px margin each side).
                  //   - CENTERING: NO `justify-center` on the overlay. Instead, the
                  //     inner content div uses `my-auto` — this centers the image +
                  //     capsule group vertically when there is free space, AND
                  //     gracefully falls back to top-alignment (scrollable from
                  //     top) when content overflows. This is the robust pattern
                  //     for "always centered, but never cut off at the top".
                  //     `justify-center` + `overflow-y-auto` is buggy: when
                  //     content overflows, flexbox still tries to center it,
                  //     causing the TOP to be cut off and unreachable until the
                  //     user scrolls — this was the mobile centering bug.
                  //   - GAP between image and capsule = 20px (the capsule wrapper's
                  //     top padding, since mt is 0).
                  //
                  // Previously mobile used `justify-start pt-10 pb-20 px-6` which
                  // pushed images to the top with asymmetric padding — different
                  // from desktop. Now mobile matches desktop exactly: centered,
                  // same padding, same image sizing.
                  //
                  // `overscroll-contain` prevents scroll chaining to the page
                  // behind on ALL breakpoints.
                  //
                  // ── touch-action: pan-y ──
                  // On mobile we use `pan-y` on the OVERLAY (NOT the images).
                  // This allows vertical scrolling of the overlay itself (for
                  // tall images when zoom=1) but blocks native pinch-zoom —
                  // which is intentional, because we handle pinch-zoom in JS
                  // via Pointer Events on the <img> elements (the images have
                  // their own `touch-action: none`). If we used `manipulation`
                  // here, the browser's native pinch-zoom would interfere with
                  // our JS pinch detection (both would try to handle the same
                  // 2-finger gesture).
                  //
                  // The overlay's `pan-y` only applies to touches on the
                  // overlay background (outside the image). Touches on the
                  // image use the image's `touch-action: none`.
                  "fixed inset-0 z-[200] flex flex-col items-center pt-6 pb-6 max-sm:pt-5 max-sm:pb-3 pointer-events-auto overflow-y-auto overscroll-contain scrollbar-none bg-black/50 backdrop-blur-md",
                  "max-sm:[touch-action:pan-y]"
                )}
              // Stop wheel events from bubbling up to the document, where
              // `react-remove-scroll` (installed by Radix Dialog) captures
              // them with a non-passive listener and calls preventDefault().
              // Without this stopPropagation, the wheel event reaches the
              // document handler which kills the native scroll on this overlay.
              onWheelCapture={stopPropagation}
              // Same for touchmove — `react-remove-scroll` also captures
              // touchmove at the document level and preventDefaults it for
              // any element not inside the modal's scroll lock group.
              onTouchMoveCapture={stopPropagation}
              onPointerDown={handleOverlayPointerDown}
              onPointerUp={handleOverlayPointerUp}
              // ── Mouse-move auto-show/auto-hide for the X close button ──
              // Attached to the OVERLAY (not the image wrapper) so the X
              // reappears whenever the mouse moves ANYWHERE in the lightbox
              // — including over the dark background around the image.
              // Behavior (desktop only; mobile uses the [@media(hover:none)]
              // CSS override on the button itself):
              //   1. Mouse moves → isImgHovered = true → X visible.
              //   2. After 2000ms of NO mouse movement → isImgHovered = false
              //      → X fades out.
              //   3. Any new mouse movement resets the 2s timer.
              // The 2s here matches the 2s open-show timer so the behavior
              // is consistent: "2s visible → fade out → reappear on movement
              // → 2s visible → fade out if no movement"
              onMouseEnter={handleOverlayMouseEnterOrMove}
              onMouseMove={handleOverlayMouseEnterOrMove}
            >
              <div className="flex flex-col items-center my-auto">

                {/* Image — slide animation only on image.
                    The AnimatePresence with mode="wait" ensures only the
                    image swaps with animation; the capsule below is
                    outside this AnimatePresence so it stays put. */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={lightboxImg.src}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={cn(
                      // ── Image wrapper (UNIFIED: mobile = desktop) ──
                      // `inline-block` + `overflow-hidden` + `rounded-2xl`
                      // on ALL breakpoints. The width strategy differs by
                      // project type:
                      //
                      // - DevSolutions: `w-full` → the wrapper fills the
                      //   overlay width. The inner container div uses
                      //   `flex items-center justify-center` to center the
                      //   image within. This is needed because DevSol has
                      //   an inner container that manages the 16:9 frame
                      //   or the landscape image slot.
                      //
                      // - Non-DevSolutions: `w-auto` → the wrapper shrinks
                      //   to the image's width on ALL breakpoints (previously
                      //   mobile used `max-sm:w-full` which made the wrapper
                      //   100vw wide, leaving the `w-auto` image left-aligned
                      //   instead of centered). Now the overlay's
                      //   `items-center` centers the wrapper (and thus the
                      //   image) horizontally on ALL breakpoints — mobile
                      //   matches desktop.
                      "relative inline-block rounded-2xl overflow-hidden",
                      isDevSolutions ? "w-full" : "w-auto"
                    )}
                    ref={imageWrapperRef}
                    // NOTE: Mouse enter/move/leave handlers used to live here
                    // but have been MOVED to the overlay (the parent
                    // motion.div). This is intentional — we want the X close
                    // button to reappear when the mouse moves ANYWHERE in the
                    // lightbox (including over the dark background around the
                    // image), not just over the image itself. The overlay's
                    // handlers catch mousemove events that bubble up from the
                    // image wrapper too, so behavior is fully preserved with
                    // a single source of truth.
                  >
                    {/* Skeleton placeholder while the lightbox image loads.
                        Shown ONLY for non-DevSolutions projects. DevSolutions
                        has its own skeleton inside its branch (below) that
                        matches its taller image wrapper — rendering both at
                        once caused a double-skeleton bug. */}
                    {!isDevSolutions && (lightboxImgLoaded ? null : (
                      /* ── Non-Dev-Solutions skeleton — 9:16 vertical (UNIFIED) ──
                         Always a PORTRAIT rectangle (9:16 = width:height),
                         matching the dominant shape of the non-Dev-Solutions
                         gallery images (all portrait, aspectRatio ≈ 0.46).

                         UNIFIED standard (mobile = desktop):
                         - `h-[calc(100vh-142px)]` → autofill the lightbox's
                           vertical budget on ALL breakpoints (same as the
                           actual image).
                         - `w-auto aspect-[9/16]` → width derives from the
                           height via the 9:16 ratio.
                         - `max-w-[calc(100vw-4rem)]` (mobile) / `sm:max-w-
                           [calc(100vw-8rem)]` (desktop) → horizontal safety
                           cap (32px / 64px margin each side).

                         On a narrow phone the max-w may cap the width, making
                         the skeleton shorter than `calc(100vh-142px)` — but
                         it's still a 9:16 portrait rectangle, centered. */
                      <div
                        className="skeleton-shimmer rounded-2xl h-[calc(100vh-142px)] max-sm:h-[calc(100vh-112px)] w-auto aspect-[9/16] max-w-[calc(100vw-4rem)] sm:max-w-[calc(100vw-8rem)]"
                        aria-hidden="true"
                      />
                    ))}

                    {/* Close button — larger tap target.
                        On desktop (hover-capable): visible while mouse is
                        moving over the image, auto-hides after 1s of no
                        movement, hides on mouse leave.
                        On mobile (touch-only): always visible via the
                        [@media(hover:none)] CSS override. */}
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
                        // Mobile (touch-only devices): always visible
                        "[@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto"
                      )}
                      aria-label={t("portfolio.modal.close")}
                    >
                      <X className="h-5 w-5" />
                    </button>

                    {/* "Double-tap to reset" hint — pill at BOTTOM-center.
                        Shows 8s after the user zooms in (zoom > 1) and
                        auto-hides 3s later, so it acts as a gentle late
                        reminder rather than an immediate popup. Driven by
                        `zoomResetHintVisible`.

                        Positioned at BOTTOM-center (matches the scroll
                        hint's position pattern, on the opposite side from
                        the X button which is at the top). The scroll hint
                        and this hint never coexist — the scroll hint only
                        shows at zoom=1 for tall DevSol images, while this
                        hint only shows at zoom > 1. pointer-events-none so
                        it never blocks tap/pan on the image. z-30 so it
                        sits above the image.

                        STRUCTURE: outer wrapper div handles ABSOLUTE
                        POSITIONING only (bottom-3, left-0 right-0, flex
                        justify-center) — it has NO transform. The inner
                        motion.div handles ALL animation (opacity + y +
                        scale). Same split as the scroll hint: this avoids
                        framer-motion's transform pipeline overriding any
                        CSS translateX used for centering. The wrapper's
                        `flex justify-center` does the horizontal centering
                        so the motion.div never needs a transform for
                        positioning. The `px-16` side padding prevents the
                        pill from overlapping the X button on narrow
                        viewports. */}
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
                      /* ── Tall Dev Solutions lightbox image (16:9 autofill frame) ──
                         This branch handles ONLY the two TALL Dev Solutions
                         screenshots (aspectRatio < 1 — image 1 "1-DS Index"
                         at 0.417 and image 3 "3-Blog page" at 0.719). These
                         are full-page screenshots that are MUCH taller than
                         wide, so showing them scaled-to-fit (the default
                         dev-solutions branch below) makes them too small to
                         read on screen.

                         Instead, we render them inside a 16:9 "autofill"
                         frame:
                           - The frame has aspect-ratio 16/9 and a max-width
                             derived from the lightbox's vertical budget
                             (calc(100vh - 142px) × 16/9) so its computed
                             height never exceeds calc(100vh - 142px).
                           - The image is rendered `w-full h-auto` inside an
                             inner scroll container — its natural width fills
                             the frame, and its natural height (much taller
                             than the frame) overflows.
                           - The inner container is `overflow-y-auto` +
                             `scrollbar-none`, so the user can scroll
                             VERTICALLY through the screenshot. The frame's
                             `overflow-hidden` crops the height.
                           - `overscroll-contain` + `touch-action: pan-y`
                             keep the scroll inside the frame on mobile
                             without chaining to the overlay.

                         A "scroll" hint (text + chevron-down icon) slides
                         IN at the bottom-center of the frame 1.5s after
                         the lightbox opens, and slides OUT softly
                         downward (drifts out instead of snapping) as
                         soon as the user starts scrolling inside the
                         frame. */
                      <div
                        className={cn(
                          "relative rounded-2xl overflow-hidden bg-black",
                          // ── UNIFIED (mobile = desktop) ──
                          // HEIGHT-BOUND 16:9 frame that FILLS the lightbox's
                          // vertical budget exactly on ALL breakpoints:
                          //   - h-[calc(100vh-142px)] fixes the height to the
                          //     same standard used by the other DevSolutions
                          //     branch (142px = 24px top + 24px bottom overlay
                          //     padding + ~94px capsule wrapper).
                          //   - aspect-video derives the width from the height:
                          //     width = height × 16/9.
                          //   - max-w-[calc(100vw-3rem)] is a SAFETY CAP for
                          //     narrow viewports (mobile or narrow desktop) so
                          //     the frame never overflows horizontally. When
                          //     max-w kicks in, the frame becomes narrower than
                          //     16:9, but the HEIGHT still fills the vertical
                          //     budget — which is what matters for the user's
                          //     "autofill the height" requirement. The image
                          //     inside (w-full h-auto) still overflows
                          //     vertically and scrolls.
                          //
                          // ── Mobile height override ──
                          // `max-sm:h-[calc(100vh-112px)]` adjusts the mobile
                          // height to match the mobile padding budget:
                          //   20px (pt-5) + 16px (pb-4) + 80px (capsule wrapper)
                          //   = 116px non-image space on mobile.
                          // Without this override, the image would reserve 142px
                          // (the desktop budget) on mobile, leaving 26px of free
                          // space that `my-auto` redistributes as 13px top +
                          // 13px bottom — defeating the user's explicit
                          // 20px-top / 16px-bottom padding spec. With the
                          // override, the image fills exactly the available
                          // mobile space, my-auto has nothing to distribute,
                          // and the padding values (20px / 16px) become the
                          // actual viewport-edge-to-image margins.
                          //
                          // Previously mobile used `max-sm:w-full
                          // max-sm:aspect-video` (width-bound) which made the
                          // frame SHORT on mobile (e.g., 352×198px on a 400×800
                          // phone) — different from desktop. Now mobile matches
                          // desktop exactly: height-bound on all breakpoints,
                          // so the frame is tall (e.g., 352×658px on the same
                          // phone) and the user can scroll through the full
                          // screenshot vertically.
                          "h-[calc(100vh-142px)] aspect-video max-w-[calc(100vw-3rem)] max-sm:h-[calc(100vh-112px)]"
                        )}
                      >
                        {/* Scrollable inner container — holds the
                            full-height image and lets the user pan
                            vertically. The ref is used to reset
                            scrollTop on image change (see useEffect
                            above). */}
                        <div
                          ref={lightboxScrollFrameRef}
                          onScroll={(e) => {
                            // Only dismiss the hint when the user has
                            // scrolled MORE than 5px. This 5px threshold
                            // filters out sub-pixel scroll adjustments
                            // that some browsers fire during reflow /
                            // scroll-anchoring / layout recalculation
                            // when the tall image loads and changes the
                            // container's scrollHeight. Without this
                            // threshold, a spurious 0→1px scroll event
                            // could dismiss the hint immediately after
                            // the 1.5s timer reveals it.
                            if (e.currentTarget.scrollTop > 5) {
                              setScrollHintVisible(false);
                            }
                          }}
                          style={{
                            // Disable CSS scroll anchoring. When the
                            // tall image loads and its height jumps from
                            // 0 to very tall, Chrome's scroll-anchoring
                            // feature may try to adjust scrollTop to
                            // keep a "stable" anchor point — which can
                            // fire a spurious scroll event and dismiss
                            // the hint. `overflow-anchor: none` tells
                            // the browser NOT to perform any anchor
                            // adjustment on this container.
                            overflowAnchor: "none",
                          }}
                          className={cn(
                            "absolute inset-0 overflow-y-auto overscroll-contain scrollbar-none",
                            // `touch-action: pan-y` on the scroll frame allows
                            // vertical scrolling (for the tall image when
                            // zoom=1) but blocks native pinch-zoom — the
                            // <img> inside has its own `touch-action: none`
                            // for JS-based pinch-zoom + pan. Touches on the
                            // image use the image's touch-action, not the
                            // frame's.
                            "[touch-action:pan-y]"
                          )}
                        >
                          {/* Skeleton placeholder while the tall
                              image loads. Spans the full frame so
                              the user sees a uniform shimmer. */}
                          {lightboxImgLoaded ? null : (
                            <div
                              className="skeleton-shimmer absolute inset-0 rounded-2xl"
                              aria-hidden="true"
                            />
                          )}
                          <img
                            // w=1920 (NOT 828) — matches the non-tall lightbox
                            // branch. The tall image is rendered `w-full` inside
                            // a frame of `aspect-video h-[calc(100vh-142px)]`,
                            // which on a 1920×1080 desktop is ~1668px wide. The
                            // old value w=828 forced a 2× upscale at display time
                            // → visible blur on images 1 and 3. w=1920 gives a
                            // 1:1 source-to-display match on standard desktops
                            // and only a slight upscale on retina, which is
                            // visually equivalent to the non-tall images.
                            //
                            // Memory note: a 5760×13820 source at w=1920
                            // produces a 1920×4608 variant (~35MB decoded
                            // bitmap). That is 5.4× the 6.5MB of the old
                            // w=828 variant, but still ~9× smaller than the
                            // raw 320MB source — well within budget for a
                            // single lightbox image.
                            src={optimizedSrc(lightboxImg.src, 1920, 80)}
                            alt={tt(lightboxImg.alt)}
                            // loading=eager + decoding=async: the lightbox
                            // image is the focal point the user just clicked
                            // to see, so it should start loading IMMEDIATELY
                            // (eager, not lazy). But decoding runs async so the
                            // main thread stays free for the entrance animation
                            // — the browser will fire `onLoad` once decode is
                            // complete, which flips `lightboxImgLoaded` to true
                            // and fades the image in.
                            //
                            // fetchPriority="high" tells the browser this is
                            // the most important request on the page right now,
                            // so it should be prioritized over the gallery
                            // thumbnails that may still be loading in the
                            // background.
                            loading="eager"
                            decoding="async"
                            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                            fetchPriority="high"
                            className={cn(
                              // w-full → image fills the frame's
                              //          width.
                              // h-auto → image renders at its
                              //          natural (very tall) height,
                              //          which overflows the frame
                              //          and creates scrollable
                              //          content.
                              // block → removes inline-img
                              //         baseline gap.
                              "w-full h-auto block transition-opacity duration-300",
                              lightboxImgLoaded ? "opacity-100" : "opacity-0"
                            )}
                            draggable={false}
                            // ── Pinch-zoom + pan (mobile) ──
                            // touch-action: none tells the browser NOT to
                            // handle any touch gesture natively, so JS
                            // receives all pointer events for pinch/pan.
                            // The transform applies zoom + pan; when zoom=1
                            // and pan={0,0}, the transform is a no-op.
                            style={{
                              touchAction: "none",
                              // ── GPU-layer optimization ──
                              // When zoom=1 and pan={0,0}, use
                              // `transform: "none"` instead of the no-op
                              // `translate(0px,0px) scale(1)`. Both are
                              // visually identical, but `transform: "none"`
                              // does NOT promote the element to a GPU
                              // compositor layer (per CSS spec: only non-
                              // `none` transform values create a stacking
                              // context / GPU layer). For this very TALL
                              // Dev Solutions lightbox image (displayed at
                              // the frame's full width — ~1668px on a
                              // 1920×1080 desktop, larger on retina), this
                              // saves GPU texture memory and lets the
                              // browser use full-quality resampling on the
                              // main compositor layer (instead of bilinear
                              // texture filtering on the GPU layer, which
                              // can produce a subtle blur on heavily
                              // downscaled images).
                              // The transition from `none` → `scale(1.8)`
                              // on double-tap zoom is still animated (CSS
                              // treats `none` as the identity transform for
                              // interpolation purposes, so the transition
                              // works correctly).
                              transform:
                                lightboxZoom !== 1 ||
                                lightboxPan.x !== 0 ||
                                lightboxPan.y !== 0
                                  ? `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`
                                  : "none",
                              transformOrigin: "center center",
                              // Smooth transition for double-tap zoom. Only
                              // active while `zoomAnimating` is true (set by
                              // `onZoomDoubleTap`, auto-reset after 500ms).
                              // During manual pinch/pan, no transition so
                              // the transform tracks the fingers 1:1.
                              // 0.45s + easeOutExpo gives a deliberate,
                              // camera-lens-like zoom feel.
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
                              setLightboxImgLoaded(true);
                              setLightboxReady(true);
                            }}
                            onError={() => {
                              setLightboxImgLoaded(true);
                              setLightboxReady(true);
                            }}
                          />
                        </div>

                        {/* Scroll hint — text + chevron-down icon.
                            Slides IN at the bottom-center of the frame
                            1.5s after the lightbox opens (gated by
                            `scrollHintVisible`), and slides OUT softly
                            downward as soon as the user scrolls.

                            Animation feel: SOFT. Long duration (0.7s),
                            easeOutQuart curve, subtle scale (0.96↔1)
                            for a gentle "pop" without snap, and a SMALL
                            exit movement (y:24) so the hint drifts out
                            instead of shooting off-screen.

                            STRUCTURE: The outer wrapper div handles
                            ABSOLUTE POSITIONING only (bottom-6, left-0
                            right-0, flex justify-center) — it has NO
                            transform. The inner motion.div handles ALL
                            animation (opacity + y + scale). This split
                            is critical: if we put `left-1/2
                            -translate-x-1/2` on the motion.div, the
                            CSS translateX would be OVERRIDDEN by
                            framer-motion's transform pipeline (which
                            combines y + scale into a single transform),
                            breaking horizontal centering. By keeping
                            positioning on the wrapper and animation on
                            the child, the two never collide.

                            pointer-events-none on the wrapper so it
                            never blocks scroll/click on the image. z-30
                            so it sits above the image. text-shadow
                            gives legibility against any background. */}
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
                      /* ── Dev Solutions non-tall lightbox image (UNIFIED) ──
                         Landscape screenshots (ratio > 1). Same centering
                         + sizing standard as non-Dev-Solutions images:
                         image is capped at `max-h-[calc(100vh-142px)]` so
                         it ALWAYS fits the viewport alongside the capsule.

                         Container (UNIFIED — mobile = desktop):
                         - `h-[calc(100vh-142px)]` → fills the vertical
                           budget on ALL breakpoints so the image area is
                           consistent across all Dev Solutions slides.
                         - Previously mobile had NO fixed height (shrank
                           to fit the image), which made mobile different
                           from desktop. Now mobile matches desktop: same
                           fixed height, same centering.

                         `flex items-center justify-center` centers the
                         image horizontally AND vertically within the
                         container on all breakpoints. */
                      <div className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl h-[calc(100vh-142px)] max-sm:h-[calc(100vh-112px)]">
                        {lightboxImgLoaded ? null : (
                          /* ── Non-tall Dev Solutions skeleton — 16:9 (UNIFIED) ──
                             LANDSCAPE rectangle (16:9), matching the
                             tall-image frame's shape. Same height-bound
                             standard on ALL breakpoints:
                             - `h-[calc(100vh-142px)]` → fill height.
                             - `max-sm:h-[calc(100vh-112px)]` → mobile budget
                               (20pt + 16pb + 80 wrapper = 116px).
                             - `w-auto aspect-video` → width derives from
                               height via 16:9 ratio.
                             - `max-w-full` → never overflow horizontally. */
                          <div
                            className="skeleton-shimmer rounded-2xl h-[calc(100vh-142px)] max-sm:h-[calc(100vh-112px)] w-auto aspect-video max-w-full"
                            aria-hidden="true"
                          />
                        )}
                        <img
                          src={optimizedSrc(lightboxImg.src, 1920, 80)}
                          alt={tt(lightboxImg.alt)}
                          // loading=eager + decoding=async: the lightbox image
                          // is the focal point the user clicked to see. Eager
                          // loading starts the request immediately; async
                          // decoding keeps the main thread free for the entrance
                          // animation. w=1920 covers full-HD displays.
                          loading="eager"
                          decoding="async"
                          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                          fetchPriority="high"
                          className={cn(
                            // ── Non-tall DevSol image (UNIFIED) ──
                            // Mobile: `max-w-[calc(100vw-4rem)] w-auto h-auto`
                            // → capped at width (32px margin each side), natural
                            // height. The container has no fixed height on
                            // mobile so it shrinks to fit — no empty space.
                            // Desktop: `sm:max-h-full sm:max-w-[calc(100vw-8rem)]`
                            // → capped at container height (calc(100vh-142px))
                            // and 64px horizontal margin.
                            "max-w-[calc(100vw-4rem)] w-auto h-auto block rounded-2xl transition-opacity duration-300 sm:max-h-full sm:max-w-[calc(100vw-8rem)]",
                            lightboxImgLoaded ? "opacity-100 relative z-10" : "absolute inset-0 opacity-0"
                          )}
                          draggable={false}
                          // ── Pinch-zoom + pan (mobile) ──
                          // Smooth transition for double-tap zoom — same
                          // logic as the tall-image variant above. Only
                          // active while `zoomAnimating` is true so manual
                          // pinch/pan still tracks fingers 1:1.
                          style={{
                            touchAction: "none",
                            // ── GPU-layer optimization ──
                            // When zoom=1 and pan={0,0}, use
                            // `transform: "none"` instead of the no-op
                            // `translate(0px,0px) scale(1)`. Both are
                            // visually identical, but `transform: "none"`
                            // does NOT promote the element to a GPU
                            // compositor layer (per CSS spec: only non-
                            // `none` transform values create a stacking
                            // context / GPU layer). This saves GPU texture
                            // memory and lets the browser use full-quality
                            // resampling on the main compositor layer.
                            // The transition from `none` → `scale(1.8)` on
                            // double-tap zoom is still animated (CSS treats
                            // `none` as the identity transform for
                            // interpolation purposes).
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
                            setLightboxImgLoaded(true);
                            setLightboxReady(true);
                          }}
                          onError={() => {
                            setLightboxImgLoaded(true);
                            setLightboxReady(true);
                          }}
                        />
                      </div>
                    ) : (
                      <img
                        src={optimizedSrc(lightboxImg.src, 1920, 80)}
                        alt={tt(lightboxImg.alt)}
                        // loading=eager + decoding=async: the lightbox image
                        // is the focal point the user clicked to see. Eager
                        // loading starts the request immediately; async
                        // decoding keeps the main thread free for the entrance
                        // animation. w=1920 covers full-HD displays.
                        loading="eager"
                        decoding="async"
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                        fetchPriority="high"
                        className={cn(
                          // ── Non-Dev-Solutions image (UNIFIED standard) ──
                          // Mobile = desktop: the image is capped at
                          // `max-h-[calc(100vh-142px)]` on ALL breakpoints so
                          // it ALWAYS fits in the viewport alongside the capsule
                          // — NO overlay scroll, NO internal image scroll.
                          // 142px = 24px top + 24px bottom overlay padding +
                          // ~94px capsule wrapper (20+58+16).
                          //
                          // `w-auto` lets the width derive from the capped
                          // height (portrait images end up narrow, centered).
                          //
                          // `max-w-[calc(100vw-4rem)]` (mobile) /
                          // `sm:max-w-[calc(100vw-8rem)]` (desktop) = horizontal
                          // safety cap (32px / 64px margin each side).
                          //
                          // Previously mobile used `w-full` which made tall
                          // portrait images overflow the viewport — pushing the
                          // capsule off-screen and breaking centering. Now mobile
                          // matches desktop: capped height, auto width, centered.
                          "h-auto w-auto block max-h-[calc(100vh-142px)] max-sm:max-h-[calc(100vh-112px)] max-w-[calc(100vw-4rem)] sm:max-w-[calc(100vw-8rem)] transition-opacity duration-300",
                          lightboxImgLoaded ? "opacity-100" : "absolute inset-0 opacity-0"
                        )}
                        draggable={false}
                        // ── Pinch-zoom + pan (mobile) ──
                        // Smooth transition for double-tap zoom — same
                        // logic as the tall-image variant above. Only
                        // active while `zoomAnimating` is true so manual
                        // pinch/pan still tracks fingers 1:1.
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
                          setLightboxImgLoaded(true);
                          setLightboxReady(true);
                        }}
                        onError={() => {
                          setLightboxImgLoaded(true);
                          setLightboxReady(true);
                        }}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Capsule — arrows + counter.
                    Visibility is driven by `lightboxReady` (not per-image
                    `lightboxImgLoaded`) so the capsule does NOT unmount/
                    remount on each slide change. It appears once the first
                    image has loaded and stays mounted for the entire
                    lightbox session. Only the counter number updates
                    (a text change, not an animation).

                    The wrapper around the capsule reserves 20px of padding
                    on all sides and stops pointer events from propagating
                    to the overlay's close-on-tap handler. This way, taps
                    NEAR the capsule (within 20px) do NOT close the lightbox
                    — only taps on the actual empty overlay background do.

                    The wrapper has NO margin-top (mt-0) — the 20px gap
                    between the image and the capsule comes entirely from
                    the wrapper's top padding. This keeps the gap at exactly
                    20px (the safe-area padding doubles as the visual gap). */}
                {lightboxTotal > 1 && lightboxReady && (
                  <div
                    // ── Capsule wrapper (UNIFIED gap, mobile-tighter bottom) ──
                    // `mt-0` + `p-5` keeps a 20px safe-area around the capsule
                    // on all breakpoints (also doubles as the visual gap above
                    // the capsule). On MOBILE, `max-sm:pb-3` reduces the bottom
                    // padding from 20px → 12px (8px less) so the capsule sits a
                    // touch closer to the bottom edge of the lightbox — this
                    // matches the user's "reduce bottom margin by 8px" request
                    // and keeps mobile visually balanced with desktop.
                    className="mt-0 p-5 max-sm:pb-3"
                    onPointerDown={stopPropagation}
                    onPointerUp={stopPropagation}
                    onClick={stopPropagation}
                  >
                    {/* ── Capsule (slide nav) — 48px tall on mobile, 58px on desktop ──
                        The capsule groups prev/next arrows + slide counter.

                        Mobile (max-sm): `max-sm:h-12 max-sm:py-0` forces the
                        capsule to exactly 48px tall (h-12 = 3rem = 48px) with
                        NO vertical padding — the h-11 (44px) buttons sit
                        centered with 2px breathing room above/below. This
                        matches the user's "slide height 48px on mobile"
                        request and gives the mobile lightbox a tighter,
                        more thumb-friendly nav bar.

                        Desktop (sm+): keeps `py-1.5` (6px+6px) so the capsule
                        is 58px tall (44px button + 12px padding + 2px border)
                        — the original comfortable desktop size. Width stays
                        `w-64` (256px) on all breakpoints.

                        ── RTL-aware arrow direction ──
                        The capsule itself is ALWAYS `dir="ltr"` so the
                        ChevronLeft icon stays on the visual LEFT and the
                        ChevronRight icon stays on the visual RIGHT — what
                        changes between LTR and RTL is which ACTION each
                        chevron triggers:
                          - LTR (English): ChevronLeft → previous, ChevronRight → next
                          - RTL (Persian): ChevronLeft → next, ChevronRight → previous
                        This matches the Persian reading flow (right-to-left):
                        "back/previous" is to the right, "forward/next" is to
                        the left. The chevron icon always points in the
                        direction the user is conceptually moving. */}
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
                          The capsule container itself stays `dir="ltr"` so
                          the chevron icons don't mirror (chevron-left stays
                          on the visual left, chevron-right stays on the
                          visual right). BUT the counter span inside takes
                          its direction from the active locale so users read
                          the counter in their natural flow:

                          - Persian (RTL): `dir="rtl"`
                              Visual LTR:  [9] [از] [1]   (total left, current right)
                              RTL reading: 1 → از → 9     ✓ "1 از 9"
                              (Persian readers scan right-to-left, so the
                              current slide number sits on the RIGHT where
                              they start reading.)

                          - English (LTR): `dir="ltr"`
                              Visual LTR:  [1] [of] [9]
                              LTR reading: 1 → of → 9     ✓ "1 of 9"

                          Previously, forcing `dir="ltr"` for both locales
                          produced visual `1 از 9` for Persian, which
                          Persian readers scanning right-to-left perceived
                          as "9 از 1" — the opposite of what they expected.

                          The `<bdi>` wrappers on each number keep the
                          Unicode bidi algorithm from reordering the
                          numbers relative to each other or to the
                          separator word — each number is an isolated
                          run that takes its direction from the parent
                          `dir`, but cannot pull neighboring runs into
                          its own bidi level. This makes the visual
                          order deterministic regardless of which digits
                          (Persian or Latin) appear. */}
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

/* ── DevSolutionsThumb ────────────────────────────────────────────────
   Optimized gallery thumbnail for the Dev Solutions project.

   WHY THIS EXISTS — SmartImage (used by all other projects' gallery
   thumbnails) loads the RAW source URL directly into an <img>. For most
   projects the source images are reasonably sized, so this is fine. But
   Dev Solutions has two EXTREMELY heavy screenshots:
     - Image 1 "1-DS Index":  5760×13820 = 1.5MB (decoded bitmap ~320MB!)
     - Image 3 "3-Blog page": 5760×8012  = 775KB (decoded bitmap ~185MB)
   Loading these raw for a ~240px gallery thumbnail forced the browser to
   download 1.5MB AND allocate a 320MB decoded bitmap PER THUMBNAIL. The
   first batch of 3 thumbnails hit the modal with ~480MB of bitmap work
   simultaneously — the root cause of the "modal doesn't render properly
   with heavy images" bug the user reported.

   FIX — route through /_next/image?url=...&w=640&q=80 instead. Next.js's
   built-in image optimizer:
     1. Reads the source ONCE on the server (cached after first request).
     2. Resizes to w=640 preserving aspect ratio (image 1 becomes 640×1535).
     3. Re-encodes as webp at q=80.
     4. Returns ~80KB instead of 1.5MB.
   The decoded browser bitmap drops from 320MB → ~4MB (80× reduction).

   VISUAL IDENTITY — preserves EXACTLY the same appearance as the old
   SmartImage path:
     - Same 16:9 cell (set by the parent div's `aspect-[16/9]`)
     - Same `object-cover` crop behavior (image fills the cell)
     - Same `object-top` vertical alignment for tall portrait screenshots
       (so the preview starts from the TOP of the screenshot, not the
       middle) — controlled by `isTallPortrait`
     - Same `transition-transform duration-500 group-hover/img:scale-[1.02]`
       hover zoom (matches the rest of the gallery)
     - Same skeleton-shimmer placeholder while loading
     - Same fade-in on load (opacity-0 → opacity-100)
   The only difference is the underlying bytes — visually identical.

   HYDRATION-GAP FIX — same pattern as SmartImage: in a useEffect on mount,
   check if the <img> is already complete (from browser cache). If so, flip
   to loaded immediately and call onLoad so the parent's batch counter
   advances. Without this, navigating away from the modal and back would
   leave already-cached images stuck showing the skeleton placeholder
   because onLoad wouldn't fire for a cache hit.

   WIDTH CHOICE — w=640 was chosen because:
     - Desktop gallery is `grid-cols-3` inside a `max-w-3xl` (768px) modal
       → each cell is ~240px wide. On 2× retina, that's 480px of source
       data needed. w=640 gives 33% retina headroom.
     - Mobile gallery is `grid-cols-2` inside full viewport width minus
       padding → each cell is ~180px wide. On 2× retina, that's 360px.
       w=640 covers this comfortably too.
     - Going higher (w=828, w=1080) would slightly improve retina quality
       but increase payload + decode work — counter to the optimization
       goal. w=640 is the sweet spot.

   MEMOIZATION — wrapped in React.memo so the parent can re-render
   (e.g. during lightbox pinch-zoom, when `lightboxZoom` / `lightboxPan`
   update hundreds of times per second) WITHOUT causing this thumbnail
   to re-render. The thumbnail's only inputs are `src`, `alt`,
   `isTallPortrait` (all stable per cell), and `onLoad` (stabilized via
   `makeGalleryOnLoad` in the parent). So React.memo's shallow prop
   comparison will hit the cache and skip re-rendering entirely. This
   is critical for the Dev Solutions modal where the heavy thumbnails
   were previously being re-rendered on every pinch-zoom event.
*/
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

  // Hydration gap fix — if the image is already complete (browser cache),
  // flip to loaded immediately. Mirrors SmartImage's logic.
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
      {/* Skeleton placeholder while loading — same animation as SmartImage.
          Removed from the DOM once `loaded` is true so it doesn't keep
          painting behind the image. */}
      {!loaded && (
        <div className="absolute inset-0 skeleton-shimmer" aria-hidden="true" />
      )}
      <img
        ref={imgRef}
        src={optimizedSrc(src, 640, 80)}
        alt={alt}
        // Same loading strategy as SmartImage for non-critical images:
        // lazy + async decode + low priority. The gallery is below the
        // fold (after cover + overview + tools), so eager loading would
        // compete with the cover image for bandwidth.
        loading="lazy"
        decoding="async"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        fetchPriority="low"
        draggable={false}
        className={cn(
          // Mirror SmartImage's non-natural className structure exactly:
          //   relative + h-full w-full + object-cover
          // so the 16:9 cell crop behavior is identical.
          "relative h-full w-full object-cover",
          // Hide until loaded, fade in on load — same as SmartImage.
          // Note: like SmartImage, the `transition-opacity duration-300`
          // is overridden by the `transition-transform duration-500`
          // below (Tailwind's transition-transform class wins in CSS
          // specificity). So the image pops in (no fade) and then
          // transforms on hover with a 500ms transition. This matches
          // the existing gallery behavior exactly — no visual change.
          !loaded && "opacity-0",
          loaded && "opacity-100 transition-opacity duration-300",
          // Hover zoom — same as every other gallery cell.
          "transition-transform duration-500 ease-out group-hover/img:scale-[1.02]",
          // Vertical alignment for tall portrait screenshots — `object-top`
          // shows the TOP of the screenshot (the page header) instead of
          // the middle. Landscape screenshots stay centered (default).
          isTallPortrait ? "object-top" : ""
        )}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          // Treat errors as "done" so the parent's batch counter advances
          // even if an image fails — otherwise the next batch would never
          // start, leaving the gallery permanently stuck on a broken batch.
          setLoaded(true);
          onLoad?.();
        }}
      />
    </div>
  );
});