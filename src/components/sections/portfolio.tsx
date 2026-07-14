"use client";

import * as React from "react";
import { SectionHeading } from "@/components/sections/section-heading";
import { BentoCard } from "@/components/portfolio/bento-card";
import { ProjectModal } from "@/components/portfolio/project-modal";
import { RevealOnScroll, RevealItem } from "@/components/ui/reveal-on-scroll";
import { projects, type Project } from "@/lib/content";

const PROJECT_ORDER = [
  "dutar-dashboard",
  "dutar-shop",
  "dev-solutions",
  "mafia-master",
] as const;

// Column spans (out of 6) for sm and lg to create 2/3 + 1/3 rows
const SPANS = [
  { sm: 4, lg: 4 },
  { sm: 2, lg: 2 },
  { sm: 2, lg: 2 },
  { sm: 4, lg: 4 },
] as const;

// Pre-compute the ordered project list once at module level
const ORDERED_PROJECTS = PROJECT_ORDER
  .map((id) => projects.find((p) => p.id === id))
  .filter(Boolean) as typeof projects;

export function Portfolio() {
  const [active, setActive] = React.useState<Project | null>(null);
  const [open, setOpen] = React.useState(false);

  const handleOpen = React.useCallback((project: Project) => {
    setActive(project);
    setOpen(true);
  }, []);

  return (
    <section id="work" className="relative py-20 sm:py-28">
      {/* Heading reveals on its own — separate from the card grid so
          the grid's stagger fires when the CARDS enter the viewport,
          not when the heading does. */}
      <RevealOnScroll className="container-edge flex flex-col gap-12">
        <RevealItem>
          <SectionHeading
            labelKey="portfolio.label"
            titleKey="portfolio.title"
            subtitleKey="portfolio.subtitle"
            align="center"
          />
        </RevealItem>
      </RevealOnScroll>

      {/* Card grid — separate RevealOnScroll so stagger fires when cards enter view */}
      <RevealOnScroll staggerDelay={0.08} className="container-edge mt-12">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-5">
          {ORDERED_PROJECTS.map((project, i) => (
            <BentoCard
              key={project.id}
              project={project}
              index={i}
              onOpen={handleOpen}
              smCols={SPANS[i]?.sm}
              lgCols={SPANS[i]?.lg}
            />
          ))}
        </div>
      </RevealOnScroll>

      <ProjectModal project={active} open={open} onOpenChange={setOpen} />
    </section>
  );
}