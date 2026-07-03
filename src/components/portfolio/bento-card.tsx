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

  return (
    <RevealItem className={cn(smClass, lgClass)}>
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
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 400px"
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

        <div className="relative z-10 mt-auto flex flex-col gap-2 p-5 sm:p-6">
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
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors group-hover:text-white">
            <span>{t("portfolio.viewProject")}</span>
            <ArrowUpRight
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                locale === "fa" ? "-scale-x-100" : "",
                "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              )}
            />
          </div>
        </div>
      </button>
    </RevealItem>
  );
});

export { BentoCard };
