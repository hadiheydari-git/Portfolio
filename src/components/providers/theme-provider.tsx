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
    }),
    [defaultTheme, mounted, resolvedTheme, setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    return {
      theme: "dark" as Theme,
      resolvedTheme: "dark" as const,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
