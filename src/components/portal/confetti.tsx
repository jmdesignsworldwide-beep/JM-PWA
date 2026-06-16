"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Estallido de confeti ligero (sin dependencias) para celebrar un hito.
 * Determinista (no usa Math.random en render) y respeta prefers-reduced-motion.
 */
export function Confetti({ count = 36 }: { count?: number }) {
  const reduce = useReducedMotion();
  const colors = ["var(--electric)", "var(--brand-purple)", "var(--teal)", "#f5c451", "#ff7eb6"];
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // Distribución determinista basada en el índice (trig + golden angle).
        const a = i * 2.39996; // ángulo áureo
        const spread = ((i % 7) - 3) / 3; // -1..1
        return {
          id: i,
          x: Math.cos(a) * (60 + (i % 5) * 38) + spread * 40,
          y: -(70 + ((i * 53) % 170)),
          rotate: ((i * 47) % 12) * 45,
          delay: ((i * 13) % 18) / 100,
          color: colors[i % colors.length],
          size: 6 + ((i * 7) % 6),
        };
      }),
    [count], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-6 z-20 size-0">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotate }}
          transition={{ duration: 1.3, delay: p.delay, ease: "easeOut" }}
          style={{ position: "absolute", width: p.size, height: p.size * 0.5, backgroundColor: p.color, borderRadius: 1 }}
        />
      ))}
    </div>
  );
}
