"use client";

import * as React from "react";

type Theme = "dark" | "light";
const STORAGE_KEY = "jm-theme";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/** Script que corre antes de hidratar para evitar el "flash" de tema. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // El script anti-flash ya aplicó la clase en <html>; leemos de ahí.
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    }
    return "dark";
  });

  const apply = React.useCallback((t: Theme) => {
    const root = document.documentElement;
    root.classList.toggle("dark", t === "dark");
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: apply,
      toggleTheme: () => apply(theme === "dark" ? "light" : "dark"),
    }),
    [theme, apply],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
