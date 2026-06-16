/** Editor de tokens de tema (re-temable / revendible). Persiste en localStorage. */
export type ThemeTokens = { electric: string; purple: string; teal: string };

export const DEFAULT_TOKENS: ThemeTokens = {
  electric: "#4f8cff",
  purple: "#a78bfa",
  teal: "#2dd4bf",
};

const KEY = "jm-theme-tokens";

export function loadThemeTokens(): ThemeTokens {
  if (typeof window === "undefined") return DEFAULT_TOKENS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_TOKENS, ...JSON.parse(raw) } : DEFAULT_TOKENS;
  } catch {
    return DEFAULT_TOKENS;
  }
}

export function applyThemeTokens(t: ThemeTokens) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--electric", t.electric);
  root.style.setProperty("--brand-purple", t.purple);
  root.style.setProperty("--teal", t.teal);
  root.style.setProperty("--primary", t.electric);
  root.style.setProperty("--ring", t.electric);
}

export function saveThemeTokens(t: ThemeTokens) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* ignore */
  }
  applyThemeTokens(t);
}

export function resetThemeTokens() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  applyThemeTokens(DEFAULT_TOKENS);
}
