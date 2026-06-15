"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { CICLO_VIDA } from "@/lib/ventas";
import { cn } from "@/lib/utils";

/** Barra visual del ciclo de vida con el paso actual resaltado y animado. */
export function LifecycleBar({ current }: { current: number }) {
  return (
    <div className="flex w-full items-center overflow-x-auto py-2">
      {CICLO_VIDA.map((paso, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={paso} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  scale: active ? 1.12 : 1,
                  backgroundColor: done || active ? "var(--primary)" : "var(--secondary)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-semibold",
                  done || active ? "text-primary-foreground" : "text-muted-foreground",
                  active && "ring-4 ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </motion.div>
              <span
                className={cn(
                  "whitespace-nowrap text-[11px]",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {paso}
              </span>
            </div>
            {i < CICLO_VIDA.length - 1 && (
              <div className="mx-1 h-0.5 flex-1 rounded-full bg-secondary">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: i < current ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  style={{ originX: 0 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
