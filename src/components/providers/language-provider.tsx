"use client";

import * as React from "react";
import { dict, resolveKey, type Locale } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  /** Translate a dotted UI key, e.g. t("nav.about") */
  t: (key: string) => string;
  /** Translate a value that already exists as { fa, en } */
  tt: (value: { fa: string; en: string }) => string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "portfolio-locale";

// Browser-tab title per language. Updates dynamically when the user
// switches language so the tab always reads in the active language.
// (The static <title> in layout.tsx serves as the SSR default = fa.)
const SITE_TITLE: Record<Locale, string> = {
  fa: "هادی حیدری | طراحی محصول",
  en: "Hadi Heydari | Product Designer",
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default language is Persian (RTL) per requirements.
  const [locale, setLocaleState] = React.useState<Locale>("fa");

  // On mount, read persisted preference (keeps SSR/CSR consistent — defaults to fa).
  React.useEffect(() => {
    requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
        if (stored === "fa" || stored === "en") {
          setLocaleState(stored);
        }
      } catch {
        /* ignore */
      }
    });
  }, []);

  // Sync <html lang/dir> + <title> whenever the locale changes.
  React.useEffect(() => {
    const dir = locale === "fa" ? "rtl" : "ltr";
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dir;
    // Update the browser-tab title to match the active language.
    document.title = SITE_TITLE[locale];
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = React.useCallback((l: Locale) => setLocaleState(l), []);
  const toggleLocale = React.useCallback(
    () => setLocaleState((p) => (p === "fa" ? "en" : "fa")),
    []
  );

  const t = React.useCallback(
    (key: string) => resolveKey(locale, key),
    [locale]
  );
  const tt = React.useCallback(
    (value: { fa: string; en: string }) => value[locale],
    [locale]
  );

  const value = React.useMemo<LanguageContextValue>(
    () => ({
      locale,
      dir: locale === "fa" ? "rtl" : "ltr",
      t,
      tt,
      setLocale,
      toggleLocale,
    }),
    [locale, t, tt, setLocale, toggleLocale]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

// Re-export dictionary type for convenience
export type { Locale };
export { dict };
