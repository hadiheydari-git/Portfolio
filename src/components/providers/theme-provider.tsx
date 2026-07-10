"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Toggle theme with an expanding-circle ripple originating from the
   *  click point. Uses the View Transitions API when available; falls back
   *  to an instant toggle otherwise. The circle reveals the new theme's
   *  colors expanding outward from the toggle button. */
  toggleThemeWithRipple: (event?: { clientX: number; clientY: number }) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "theme";

const getSystemTheme = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const applyTheme = (theme: Theme, enableSystem: boolean) => {
  if (typeof document === "undefined") return;

  const resolvedTheme = theme === "system" && enableSystem ? getSystemTheme() : theme;
  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.classList.toggle("light", resolvedTheme === "light");
  root.style.colorScheme = resolvedTheme;
  root.setAttribute("data-theme", resolvedTheme);
};

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  enableSystem = false,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let initialTheme: Theme = defaultTheme;

      try {
        const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored === "light" || stored === "dark" || stored === "system") {
          initialTheme = stored;
        }
      } catch {
        // Ignore storage access issues.
      }

      if (disableTransitionOnChange) {
        const style = document.createElement("style");
        style.appendChild(
          document.createTextNode("*{transition:none!important;animation:none!important}")
        );
        document.head.appendChild(style);
        requestAnimationFrame(() => style.remove());
      }

      setTheme(initialTheme);
      applyTheme(initialTheme, enableSystem);
      setMounted(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [defaultTheme, enableSystem, disableTransitionOnChange]);

  React.useEffect(() => {
    if (!mounted) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors.
    }

    applyTheme(theme, enableSystem);
  }, [mounted, theme, enableSystem]);

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  /**
   * Toggle theme with an expanding-circle ripple animation originating from
   * the click point. Uses the View Transitions API (`document.startViewTransition`)
   * which captures a snapshot of the page before and after the theme change,
   * then animates the NEW snapshot revealing through an expanding `clip-path:
   * circle(...)` — giving the impression of the new theme's color flowing out
   * from the toggle button.
   *
   * Browser support: Chrome/Edge 111+, Safari 18+, Opera 99+. Firefox & older
   * browsers fall back to an instant toggle (no animation). Users with
   * `prefers-reduced-motion: reduce` also get the instant toggle.
   *
   * The CSS for the pseudo-elements lives in `globals.css` under the
   * `::view-transition-old(root)` / `::view-transition-new(root)` selectors
   * and reads `--theme-x` / `--theme-y` custom properties set here.
   */
  const toggleThemeWithRipple = React.useCallback(
    (event?: { clientX: number; clientY: number }) => {
      const newTheme: Theme = theme === "dark" ? "light" : "dark";

      // Default origin: viewport center (used when called without an event)
      const x = event?.clientX ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 0);
      const y = event?.clientY ?? (typeof window !== "undefined" ? window.innerHeight / 2 : 0);

      const doc = typeof document !== "undefined" ? document : null;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Fallback 1: no View Transitions API, or reduced motion preference → instant toggle
      if (
        !doc ||
        typeof doc.startViewTransition !== "function" ||
        prefersReducedMotion
      ) {
        setTheme(newTheme);
        return;
      }

      // Set click coordinates so the CSS animation can target the clip-path origin
      const root = doc.documentElement;
      root.style.setProperty("--theme-x", `${x}px`);
      root.style.setProperty("--theme-y", `${y}px`);

      // Drive the theme change inside the view transition callback so the
      // browser snapshots the NEW state correctly. `applyTheme` mutates the
      // DOM synchronously (toggles `.dark` class on <html>); `setTheme`
      // updates React state in parallel so React stays in sync with the DOM.
      const transition = doc.startViewTransition(() => {
        applyTheme(newTheme, enableSystem);
        setTheme(newTheme);
      });

      // Swallow aborted transitions (e.g., user clicks rapidly or navigates away)
      if (transition && transition.finished) {
        transition.finished.catch(() => {
          /* no-op: transition was skipped or interrupted */
        });
      }
    },
    [theme, enableSystem]
  );

  const resolvedTheme = React.useMemo<"light" | "dark">(() => {
    if (theme === "system" && enableSystem) {
      return getSystemTheme();
    }
    return theme === "system" ? (defaultTheme === "dark" ? "dark" : "light") : theme;
  }, [defaultTheme, enableSystem, theme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme: mounted ? theme : defaultTheme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      toggleThemeWithRipple,
    }),
    [defaultTheme, mounted, resolvedTheme, setTheme, theme, toggleTheme, toggleThemeWithRipple]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {/* Theme toggle ripple animation CSS — injected via <style> tag because
          Turbopack's Lightning CSS optimizer strips ::view-transition-*
          pseudo-element rules and the keyframes from globals.css during
          compilation. Inline <style> tags bypass the optimizer entirely.

          The animation uses the View Transitions API: when the user clicks
          the theme toggle, document.startViewTransition() captures a
          snapshot of the page before and after the theme change. We override
          the default cross-fade with an expanding clip-path:circle() on the
          NEW snapshot, originating from the click point (--theme-x / --theme-y
          custom properties set in JS by toggleThemeWithRipple). The OLD
          snapshot stays opaque underneath, so the new theme's colors appear
          to ripple outward from the toggle button.

          Browser support: Chrome/Edge 111+, Safari 18+, Opera 99+.
          Firefox & older browsers fall back to instant toggle (no animation,
          no broken state) via the runtime check in toggleThemeWithRipple. */}
      <style dangerouslySetInnerHTML={{ __html: `
@keyframes theme-ripple-expand {
  from {
    clip-path: circle(0% at var(--theme-x, 50%) var(--theme-y, 50%));
  }
  to {
    clip-path: circle(150% at var(--theme-x, 50%) var(--theme-y, 50%));
  }
}
::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
  z-index: 0;
}
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
  z-index: 1;
  animation: theme-ripple-expand 0.6s cubic-bezier(0.95, 0.05, 0.795, 0.15);
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none !important;
  }
}
` }} />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    return {
      theme: "dark" as Theme,
      resolvedTheme: "dark" as const,
      setTheme: () => {},
      toggleTheme: () => {},
      toggleThemeWithRipple: () => {},
    };
  }
  return context;
}
