"use client";

import * as React from "react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import { SmartImage } from "@/components/ui/smart-image";
import { profile, heroStats } from "@/lib/content";
import { CountUp, toPersianDigits } from "@/components/ui/count-up";
import { RevealOnScroll, RevealItem } from "@/components/ui/reveal-on-scroll";
import { cn } from "@/lib/utils";

export function Hero() {
  const { t, tt, locale } = useLanguage();
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-background pt-32 pb-20 sm:pt-[164px] sm:pb-28"
    >
      {/* Decorative aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="aurora bg-foreground/10 dark:bg-foreground/5"
          style={{
            width: "60vw",
            height: "60vw",
            top: "-20%",
            insetInlineStart: "-10%",
          }}
        />
        <div
          className="aurora bg-foreground/[0.07] dark:bg-foreground/[0.04]"
          style={{
            width: "50vw",
            height: "50vw",
            bottom: "-25%",
            insetInlineEnd: "-10%",
          }}
        />
        {/* Grid texture — decorative squares, very subtle (per spec: 0.02 light / 0.04 dark) */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 35%, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 35%, black 30%, transparent 75%)",
          }}
        />
      </div>

      <RevealOnScroll staggerDelay={0.08} className="container-edge grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Visual column — profile image (mobile: first, desktop: right) */}
        <RevealItem className={cn(
            "relative order-1 w-full mx-auto aspect-square rounded-[2rem] lg:order-2 lg:max-w-sm lg:rounded-[2.5rem]",
            locale === "en" ? "lg:ml-auto lg:mr-0" : "lg:mr-auto lg:ml-0"
          )}>
          <div className="h-full w-full overflow-hidden rounded-[2rem] border border-black/10 shadow-lifted lg:rounded-[2.5rem]">
            <SmartImage
              src="/hadi-heydari-headshot.webp"
              alt={tt(profile.name)}
              className="h-full w-full"
              critical
              criticalKey="hero:headshot"
            />
          </div>

          {/* Floating badges — slightly outside image on all screen sizes */}
          <div className={cn("absolute -top-4 flex items-center gap-1.5 rounded-2xl border border-black/10 bg-card/90 backdrop-blur-sm px-3 py-2 text-xs font-medium shadow-card dark:border-white/10 lg:bg-card lg:backdrop-blur-none animate-float", locale === "en" ? "-left-4" : "-right-4")}>
            <span className="text-foreground">✦</span>
            {t("hero.badgeDesignSystems")}
          </div>
          <div className={cn("absolute -bottom-4 flex items-center gap-1.5 rounded-2xl border border-black/10 bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-card dark:border-white/10 animate-float animate-float-delay", locale === "en" ? "-right-4" : "-left-4")}>
            <span>✦</span>
            {t("hero.badgeProductDesign")}
          </div>
        </RevealItem>

        {/* Text column */}
        <div className="flex flex-col items-start gap-6 order-2 lg:order-1">
          <RevealItem className="flex flex-col gap-3">
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="text-foreground dark:text-white">{tt(profile.name)}</span>
            </h1>

            <p className="text-base font-medium tracking-tight text-muted-foreground sm:text-2xl">
              {t("hero.title")}
            </p>
          </RevealItem>

          {/* About Me integrated directly into the hero */}
          <RevealItem className="relative max-w-xl mt-[32px]">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
              {t("hero.aboutLabel")}
            </div>
            <p className="text-pretty text-base leading-relaxed text-foreground/80 sm:text-lg">
              {tt(profile.about)}
            </p>
          </RevealItem>

          {/* CTAs */}
          <RevealItem className="flex flex-wrap items-center gap-3">
            <Link
              href="#work"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground btn-primary-hover transition-[background-color] duration-150"
            >
              {t("hero.ctaWork")}
            </Link>
            <a
              href="tel:+989352126934"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-background/40 px-6 text-sm font-medium btn-secondary-hover transition-[background-color] duration-150 dark:border-white/10"
            >
              {t("hero.ctaContact")}
            </a>
          </RevealItem>

          {/* Stats — numbers count up from 0; each number is centered over its label */}
          <RevealItem className="mt-2 flex w-full max-w-md items-start gap-8">
            {heroStats.map((stat, i) => {
              // Parse the numeric target (strip "+", parse digits — supports fa/en)
              const raw = locale === "fa" ? stat.value : stat.valueEn;
              const hasPlus = raw.includes("+");
              const persianRaw = raw.replace(/[+]/g, "").replace(/[۰-۹]/g, (d) =>
                String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
              );
              const target = Number(persianRaw);

              return (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-2xl font-semibold tracking-tight sm:text-3xl tabular-nums">
                    {Number.isFinite(target) ? (
                      <CountUp to={target}>
                        {(v) =>
                          (locale === "fa"
                            ? toPersianDigits(Math.round(v))
                            : String(Math.round(v))) + (hasPlus ? "+" : "")
                        }
                      </CountUp>
                    ) : (
                      raw
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    {tt(stat.label)}
                  </span>
                </div>
              );
            })}
          </RevealItem>
        </div>
      </RevealOnScroll>
    </section>
  );
}
