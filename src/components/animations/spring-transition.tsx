"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Transición de página con física de resorte (spring): entra con
 * escala + slide-up y un rebote sutil. Respeta prefers-reduced-motion.
 * Úsalo con `key={pathname}` para animar al cambiar de ruta.
 */
export function SpringTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.9 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Variante para listas/grids: cada hijo entra con spring escalonado. */
export function SpringStagger({
  children,
  className,
  stagger = 0.07,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export const springItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 24 },
  },
};
