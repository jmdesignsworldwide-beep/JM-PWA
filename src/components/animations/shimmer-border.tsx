"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import { useSettings } from "@/components/settings/settings-provider";
import { cn } from "@/lib/utils";

/**
 * Borde con gradiente brillante giratorio (estilo "shimmer border").
 * El giro respeta prefers-reduced-motion y el ajuste de Configuración;
 * si está apagado, muestra un borde con gradiente estático.
 */
export function ShimmerBorder({
  children,
  className,
  containerClassName,
  radius = 16,
}: {
  children: React.ReactNode;
  /** Clases para el contenido interno. */
  className?: string;
  /** Clases para el contenedor externo. */
  containerClassName?: string;
  radius?: number;
}) {
  const reduce = useReducedMotion();
  const { animatedBackgrounds } = useSettings();
  const animate = animatedBackgrounds && !reduce;

  return (
    <div
      className={cn("relative overflow-hidden p-px", containerClassName)}
      style={{ borderRadius: radius }}
    >
      <div
        aria-hidden
        className="absolute inset-[-150%]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, var(--electric) 60deg, var(--brand-purple) 120deg, transparent 200deg, transparent 360deg)",
          animation: animate ? "var(--animate-border-spin)" : "none",
          opacity: animate ? 0.9 : 0.5,
        }}
      />
      <div
        className={cn("relative bg-card", className)}
        style={{ borderRadius: radius - 1 }}
      >
        {children}
      </div>
    </div>
  );
}
