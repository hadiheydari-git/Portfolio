"use client";

import * as React from "react";
import {
  PenTool,
  Workflow,
  Wrench,
  // Design icons
  LayoutGrid,
  PencilRuler,
  FlaskConical,
  MousePointerClick,
  PenLine,
  // Process icons
  Lightbulb,
  GitBranch,
  Search,
  Scale,
  Rocket,
  // Tool icons
  Figma,
  SquareStack,
  Smartphone,
  FileText,
  Image,
  PenTool as PenToolIcon,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";
import { RevealOnScroll, RevealItem } from "@/components/ui/reveal-on-scroll";
import { skillGroups } from "@/lib/content";

/* ──────────────────────────────────────────────────────────────────────
 * Category-level icons (for the 3 group headers)
 * ──────────────────────────────────────────────────────────────────── */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  design: <PenTool className="h-5 w-5" />,
  process: <Workflow className="h-5 w-5" />,
  tools: <Wrench className="h-5 w-5" />,
};

/* ──────────────────────────────────────────────────────────────────────
 * Per-keyword icons — each keyword gets a unique, relevant Lucide icon.
 * The key is the English version of the keyword (stable across languages).
 * ──────────────────────────────────────────────────────────────────── */
const KEYWORD_ICONS: Record<string, LucideIcon> = {
  // Design
  "Design Systems": LayoutGrid,
  Wireframing: PencilRuler,
  Prototyping: FlaskConical,
  "UI / UX": MousePointerClick,
  Copywriting: PenLine,
  // Process
  "Problem-Solving": Lightbulb,
  "User Flow": GitBranch,
  "User Research": Search,
  "Competitor Analysis": Scale,
  "MVP Definition": Rocket,
  // Tools
  Figma: Figma,
  FigJam: SquareStack,
  ProtoPie: Smartphone,
  Notion: FileText,
  Photoshop: Image,
  Illustrator: PenToolIcon,
};

/** Get the icon for a keyword; falls back to a generic dot if no match. */
function getKeywordIcon(en: string): LucideIcon | null {
  return KEYWORD_ICONS[en] || null;
}

export function Skills() {
  const { tt } = useLanguage();

  return (
    <section id="skills" className="relative py-20 sm:py-28">
      <RevealOnScroll staggerDelay={0.1} className="container-edge flex flex-col gap-12">
        <SectionHeading
          labelKey="skills.label"
          titleKey="skills.title"
          subtitleKey="skills.subtitle"
          align="center"
        />

        {/* Category cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {skillGroups.map((group, i) => (
            <RevealItem key={group.id} className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-black/10 bg-card p-6 shadow-card transition-all duration-500 hover:-translate-y-1 hover:shadow-lifted dark:border-white/10">
              {/* Icon + title + count — all in one row. */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground/70 transition-colors group-hover:bg-foreground group-hover:text-background">
                  {CATEGORY_ICONS[group.id]}
                </div>
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-base font-semibold tracking-tight">
                    {tt(group.label)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {tt(group.description)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item, idx) => {
                  const Icon = getKeywordIcon(item.en);
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary"
                    >
                      {Icon ? (
                        <Icon className="h-3.5 w-3.5 text-foreground/60" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                      )}
                      {tt(item)}
                    </span>
                  );
                })}
              </div>
            </RevealItem>
          ))}
        </div>
      </RevealOnScroll>
    </section>
  );
}
