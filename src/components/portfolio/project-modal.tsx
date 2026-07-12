"use client";

import * as React from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ZoomIn, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
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
  const lightboxIndex = lightboxImg && project ? project.gallery.indexOf(lightboxImg) : -1;
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

  const lightboxPrev = React.useCallback(() => {
    if (!project || lightboxTotal === 0) return;
    const newIdx = lightboxIndex <= 0 ? lightboxTotal - 1 : lightboxIndex - 1;
    setLightboxImg(project.gallery[newIdx]);
  }, [project, lightboxIndex, lightboxTotal]);

  const lightboxNext = React.useCallback(() => {
    if (!project || lightboxTotal === 0) return;
    const newIdx = lightboxIndex >= lightboxTotal - 1 ? 0 : lightboxIndex + 1;
    setLightboxImg(project.gallery[newIdx]);
  }, [project, lightboxIndex, lightboxTotal]);

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

  // Keyboard nav inside lightbox
  React.useEffect(() => {
    if (!lightboxImg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); lightboxPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); lightboxNext(); }
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
                      className="absolute end-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-background/70 backdrop-blur transition-colors duration-300 hover:bg-secondary sm:end-8 sm:top-8 dark:border-white/10"
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
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-border/60 bg-secondary/60 px-2.5 py-0.5 text-xs font-medium">
                              {tt(project.role)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {tt(project.year)}
                            </span>
                          </div>
                          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            {tt(project.title)}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {tt(project.tagline)}
                          </p>
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

                    {/* My role */}
                    <motion.div variants={itemVariants}>
                      <Section title={t("portfolio.modal.myRole")}>
                        <p className="text-sm leading-relaxed text-foreground/80 sm:text-[15px]">
                          {tt(project.roleDescription)}
                        </p>
                        <ul className="mt-4 flex flex-col gap-2.5">
                          {project.responsibilities.map((r, i) => {
                            const Icon = getResponsibilityIcon(r.fa, r.en);
                            return (
                              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/60">
                                  <Icon className="h-3 w-3" />
                                </span>
                                <span className="leading-relaxed">{tt(r)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </Section>
                    </motion.div>

                    {/* Tools (categorized) */}
                    <motion.div variants={itemVariants}>
                      <Section title={t("portfolio.modal.tools")}>
                        <div className="flex flex-col gap-4">
                          {CATEGORY_ORDER.map((cat) => {
                            const items = project.tools.filter(
                              (tool) => tool.category === cat
                            );
                            if (items.length === 0) return null;
                            return (
                              <div key={cat} className="flex flex-col gap-2">
                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                                  {t(`portfolio.modal.category.${cat}`)}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {items.map((tool) => (
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
                              </div>
                            );
                          })}
                        </div>
                      </Section>
                    </motion.div>

                    {/* Gallery */}
                    <motion.div variants={itemVariants}>
                      <Section title={t("portfolio.modal.gallery")}>
                      <div dir="ltr" className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3 sm:gap-2.5">
                        {project.gallery.map((img, i) => {
                          const aspectStyle = !isDevSolutions
                            ? { aspectRatio: String(img.aspectRatio ?? 1.5) }
                            : undefined;

                          if (!galleryReady) {
                            return (
                              <div
                                key={i}
                                className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-secondary/30"
                                aria-hidden="true"
                              >
                                <div
                                  className={cn(
                                    "relative w-full overflow-hidden bg-slate-200/10",
                                    isDevSolutions && "aspect-[16/9]"
                                  )}
                                  style={aspectStyle}
                                >
                                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-background via-secondary/10 to-background" />
                                </div>
                              </div>
                            );
                          }

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
                                <SmartImage
                                  src={img.src}
                                  alt={tt(img.alt)}
                                  natural={!isDevSolutions}
                                  aspectRatio={!isDevSolutions ? img.aspectRatio : undefined}
                                  skeleton
                                  gradientClassName={project.accent}
                                  // DEV-SOLUTIONS ONLY — when natural={false}, the
                                  // SmartImage root div needs explicit h-full w-full
                                  // so the inner <img>'s `h-full w-full object-cover`
                                  // can actually fill the parent. Without this, the
                                  // <img>'s percentage height collapses to its
                                  // natural height (because the SmartImage div is
                                  // height:auto), and ultra-wide screenshots (ratio
                                  // > 16/9) end up SHORTER than the 16:9 cell —
                                  // leaving an empty band at the bottom of the cell.
                                  // This mirrors how `header.tsx` and `hero.tsx`
                                  // already pass `className="h-full w-full"` to
                                  // SmartImage when using non-natural mode.
                                  className={isDevSolutions ? "h-full w-full" : undefined}
                                  imgClassName={cn(
                                    "transition-transform duration-500 ease-out group-hover/img:scale-[1.05]",
                                    // Vertical alignment inside the 16:9 cell.
                                    // - Portrait screenshots (aspectRatio < 1, e.g.
                                    //   "1-DS Index" at 0.417 and "3-Blog page" at
                                    //   0.719) are MUCH taller than the cell, so the
                                    //   default `object-position: center` would skip
                                    //   the top of the screenshot — showing the
                                    //   middle of the page instead of its header.
                                    //   `object-top` aligns the crop to the TOP so
                                    //   the preview starts from the beginning of
                                    //   the image.
                                    // - Landscape / ultra-wide screenshots (ratio
                                    //   >= 1, e.g. "2-Request" at 1.406 and the
                                    //   three new admin-panel shots at ~2.34) stay
                                    //   centered on both axes — this is the default
                                    //   `object-position: center` and matches the
                                    //   user's expectation for the new images.
                                    isDevSolutions &&
                                      img.aspectRatio !== undefined &&
                                      img.aspectRatio < 1
                                      ? "object-top"
                                      : ""
                                  )}
                                />
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
                  // ─── Lightbox overlay (desktop standards) ─────────────────────────
                  // Desktop (sm+): VERTICAL margins — 32px top (sm:pt-8) + 12px bottom
                  // (sm:pb-3). The bottom is 12px because the capsule wrapper adds
                  // 20px safe-area padding below the capsule, bringing the TOTAL
                  // bottom visual margin to 32px (12 + 20). Top is a full 32px
                  // because the image starts directly at the overlay top padding.
                  //
                  // GAP between image and capsule = 20px (the capsule wrapper's
                  // top padding, since mt is 0). This is the standard gap.
                  //
                  // HORIZONTAL margin is VARIABLE — driven by each image's own
                  // max-width (DevSolutions wide vs others tall).
                  //
                  // Mobile (max-sm): keep the existing scroll behavior.
                  "fixed inset-0 z-[200] flex flex-col items-center justify-start pt-10 pb-20 max-sm:px-6 pointer-events-auto overflow-y-auto sm:pt-6 sm:pb-6 max-sm:[touch-action:pan-y] max-sm:overscroll-contain scrollbar-none bg-black/50 backdrop-blur-md",
                  // Dev Solutions images are very tall (full-page screenshots).
                  // `sm:justify-center` would vertically center them, which
                  // pushes the top of the image above the viewport when the
                  // image is taller than the viewport. Using `sm:justify-start`
                  // for Dev Solutions keeps the image anchored to the top
                  // (with the sm:py-10 top padding) so it never overflows
                  // upward — the user scrolls down to see the rest.
                  isDevSolutions ? "sm:justify-start" : "sm:justify-center"
                )}
              // Stop wheel events from bubbling up to the document, where
              // `react-remove-scroll` (installed by Radix Dialog) captures
              // them with a non-passive listener and calls preventDefault().
              // Without this stopPropagation, the wheel event reaches the
              // document handler which kills the native scroll on this overlay.
              onWheelCapture={(e) => e.stopPropagation()}
              // Same for touchmove — `react-remove-scroll` also captures
              // touchmove at the document level and preventDefaults it for
              // any element not inside the modal's scroll lock group.
              onTouchMoveCapture={(e) => e.stopPropagation()}
              onPointerDown={(e) => {
                e.stopPropagation();
                // Record start position so we can distinguish a tap
                // (small movement) from a drag (intended to scroll).
                pointerDownRef.current = {
                  x: e.clientX,
                  y: e.clientY,
                  pointerId: e.pointerId,
                  // Remember whether pointer started inside the image wrapper.
                  // We need this so we DON'T close when the user taps the image
                  // (only the X button or the overlay background should close).
                  targetIsImage: imageWrapperRef.current
                    ? imageWrapperRef.current.contains(e.target as Node)
                    : false,
                };
              }}
              onPointerUp={(e) => {
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
              }}
            >
              <div className="flex flex-col items-center">

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
                      "relative inline-block max-sm:w-full rounded-2xl",
                      isDevSolutions ? "w-full overflow-hidden" : "sm:w-auto overflow-hidden"
                    )}
                    ref={imageWrapperRef}
                    // Show X on mouse enter / move; auto-hide after 1s of
                    // no movement. On mouse leave, hide immediately.
                    onMouseEnter={() => {
                      if (hideTimerRef.current) {
                        clearTimeout(hideTimerRef.current);
                      }
                      setIsImgHovered(true);
                      hideTimerRef.current = setTimeout(() => setIsImgHovered(false), 1000);
                    }}
                    onMouseMove={() => {
                      // Every mouse movement resets the 1s auto-hide timer.
                      if (hideTimerRef.current) {
                        clearTimeout(hideTimerRef.current);
                      }
                      setIsImgHovered(true);
                      hideTimerRef.current = setTimeout(() => setIsImgHovered(false), 1000);
                    }}
                    onMouseLeave={() => {
                      if (hideTimerRef.current) {
                        clearTimeout(hideTimerRef.current);
                      }
                      setIsImgHovered(false);
                    }}
                  >
                    {/* Skeleton placeholder while the lightbox image loads.
                        Shown ONLY for non-DevSolutions projects. DevSolutions
                        has its own skeleton inside its branch (below) that
                        matches its taller image wrapper — rendering both at
                        once caused a double-skeleton bug. */}
                    {!isDevSolutions && (lightboxImgLoaded ? null : (
                      <div className="skeleton-shimmer h-[60vh] w-full max-w-[calc(100vw-4rem)] rounded-2xl sm:h-[70vh] sm:w-auto sm:min-w-[280px]" aria-hidden="true" />
                    ))}

                    {/* Close button — larger tap target.
                        On desktop (hover-capable): visible while mouse is
                        moving over the image, auto-hides after 1s of no
                        movement, hides on mouse leave.
                        On mobile (touch-only): always visible via the
                        [@media(hover:none)] CSS override. */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImg(null);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
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

                    {isDevSolutions ? (
                      <div className="relative w-full overflow-auto scrollbar-none flex items-start justify-center" style={{ maxHeight: 'calc(100vh - 142px)' }}>
                        <div
                          className="w-full"
                          style={{
                            // Dev Solutions images are WIDE (landscape full-page
                            // screenshots). Cap the width so the lightbox never
                            // spans edge-to-edge on desktop — this reserves a
                            // comfortable horizontal margin on both sides.
                            // 1100px max-width + (100vw - 8rem) viewport guard.
                            maxWidth: 'min(calc(100vw - 8rem), 1100px)'
                          }}
                        >
                          {/* Container enforces max height; outer overlay handles scrolling.
                              The skeleton lives INSIDE the same max-h wrapper as the image
                              and uses the SAME width + max-height so the skeleton matches
                              the image's final footprint — no layout jump when the image
                              replaces the skeleton.
                              `relative` so the absolutely-positioned hidden img (during
                              loading) is anchored to THIS wrapper, not an ancestor.

                              IMPORTANT: The skeleton uses an EXPLICIT width
                              (min(calc(100vw - 8rem), 1100px)) instead of `width: 100%`.
                              This is because the motion.div parent is `inline-block`,
                              which derives its width from its content. During loading,
                              the image is `absolute` (out of flow), so the only in-flow
                              content is the skeleton. With `width: 100%` the skeleton
                              would be 0px wide (circular dependency: parent width comes
                              from child, child width is 100% of parent). Using an
                              explicit width breaks the cycle and makes the skeleton
                              exactly match the image's loaded width.

                              HEIGHT STANDARD: calc(100vh - 142px) = viewport minus
                              32px top overlay padding + 12px bottom overlay padding
                              + 98px capsule wrapper (20px top safe-area/gap +
                              58px capsule + 20px bottom safe-area).
                              This guarantees:
                                • top margin (viewport → image) = 32px
                                • gap (image → capsule) = 20px (wrapper top padding)
                                • bottom margin (viewport → capsule) = 32px
                                  (12px overlay pb + 20px wrapper bottom padding)
                                • NO overlay scroll on desktop
                              The image scrolls INTERNALLY (overflow-auto on this
                              wrapper) for very tall DevSolutions screenshots. */}
                          <div className="relative max-h-[calc(100vh-142px)] overflow-auto scrollbar-none">
                            {lightboxImgLoaded ? null : (
                              <div
                                className="skeleton-shimmer rounded-2xl"
                                style={{
                                  width: 'min(calc(100vw - 8rem), 1100px)',
                                  height: 'calc(100vh - 142px)',
                                }}
                                aria-hidden="true"
                              />
                            )}

                            <img
                              src={encodeSrc(lightboxImg.src)}
                              alt={tt(lightboxImg.alt)}
                              className={cn(
                                "w-full h-auto block transition-opacity duration-300",
                                lightboxImgLoaded ? "opacity-100" : "absolute inset-0 opacity-0"
                              )}
                              draggable={false}
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
                        </div>
                      </div>
                    ) : (
                      <img
                        src={encodeSrc(lightboxImg.src)}
                        alt={tt(lightboxImg.alt)}
                        className={cn(
                          // Tall/portrait screenshots: render at natural width
                          // (sm:w-auto) so the horizontal margin is naturally
                          // large (the image is narrow). Caps ensure the image
                          // never touches the viewport edges even on very small
                          // desktop windows.
                          //
                          // HEIGHT STANDARD: sm:max-h-[calc(100vh-142px)] ensures
                          // the ENTIRE image auto-fits in the desktop viewport
                          // alongside the capsule — NO overlay scroll, NO internal
                          // image scroll. 142px = 32px top + 12px bottom overlay
                          // padding + 98px capsule wrapper (20+58+20).
                          // Result: top margin 32px, gap 20px, bottom margin 32px.
                          //
                          // sm:max-w is the horizontal safety cap (100vw - 8rem
                          // = 64px margin each side minimum).
                          "h-auto w-full block sm:w-auto sm:max-h-[calc(100vh-142px)] sm:max-w-[calc(100vw-8rem)] transition-opacity duration-300",
                          lightboxImgLoaded ? "opacity-100" : "absolute inset-0 opacity-0"
                        )}
                        draggable={false}
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
                    className="mt-0 p-5"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div dir="ltr" className="flex w-64 items-center justify-between rounded-full border border-white/20 bg-black/60 px-2 py-1.5 backdrop-blur-sm">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors duration-200 hover:text-white"
                        aria-label="Previous"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <span className="mx-2 h-5 w-px bg-white/20" />
                      <span className="flex items-center gap-2 text-sm font-medium text-white/90">
                        <span>{lightboxIndex + 1}</span>
                        <span>{t("portfolio.modal.slideOf")}</span>
                        <span>{lightboxTotal}</span>
                      </span>
                      <span className="mx-2 h-5 w-px bg-white/20" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors duration-200 hover:text-white"
                        aria-label="Next"
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