"use client";

import { useState, useSyncExternalStore } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { AnimatedCard } from "@/components/animations/motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { loadThemeTokens, saveThemeTokens, resetThemeTokens, DEFAULT_TOKENS, type ThemeTokens } from "@/lib/theme-tokens";

export function ThemeSettings() {
  // Lee del localStorage solo en cliente (sin setState en efecto).
  const initial = useSyncExternalStore(() => () => {}, loadThemeTokens, () => DEFAULT_TOKENS);
  const [tokens, setTokens] = useState<ThemeTokens>(initial);

  function set(key: keyof ThemeTokens, value: string) {
    const next = { ...tokens, [key]: value };
    setTokens(next);
    saveThemeTokens(next); // aplica en vivo + guarda
  }

  const fields: { key: keyof ThemeTokens; label: string }[] = [
    { key: "electric", label: "Azul eléctrico (primario)" },
    { key: "purple", label: "Púrpura" },
    { key: "teal", label: "Teal" },
  ];

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold"><Palette className="size-4 text-electric" /> Tokens de tema</h2>
      <p className="mt-1 text-sm text-muted-foreground">Re-temable: cambia los acentos del sistema (se aplican al instante).</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={tokens[f.key]} onChange={(e) => set(f.key, e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
              <span className="text-xs text-muted-foreground">{tokens[f.key]}</span>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => { resetThemeTokens(); setTokens(DEFAULT_TOKENS); }}>
        <RotateCcw className="size-4" /> Restaurar colores
      </Button>
    </AnimatedCard>
  );
}
