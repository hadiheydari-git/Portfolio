"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { RevealItem } from "@/components/ui/reveal-on-scroll";
import { cn } from "@/lib/utils";

type Props = {
  labelKey: string; // e.g. "portfolio.label"
  titleKey: string; // e.g. "portfolio.title"
  subtitleKey?: string;
  align?: "start" | "center";
  className?: string;
};

export function SectionHeading({
  labelKey,
  titleKey,
  subtitleKey,
  align = "center",
  className,
}: Props) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-start",
        className
      )}
    >
      <RevealItem>
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
          {t(labelKey)}
        </span>
      </RevealItem>

      <RevealItem>
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
          {t(titleKey)}
        </h2>
      </RevealItem>

      {subtitleKey && (
        <RevealItem className={cn(
          "max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base",
          align === "center" ? "mx-auto" : ""
        )}>
          {t(subtitleKey)}
        </RevealItem>
      )}
    </div>
  );
}
