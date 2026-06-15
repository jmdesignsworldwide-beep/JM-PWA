"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  useMotionTemplate,
  type HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Tarjeta con hover "magnético": se inclina/desplaza sutilmente hacia el
 * cursor y muestra un glow que sigue el puntero. Hecha a mano con Framer
 * Motion (sin dependencias extra). Respeta prefers-reduced-motion.
 */
export function MagneticCard({
  children,
  className,
  strength = 12,
  glow = true,
  ...props
}: HTMLMotionProps<"div"> & {
  children: React.ReactNode;
  /** Cuánto se desplaza hacia el cursor (px máx aprox). */
  strength?: number;
  glow?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useMotionValue(0), { stiffness: 250, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 250, damping: 20 });
  const sx = useSpring(x, { stiffness: 250, damping: 20 });
  const sy = useSpring(y, { stiffness: 250, damping: 20 });

  // Posición del glow (en %)
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glowBg = useMotionTemplate`radial-gradient(220px circle at ${gx}% ${gy}%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 60%)`;

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height;
    x.set((px - 0.5) * strength);
    y.set((py - 0.5) * strength);
    rx.set(-(py - 0.5) * 6); // tilt
    ry.set((px - 0.5) * 6);
    gx.set(px * 100);
    gy.set(py * 100);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={
        reduce
          ? undefined
          : {
              x: sx,
              y: sy,
              rotateX: rx,
              rotateY: ry,
              transformPerspective: 800,
            }
      }
      className={cn(
        "group relative rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow duration-300 hover:shadow-[0_18px_50px_-20px_color-mix(in_srgb,var(--primary)_55%,transparent)]",
        className,
      )}
      {...props}
    >
      {glow && !reduce && (
        <motion.div
          aria-hidden
          style={{ background: glowBg }}
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
