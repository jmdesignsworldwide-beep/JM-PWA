"use client";

import { Sparkles } from "lucide-react";
import { useSettings } from "@/components/settings/settings-provider";
import { Switch } from "@/components/ui/switch";
import { AnimatedCard } from "@/components/animations/motion";

/** Sección de Apariencia: controla los fondos/efectos animados. */
export function AppearanceSettings() {
  const { animatedBackgrounds, setSetting } = useSettings();

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-4 text-electric" />
        Apariencia y animaciones
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Controla los efectos visuales. El sistema siempre respeta
        “movimiento reducido” de tu dispositivo.
      </p>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-4">
        <div>
          <label
            htmlFor="animated-bg"
            className="text-sm font-medium"
          >
            Fondos y efectos animados
          </label>
          <p className="text-xs text-muted-foreground">
            Aurora, foco que sigue el cursor y bordes brillantes. Apágalos
            para una vista más sobria o ahorrar batería.
          </p>
        </div>
        <Switch
          id="animated-bg"
          checked={animatedBackgrounds}
          onCheckedChange={(v) => setSetting("animatedBackgrounds", v)}
        />
      </div>
    </AnimatedCard>
  );
}
