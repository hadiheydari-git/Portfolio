"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/providers/theme-provider";
import { Moon, Sun, Languages, Menu, X } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "nav.about", href: "#about" },
  { key: "nav.work", href: "#work" },
  { key: "nav.experience", href: "#experience" },
  { key: "nav.skills", href: "#skills" },
  { key: "nav.contact", href: "#contact" },
];

export function Header() {
  const { t, locale, toggleLocale } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("about");

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const ids = NAV_ITEMS.map((i) => i.href.replace("#", ""));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      className="width-before-scroll-bar fixed inset-x-0 top-0 z-50 pt-4 sm:pt-5 animate-header-enter"
    >
      {/* Container-edge wrapper centers the header and applies the SAME
          horizontal padding as all content sections. The capsule nav sits
          INSIDE this wrapper, so its visible edges align with the content's
          INNER edges (the card edges), not the outer container edge. */}
      <div className="container-edge">
        <nav
          data-scrolled={scrolled ? "true" : "false"}
          style={{ backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)" }}
          className={cn(
            "header-solid flex items-center justify-between gap-2 rounded-full px-4 py-2.5 transition-[box-shadow,border-color] duration-500 sm:px-5"
          )}
        >
        {/* Brand */}
        <Link
          href="#top"
          className="group flex items-center gap-2 rounded-full px-1 py-1"
          aria-label="Hadi Heydari"
        >
          <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-secondary ring-1 ring-foreground/10 transition-transform duration-500 group-hover:scale-110">
            <SmartImage
              src="/hadi-heydari-profile.webp"
              alt="Hadi Heydari"
              className="h-full w-full"
              critical
              criticalKey="header:avatar"
            />
          </span>
          <span className="hidden text-sm font-medium tracking-tight sm:block">
            {t("name")}
          </span>
        </Link>

        {/* Desktop nav — ONLY the active link gets a gray background */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const id = item.href.replace("#", "");
            const active = activeSection === id;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-1.5 text-sm transition-all duration-300",
                    active
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleLocale}
            className="flex h-9 items-center gap-1.5 rounded-full border border-black/10 px-3 text-xs font-medium text-foreground transition-all duration-300 hover:bg-secondary hover:shadow-card dark:border-white/10"
            aria-label={t("common.language")}
          >
            <Languages className="h-3.5 w-3.5" />
            <span>{locale === "fa" ? "EN" : "فا"}</span>
          </button>

          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-foreground transition-all duration-300 hover:bg-secondary hover:shadow-card dark:border-white/10"
            aria-label={t("common.theme")}
          >
            <AnimatePresence mode="wait" initial={false}>
              {resolvedTheme === "dark" ? (
                <motion.span
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Sun className="h-4 w-4" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Moon className="h-4 w-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileOpen((p) => !p)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-foreground transition-all duration-300 hover:bg-secondary md:hidden dark:border-white/10"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        </nav>

        {/* Mobile menu — aligned to the capsule's width (inside the same wrapper) */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mt-2 md:hidden"
            >
              <ul
                className="header-solid flex flex-col gap-1 rounded-3xl p-2 shadow-soft"
                style={{ backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)" }}
              >
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-2xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
