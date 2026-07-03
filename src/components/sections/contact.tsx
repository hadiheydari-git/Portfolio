"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MapPin, Phone, Check } from "lucide-react";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";
import { RevealOnScroll, RevealItem } from "@/components/ui/reveal-on-scroll";

const PHONE_NUMBER = "+989352126934";

export function Contact() {
  const { t, locale } = useLanguage();

  return (
    <section id="contact" className="relative py-20 sm:py-28">
      <RevealOnScroll staggerDelay={0.1} className="container-edge flex flex-col gap-12">
        <SectionHeading
          labelKey="contact.label"
          titleKey="contact.title"
          subtitleKey="contact.subtitle"
          align="center"
        />

        <RevealItem className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-card p-8 shadow-lifted sm:p-12 dark:border-white/10">
          {/* decorative aurora */}
          <div className="pointer-events-none absolute -top-1/4 -right-1/4 h-96 w-96 rounded-full bg-foreground/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-1/4 -left-1/4 h-96 w-96 rounded-full bg-foreground/[0.04] blur-3xl" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: info */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {t("contact.availability")}
                </span>
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t("contact.title")}
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label={t("contact.locationLabel")}
                  value={t("contact.location")}
                />
                <PhoneRow
                  icon={<Phone className="h-4 w-4" />}
                  label={t("contact.phoneLabel")}
                  value={PHONE_NUMBER}
                  hintLabel={locale === "fa" ? "برای کپی کلیک کنید" : "Click to copy"}
                  copiedLabel={locale === "fa" ? "کپی شد" : "Copied"}
                />
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a
                href="tel:+989352126934"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground btn-primary-hover transition-[background-color] duration-150"
              >
                <Phone className="h-4 w-4" />
                {t("contact.callMe")}
              </a>
              <a
                href="mailto:hadiheydari.business@gmail.com"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-background/40 px-6 text-sm font-medium btn-secondary-hover transition-[background-color] duration-150 dark:border-white/10"
              >
                <Mail className="h-4 w-4" />
                {t("contact.emailMe")}
              </a>
            </div>
          </div>
        </RevealItem>
      </RevealOnScroll>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-secondary/40 text-muted-foreground dark:border-white/10">
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

/**
 * Phone row — clicking the phone number copies it to clipboard and shows
 * a polished floating tooltip. On hover, a hint tooltip says "Click to copy";
 * after copy, the tooltip says "Copied".
 */
function PhoneRow({
  icon,
  label,
  value,
  hintLabel,
  copiedLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hintLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older browsers / non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const showHint = hovered && !copied;
  const showCopied = copied;

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-secondary/40 text-muted-foreground dark:border-white/10">
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="relative mt-0.5 inline-flex w-fit items-center">
          <button
            type="button"
            onClick={handleCopy}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            dir="ltr"
            className={
              "relative inline-flex items-center rounded-full px-1.5 py-0.5 -mx-1.5 -my-0.5 text-sm font-medium tabular-nums transition-[background-color,color] duration-150 " +
              (copied
                ? "text-foreground"
                : "text-foreground hover:bg-secondary/60 hover:text-muted-foreground cursor-pointer")
            }
            aria-label={hintLabel}
          >
            <span>{value}</span>
          </button>

          {/* Floating tooltip — pill with arrow, spring entrance. */}
          <AnimatePresence>
            {(showHint || showCopied) && (
              <motion.span
                key={showCopied ? "copied" : "hint"}
                initial={{ opacity: 0, y: 6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 480, damping: 28, mass: 0.7 }}
                className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2"
                role={showCopied ? "status" : undefined}
                aria-live={showCopied ? "polite" : undefined}
              >
                {/* Light mode pill: dark bg, light text. */}
                <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/5 bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-background dark:text-foreground">
                  {showCopied && (
                    <Check className="h-3 w-3 text-background dark:text-foreground" strokeWidth={3} />
                  )}
                  {showCopied ? copiedLabel : hintLabel}
                </span>
                {/* Arrow pointing down to the chip — matches pill bg per theme. */}
                <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rotate-45 bg-foreground dark:bg-background" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
