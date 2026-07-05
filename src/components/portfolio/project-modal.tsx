"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Check, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SmartImage } from "@/components/ui/smart-image";
import { ToolIcon } from "@/components/ui/tool-icon";
import type { Project, ToolCategory, GalleryImage } from "@/lib/content";
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
  // animations don't try to start during a delayed container mount.
  const [contentAnimate, setContentAnimate] = React.useState(
    () => prefersReducedMotion
  );
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
    if (open) {
      setContentAnimate(prefersReducedMotion);
    } else {
      setContentAnimate(false);
      if (parentAnimationTimerRef.current) {
        clearTimeout(parentAnimationTimerRef.current);
        parentAnimationTimerRef.current = null;
      }
    }
  }, [open, prefersReducedMotion]);

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
        {open && project && (
          <DialogPrimitive.Portal forceMount>
            {/* Backdrop — hidden behind lightbox's opaque bg when lightbox is open */}
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md"
              />
            </DialogPrimitive.Overlay>

            {/* Content */}
            <DialogPrimitive.Content
              asChild
              onPointerDownOutside={lightboxImg ? (e) => e.preventDefault() : undefined}
              onInteractOutside={lightboxImg ? (e) => e.preventDefault() : undefined}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                // When the parent entrance animation completes we trigger
                // the inner staggered content to animate. For slow or
                // delayed first-open scenarios we wait a short fixed
                // buffer (parent animation duration + small margin)
                // to avoid child animations running too quickly.
                onAnimationComplete={() => {
                  if (prefersReducedMotion) {
                    setContentAnimate(true);
                    return;
                  }
                  if (parentAnimationTimerRef.current) {
                    clearTimeout(parentAnimationTimerRef.current);
                  }
                  parentAnimationTimerRef.current = window.setTimeout(() => {
                    setContentAnimate(true);
                    parentAnimationTimerRef.current = null;
                  }, 40); // small buffer to keep entrance snappy
                }}
                style={{ borderWidth: 0 }}
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-3xl flex-col rounded-t-[2rem] sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem]",
                  lightboxImg
                    ? "max-h-none overflow-hidden border-0 bg-transparent pointer-events-none"
                    : "max-h-[92vh] overflow-hidden bg-background shadow-2xl sm:max-h-[88vh]"
                )}
              >
                {/* Close button — hidden when lightbox is open.
                    Positioned to match the modal body's padding (p-6 on
                    mobile = 1.5rem, sm:p-8 on desktop = 2rem) so the X
                    aligns with the inner content edge instead of hugging
                    the modal border. Sized to match the lightbox close
                    button (h-11 w-11 / X h-5 w-5) for visual consistency. */}
                {!lightboxImg && (
                  <DialogPrimitive.Close
                    className="absolute end-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-background/70 backdrop-blur transition-all duration-300 hover:bg-secondary sm:end-8 sm:top-8 dark:border-white/10"
                    aria-label={t("portfolio.modal.close")}
                  >
                    <X className="h-5 w-5" />
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
                    style={{ backgroundColor: "var(--background)", marginBottom: -2 }}
                    className="relative aspect-[16/9] w-full overflow-hidden rounded-t-[2rem] sm:rounded-t-[2rem]"
                  >
                    <motion.div
                      initial="hidden"
                      animate="show"
                      variants={
                        prefersReducedMotion
                          ? coverMediaVariantsReduced
                          : coverMediaVariants
                      }
                      className="h-full w-full origin-center"
                    >
                      {isDevSolutions ? (
                        <video
                          src="/videos/dev-solutions-demo.webm"
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <SmartImage
                          key={`${project.id}-cover`}
                          src={project.cover}
                          alt={tt(project.title)}
                          critical
                          className="h-full w-full"
                        />
                      )}
                    </motion.div>
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
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
                          {project.responsibilities.map((r, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/60">
                                <Check className="h-3 w-3" />
                              </span>
                              <span className="leading-relaxed">{tt(r)}</span>
                            </li>
                          ))}
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
                        {project.gallery.map((img, i) => (
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
                            style={
                              !isDevSolutions && img.aspectRatio
                                ? { aspectRatio: String(img.aspectRatio) }
                                : undefined
                            }
                          >
                              <SmartImage
                                src={img.src}
                                alt={tt(img.alt)}
                                natural={!isDevSolutions}
                                aspectRatio={!isDevSolutions ? img.aspectRatio : undefined}
                                skeleton
                                gradientClassName={project.accent}
                                imgClassName="transition-transform duration-500 ease-out group-hover/img:scale-[1.05]"
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
                        ))}
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
                  "fixed inset-0 z-[200] flex flex-col items-center justify-start pt-10 pb-20 max-sm:px-6 pointer-events-auto overflow-y-auto sm:pt-8 sm:pb-3 max-sm:[touch-action:pan-y] max-sm:overscroll-contain scrollbar-none bg-black/50 backdrop-blur-md",
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