"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";

/* ============================================================
   Variantes compartidas (entrada llamativa, uso sutil).
   ============================================================ */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Transición de página: fade + slide-up suave. */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Contenedor que escalona la entrada de sus hijos (usar con <StaggerItem>). */
export function StaggerContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Hijo de <StaggerContainer>: entra con fade + slide-up. */
export function StaggerItem({
  children,
  className,
  ...props
}: HTMLMotionProps<"div"> & { children: React.ReactNode }) {
  return (
    <motion.div variants={itemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

/**
 * Tarjeta animada reutilizable: entra con stagger y, al pasar el cursor,
 * se eleva con un glow sutil (scale 1.02). Respeta prefers-reduced-motion.
 */
export function AnimatedCard({
  children,
  className,
  ...props
}: HTMLMotionProps<"div"> & { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={itemVariants}
      whileHover={
        reduce
          ? undefined
          : {
              scale: 1.02,
              y: -4,
              boxShadow: "0 18px 50px -20px color-mix(in srgb, var(--primary) 55%, transparent)",
            }
      }
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
