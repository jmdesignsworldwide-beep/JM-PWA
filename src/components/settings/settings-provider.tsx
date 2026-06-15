"use client";

import * as React from "react";

/**
 * Preferencias de la app que el usuario puede cambiar en Configuración.
 * Por ahora controla los fondos animados; se ampliará en fases siguientes.
 */
export type AppSettings = {
  animatedBackgrounds: boolean;
};

const DEFAULTS: AppSettings = {
  animatedBackgrounds: true,
};

const STORAGE_KEY = "jm-settings";

type SettingsContextValue = AppSettings & {
  setSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
};

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  const setSetting = React.useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const value = React.useMemo<SettingsContextValue>(
    () => ({ ...settings, setSetting }),
    [settings, setSetting],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/** Hook de preferencias. Seguro fuera del provider (devuelve defaults). */
export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) {
    return { ...DEFAULTS, setSetting: () => {} };
  }
  return ctx;
}
