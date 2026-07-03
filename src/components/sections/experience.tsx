"use client";

import * as React from "react";
import {
  Briefcase,
  Check,
  Target,
  Search,
  PenTool,
  FlaskConical,
  Layout,
  Users,
  Settings2,
  Zap,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";
import { RevealOnScroll, RevealItem } from "@/components/ui/reveal-on-scroll";
import { experiences } from "@/lib/content";

/**
 * Picks a topical icon for a responsibility based on keywords in its text
 * (matched against both fa + en). Falls back to a generic check-style icon.
 */
const RESPONSIBILITY_ICONS: { keywords: string[]; icon: LucideIcon }[] = [
  // Research / analysis / competitors / users
  {
    keywords: ["تحقیق", "research", "analy", "رقبا", "competitor", "کاربر", "user", "نیاز", "need"],
    icon: Search,
  },
  // Design / wireframe / UI / UX / design system
  {
    keywords: ["طراحی", "design", "وایرفریم", "wireframe", "رابط", "interface", "سیستم طراحی", "design system", "کامپوننت", "component"],
    icon: PenTool,
  },
  // Testing / experiments / iteration
  {
    keywords: ["آزمایش", "test", "نسخه", "version", "تجربه", "experience"],
    icon: FlaskConical,
  },
  // Layout / flows / features / categorization
  {
    keywords: ["یوزر فلو", "user flow", "ویژگی", "feature", "دسته‌بندی", "categor", "صفحه", "page", "پنل", "panel"],
    icon: Layout,
  },
  // Collaboration / co-founder / leading / clients
  {
    keywords: ["همکار", "team", "مشتری", "client", "هم‌بنیان", "co-found", "هدایت", "lead", "تأسیس", "found"],
    icon: Users,
  },
  // Settings / management / admin
  {
    keywords: ["مدیریت", "manage", "تنظیم", "config", "ساعت", "hour", "تخفیف", "discount", "سفارش", "order"],
    icon: Settings2,
  },
  // Fast / AI / vibe coding / rapid
  {
    keywords: ["سریع", "fast", "هوش", "AI", "vibe", "تکرار", "iterat"],
    icon: Zap,
  },
  // Growth / MVP / prioritize / market
  {
    keywords: ["رشد", "growth", "MVP", "اولویت", "priorit", "بازار", "market", "هدف", "goal"],
    icon: TrendingUp,
  },
];

function getResponsibilityIcon(fa: string, en: string): LucideIcon {
  const text = (fa + " " + en).toLowerCase();
  for (const rule of RESPONSIBILITY_ICONS) {
    if (rule.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return rule.icon;
    }
  }
  return Check as unknown as LucideIcon;
}

export function Experience() {
  const { t, tt } = useLanguage();

  return (
    <section id="experience" className="relative py-20 sm:py-28">
      <RevealOnScroll staggerDelay={0.1} className="container-edge flex flex-col gap-12">
        <SectionHeading
          labelKey="experience.label"
          titleKey="experience.title"
          subtitleKey="experience.subtitle"
          align="center"
        />

        {/* Career timeline — NO vertical connector bar; pure spacing + card hierarchy */}
        <div className="flex flex-col gap-6">
          {experiences.map((exp, i) => (
            <RevealItem key={exp.id} className="relative">
            <article className="relative">
              <div className="glass-card rounded-3xl border border-black/10 p-6 shadow-card sm:p-8 dark:border-white/10">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-secondary/60 text-foreground/60 sm:flex dark:border-white/10">
                      <Briefcase className="h-4 w-4" />
                    </span>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                        {tt(exp.role)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {tt(exp.company)}
                        {exp.current && (
                          <span className="ms-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {t("experience.present")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {tt(exp.period)}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-foreground/75 sm:text-[15px]">
                  {tt(exp.summary)}
                </p>

                {/* responsibilities */}
                <div className="mt-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("experience.keyResponsibilities")}
                  </span>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {exp.responsibilities.map((r, idx) => {
                      const Icon = getResponsibilityIcon(r.fa, r.en);
                      return (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-sm text-foreground/75"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/60">
                            <Icon className="h-3 w-3" />
                          </span>
                          <span className="leading-relaxed">{tt(r)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* goal */}
                {exp.goal && (
                  <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-black/10 bg-secondary/40 p-4 dark:border-white/10">
                    <Target className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm leading-relaxed text-foreground/75">
                      <span className="font-medium text-foreground">
                        {t("experience.goal")}:
                      </span>{" "}
                      {tt(exp.goal)}
                    </p>
                  </div>
                )}
              </div>
            </article>
            </RevealItem>
          ))}
        </div>
      </RevealOnScroll>
    </section>
  );
}
