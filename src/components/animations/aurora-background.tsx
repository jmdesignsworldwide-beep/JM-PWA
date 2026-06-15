"use client";

import { useReducedMotion } from "framer-motion";
import { useSettings } from "@/components/settings/settings-provider";
import { cn } from "@/lib/utils";

/**
 * Fondo premium: mesh/aurora gradient en movimiento lento + grid sutil.
 * Para login y zonas destacadas. Decorativo (aria-hidden).
 *
 * - Respeta `prefers-reduced-motion` (sin movimiento, gradiente estático).
 * - Se puede apagar en Configuración (`animatedBackgrounds`): muestra un
 *   gradiente estático muy tenue en vez del fondo animado.
 */
export function AuroraBackground({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const { animatedBackgrounds } = useSettings();
  const animate = animatedBackgrounds && !reduce;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "aurora-bg",
          animate ? "opacity-70" : "opacity-40 [animation:none]",
        )}
      />
      {/* Grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
        }}
      />
      {/* Viñeta para profundidad */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--background)_100%)]" />
    </div>
  );
}
