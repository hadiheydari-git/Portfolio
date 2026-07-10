"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { RevealItem } from "@/components/ui/reveal-on-scroll";
import type { Project } from "@/lib/content";
import { cn } from "@/lib/utils";

type Props = {
  project: Project;
  index: number;
  onOpen: (project: Project) => void;
  smCols?: number;
  lgCols?: number;
};

/**
 * Bento card — memoized to prevent re-renders when sibling cards
 * or parent state changes. Each card animates independently via
 * RevealItem (framer-motion variants, triggered by parent stagger).
 *
 * Performance notes:
 *   - next/image serves display-sized variants (covers are 4K–8K source files)
 *   - lazy loading — not on the critical loading gate path
 *   - No permanent will-change / compositor layers on scroll
 *   - Hover scale only (transform), no blur / shadow / filter effects
 */
const BentoCard = React.memo(function BentoCard({
  project,
  index,
  onOpen,
  smCols = 3,
  lgCols = 2,
}: Props) {
  const { t, tt, locale } = useLanguage();

  const handleClick = React.useCallback(() => {
    onOpen(project);
  }, [onOpen, project]);

  const smClass =
    smCols === 6 ? "sm:col-span-6" :
    smCols === 4 ? "sm:col-span-4" :
    smCols === 3 ? "sm:col-span-3" :
    smCols === 2 ? "sm:col-span-2" : "sm:col-span-1";

  const lgClass =
    lgCols === 6 ? "lg:col-span-6" :
    lgCols === 4 ? "lg:col-span-4" :
    lgCols === 3 ? "lg:col-span-3" :
    lgCols === 2 ? "lg:col-span-2" : "lg:col-span-1";

  const isFeature = lgCols >= 4;

  // Responsive `sizes` for next/image — tell the optimizer the TRUE rendered
  // width so it serves an appropriately-sized image. Previously this was a
  // hardcoded "400px" desktop hint, which caused Next.js to serve ~828px-wide
  // images for 4-column bento cards that actually render at ~792 CSS px
  // (~1584 effective px on a 2× retina display) — the browser then upscaled
  // ~1.9× and the cover looked blurry despite 4K–8K source files.
  //
  // Layout facts:
  //   - Mobile (<640px): single column → card spans 100vw.
  //   - Tablet (640–1023px): 6-col grid, card spans `smCols` of 6 → (smCols/6)×100vw.
  //   - Desktop (≥1024px): 6-col grid inside an 80rem (1280px) container with
  //     2.5rem padding each side → content ≈ 75rem. Card spans `lgCols` of 6 →
  //     (lgCols/6)×75rem. We round up slightly to avoid under-serving.
  const sizes = [
    "(max-width: 640px) 100vw",
    `(max-width: 1024px) ${(smCols / 6) * 100}vw`,
    `${Math.ceil((lgCols / 6) * 75)}rem`,
  ].join(", ");

  return (
    <RevealItem className={cn("relative", smClass, lgClass)}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "group relative flex h-[380px] w-full flex-col overflow-hidden rounded-3xl text-start",
          "[contain:paint]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "sm:h-[380px] lg:h-[380px]"
        )}
      >
        <Image
          src={project.cover}
          alt={tt(project.title)}
          fill
          sizes={sizes}
          quality={80}
          loading="lazy"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        {/* Bottom fade — single Tailwind gradient, no inline styles */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Mafia Master role badge — subtle animated gradient bg (CSS only) */}
        {project.id === "mafia-master" && (
          <div
            className={cn(
              "relative z-10 flex items-start p-5",
              locale === "fa" ? "justify-end" : "justify-end"
            )}
          >
            <span className="mafia-vibe-badge rounded-full border border-white/15 bg-black/90 px-3 py-1 text-xs font-medium text-white">
              {tt(project.role)}
            </span>
          </div>
        )}

        {/* Bottom content row — title/tagline on the right, "مشاهده" button
            on the left, both sharing the SAME bottom padding so their baselines
            align horizontally. The button uses a simple solid background with a
            hover color swap (dark → white, text inverts). */}
        <div className="relative z-10 mt-auto flex items-end justify-between gap-3 p-5 sm:p-6">
          {/* Text block: title + tagline, anchored to the start (right in RTL,
              left in LTR). Uses flex-col so title and tagline stack vertically. */}
          <div className="flex flex-col gap-2">
            <h3
              className={cn(
                "font-semibold tracking-tight text-balance text-white",
                isFeature ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
              )}
            >
              {tt(project.title)}
            </h3>
            <p className="line-clamp-2 max-w-md text-sm text-white/70">
              {tt(project.tagline)}
            </p>
          </div>

          {/* Glass button — sits at the opposite end (left in RTL, right in LTR).
              Uses items-end on the parent so the button's BOTTOM aligns with the
              tagline's BOTTOM (same bottom padding). pointer-events-none because
              the outer card is already a <button>; group-hover drives the color.
              Glass effect: semi-transparent bg + backdrop-blur + subtle inset
              highlight, same recipe as the site header. */}
          <div
            role="presentation"
            className={cn(
              "pointer-events-none inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md backdrop-saturate-150 transition-colors duration-300 group-hover:bg-white/25 group-hover:text-white",
              "[box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.15)]"
            )}
          >
            <span>{t("portfolio.viewProject")}</span>
            <ArrowUpRight
              className={cn(
                "h-3.5 w-3.5",
                locale === "fa" ? "-scale-x-100" : ""
              )}
            />
          </div>
        </div>
      </button>

      {/* Anti-aliasing edge cover — masks the ~1px light artifact at rounded
          corners and straight edges caused by overflow:hidden + border-radius.
          Implementation: a hollow box (transparent center, opaque edges) using
          a background-color matching the page bg.
          IMPORTANT: We use background-color (NOT outline, NOT border) because
          global CSS sets `* { outline-color: var(--ring) }` which some browsers
          render visibly. background-color is never overridden by accessibility
          styles and always renders the exact color we specify. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px -right-[2px] -bottom-px -left-px z-10 rounded-[33px] border-0 outline-none [box-shadow:none] [background:transparent] before:absolute before:inset-0 before:rounded-[33px] before:shadow-[inset_0_0_0_4px_var(--background)] before:content-['']"
      />
    </RevealItem>
  );
});

export { BentoCard };
