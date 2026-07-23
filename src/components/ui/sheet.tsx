"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Hoja/panel deslizante reutilizable (lateral o inferior) con SAFE-AREA
 * incorporada de raíz: los paneles laterales llevan `pt-safe`/`pb-safe` y los
 * inferiores `pb-safe`, así ningún panel se corta con la barra de estado o el
 * home indicator en móvil — ni ahora ni en pantallas futuras.
 *
 * Uso (el padre controla la presencia para animar la salida):
 *   <AnimatePresence>
 *     {open && (
 *       <Sheet side="right" onClose={() => setOpen(false)}>…contenido…</Sheet>
 *     )}
 *   </AnimatePresence>
 */
export function Sheet({
  onClose,
  side = "right",
  className,
  children,
  labelledBy,
}: {
  onClose: () => void;
  side?: "right" | "left" | "bottom";
  className?: string;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  const isBottom = side === "bottom";
  const closed = isBottom ? { y: "100%" } : { x: side === "right" ? "100%" : "-100%" };
  const openPos = isBottom ? { y: 0 } : { x: 0 };

  return (
    <>
      <motion.div
        key="sheet-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />
      <motion.aside
        key="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        initial={closed} animate={openPos} exit={closed}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className={cn(
          "fixed z-50 flex flex-col bg-card shadow-2xl",
          isBottom
            ? "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-border pb-safe"
            : cn(
                "top-0 h-full w-full max-w-md pt-safe pb-safe",
                side === "right" ? "right-0 border-l border-border" : "left-0 border-r border-border",
              ),
          className,
        )}
      >
        {children}
      </motion.aside>
    </>
  );
}
