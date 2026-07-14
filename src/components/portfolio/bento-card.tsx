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

  const smClass = "";

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
  //   - Mobile (<1024px): single column → card spans 100vw.
  //   - Desktop (≥1024px): 6-col grid with content width varying from 56rem
  //     (at 1024px viewport) to 104rem (at ≥2560px, capped). We use 84rem
  //     (content width at 1920px) as the reference — a reasonable upper
  //     bound that avoids both under-serving on large desktops and
  //     excessive over-fetching on smaller ones. Card spans `lgCols` of 6
  //     → (lgCols/6)×84rem.
  const sizes = [
    "(max-width: 1024px) 100vw",
    `${Math.ceil((lgCols / 6) * 84)}rem`,
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

        {/* Bottom fade — dark gradient overlay on the lower portion of the
            card image so the title/tagline stay readable.
            Mafia Master & Dev Solutions have brighter covers, so they get a
            taller + stronger fade (h-2/3, with an extra via stop) so the
            shadow actually reads ON the image instead of vanishing. The
            other two projects keep the original lighter fade. */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent",
            project.id === "mafia-master" || project.id === "dev-solutions"
              ? "h-2/3 from-black/95 via-black/60 via-black/25"
              : "h-1/2 from-black/85 via-black/40"
          )}
        />

        {/* Mafia Master role badge — same styling as the role badge inside
            the project modal (theme-token based, no animation). */}
        {project.id === "mafia-master" && (
          <div
            className={cn(
              "relative z-10 flex items-start p-5",
              locale === "fa" ? "justify-end" : "justify-end"
            )}
          >
            <span className="rounded-full border border-border/60 bg-secondary/60 px-2.5 py-0.5 text-xs font-medium">
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

      {/* Anti-aliasing edge cover + thin border — masks the ~1px light artifact
          at rounded corners (4px background-colored ring via ::before) AND draws
          a thin border (via ::after) flush with the inner edge of that ring,
          i.e. flush with the visible image edge.

          ::before = mask ring: inset 0 0 0 4px var(--background) at rounded-[33px]
          ::after  = border:     inset 0 0 0 1px (black/10 or white/10) at
                     inset-[4px] / rounded-[29px] (= 33 - 4, matching the ring's
                     inner curve so the border follows the same corner shape).

          IMPORTANT: background-color (NOT outline/border) is used for the mask
          ring because global CSS sets `* { outline-color: var(--ring) }`. The
          border is an inset box-shadow on ::after so it doesn't trigger the
          outline-color override either. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px -right-[2px] -bottom-px -left-px z-10 rounded-[33px] border-0 outline-none [box-shadow:none] [background:transparent] before:absolute before:inset-0 before:rounded-[33px] before:shadow-[inset_0_0_0_4px_var(--background)] before:content-[''] after:absolute after:inset-[4px] after:rounded-[29px] after:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] dark:after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] after:content-['']"
      />
    </RevealItem>
  );
});

export { BentoCard };
