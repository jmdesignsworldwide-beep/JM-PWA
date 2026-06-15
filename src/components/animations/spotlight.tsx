"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { useSettings } from "@/components/settings/settings-provider";
import { cn } from "@/lib/utils";

/**
 * Contenedor con un foco de luz que sigue el cursor (estilo Aceternity).
 * Hecho a mano con Framer Motion. Respeta prefers-reduced-motion y el
 * ajuste `animatedBackgrounds` de Configuración (si está apagado, no hay foco).
 */
export function Spotlight({
  children,
  className,
  size = 350,
  color = "color-mix(in srgb, var(--primary) 18%, transparent)",
}: {
  children: React.ReactNode;
  className?: string;
  size?: number;
  color?: string;
}) {
  const reduce = useReducedMotion();
  const { animatedBackgrounds } = useSettings();
  const enabled = animatedBackgrounds && !reduce;

  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const bg = useMotionTemplate`radial-gradient(${size}px circle at ${mx}px ${my}px, ${color}, transparent 70%)`;

  const ref = React.useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  }

  function onLeave() {
    mx.set(-1000);
    my.set(-1000);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("group relative overflow-hidden", className)}
    >
      {enabled && (
        <motion.div
          aria-hidden
          style={{ background: bg }}
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
