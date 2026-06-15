"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const word: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Texto que aparece con efecto blur-in + slide, palabra por palabra.
 * Para titulares "wow". Respeta prefers-reduced-motion (aparece directo).
 */
export function BlurInText({
  text,
  className,
  as: Tag = "span",
  delay = 0,
}: {
  text: string;
  className?: string;
  as?: React.ElementType;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className}>
      <motion.span
        variants={container}
        initial="hidden"
        animate="show"
        transition={{ delayChildren: delay }}
        className="inline"
      >
        {words.map((w, i) => (
          <motion.span
            key={`${w}-${i}`}
            variants={word}
            className={cn("inline-block whitespace-pre")}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
}
