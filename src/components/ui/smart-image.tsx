"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAssetQueue } from "@/hooks/use-asset-queue";

type Props = {
  src: string;
  alt: string;
  className?: string;
  gradientClassName?: string;
  imgClassName?: string;
  /** Natural aspect ratio — image is shown in full without cropping. */
  natural?: boolean;
  /** Explicit aspect ratio (width/height) for CLS prevention. */
  aspectRatio?: number;
  /** Show skeleton shimmer placeholder while loading. */
  skeleton?: boolean;
  /**
   * Critical image — gates page visibility.
   * Reports load to LoadingGateProvider.
   * No placeholder is shown (page is hidden until ready anyway).
   */
  critical?: boolean;
  /** Unique key for critical image tracking (must match a key in criticalKeys). */
  criticalKey?: string;
  /**
   * `sizes` attribute for the underlying <img>.
   * Only used when the component is upgraded to next/image.
   * Currently unused — kept for API compatibility.
   */
  sizes?: string;
  /** Image quality (1-100). Currently unused — kept for API compatibility. */
  quality?: number;
};

/**
 * Smart image with lazy loading, placeholder, and critical-path support.
 *
 * Key design:
 * - The <img> is ALWAYS rendered in the DOM so it can load and fire
 *   onLoad/onError. For non-critical images it starts invisible
 *   (opacity-0) and fades in once loaded.
 * - Critical images report to LoadingGateProvider.
 * - Non-critical images show a skeleton/gradient placeholder until loaded.
 *
 * NOTE: For the project modal cover, use `next/image` directly instead of
 * SmartImage — the modal cover source images are 8K and a plain <img>
 * forces the browser to bilinearly downscale 11× (8640px → 768px display),
 * producing a subtle blur. next/image generates proper srcset variants so
 * the browser receives an appropriately-sized image. See project-modal.tsx.
 */
export function SmartImage({
  src,
  alt,
  className,
  gradientClassName,
  imgClassName,
  natural = false,
  aspectRatio,
  skeleton = false,
  critical = false,
  criticalKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sizes: _sizes,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  quality: _quality,
}: Props) {
  const { reportCritical } = useAssetQueue();
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const encodedSrc = React.useMemo(
    () => encodeURI(src).replace(/&/g, "%26"),
    [src],
  );

  const showPlaceholder = !critical && !loaded && !failed;

  const handleLoad = React.useCallback(() => {
    setLoaded(true);
    if (critical && criticalKey) reportCritical(criticalKey);
  }, [critical, criticalKey, reportCritical]);

  const handleError = React.useCallback(() => {
    setFailed(true);
    if (critical && criticalKey) reportCritical(criticalKey);
  }, [critical, criticalKey, reportCritical]);

  // Hydration gap fix
  const imgRef = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
      if (critical && criticalKey) reportCritical(criticalKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle: React.CSSProperties = React.useMemo(() => {
    if (natural && aspectRatio) return { aspectRatio: String(aspectRatio) };
    return {};
  }, [natural, aspectRatio]);

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        natural && "w-full",
        className,
      )}
      style={containerStyle}
    >
      {/* ── Placeholder — shown for non-critical images while loading ── */}
      {showPlaceholder && (
        <>
          {skeleton ? (
            <div className="absolute inset-0 skeleton-shimmer" aria-hidden="true" />
          ) : gradientClassName ? (
            <div
              className={cn("absolute inset-0 bg-gradient-to-br", gradientClassName)}
            />
          ) : null}

          {!skeleton && (
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
          )}
        </>
      )}

      {/* ── Error fallback — show placeholder permanently ── */}
      {failed && !skeleton && gradientClassName && (
        <div
          className={cn("absolute inset-0 bg-gradient-to-br", gradientClassName)}
        />
      )}

      {/* ── Image — ALWAYS in the DOM so it can load.
           Non-critical: invisible until loaded, then fades in.
           Critical: visible immediately (page is hidden anyway). ── */}
      <img
        ref={imgRef}
        src={encodedSrc}
        alt={alt}
        loading={critical ? "eager" : "lazy"}
        onLoad={handleLoad}
        onError={handleError}
        decoding={critical ? "sync" : "async"}
        fetchPriority={critical ? "high" : "low"}
        draggable={false}
        className={cn(
          "relative",
          natural
            ? "block h-auto w-full object-contain"
            : "h-full w-full object-cover",
          // Non-critical: hide until loaded, then transition in
          !critical && !loaded && !failed && "opacity-0",
          !critical && loaded && "opacity-100 transition-opacity duration-300",
          imgClassName,
        )}
      />
    </div>
  );
}
