"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuroraBackground } from "@/components/animations/aurora-background";
import { Logo } from "@/components/brand/logo";

const KEY = "jm-welcome-shown";
const noop = () => () => {};

/**
 * Pantalla de bienvenida cinematográfica (1 vez por sesión).
 * - Aurora en movimiento + logo con anillos/pulso + saludo blur→focus.
 * - Dura ~2.6s y revela el sistema con una transición tipo escala/cortina.
 * - A prueba de fallos: el sistema ya está renderizado debajo; esto es un overlay.
 * - Respeta prefers-reduced-motion (más corto, sin efectos pesados).
 */
export function WelcomeOverlay({ greeting, name, sub }: { greeting: string; name: string; sub?: string }) {
  const reduce = useReducedMotion();
  // En servidor y primer render: "ya mostrado" = true (no renderiza, sin parpadeo).
  const already = useSyncExternalStore(
    noop,
    () => {
      try { return sessionStorage.getItem(KEY) === "1"; } catch { return true; }
    },
    () => true,
  );
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (already) return;
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    const t = setTimeout(() => setVisible(false), reduce ? 1000 : 2600);
    return () => clearTimeout(t);
  }, [already, reduce]);

  if (already) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#07070b] px-6 text-center"
        >
          <AuroraBackground />

          {/* Logo con anillos/glow */}
          <motion.div
            initial={reduce ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="relative z-10 mb-8 flex items-center justify-center"
          >
            {!reduce && (
              <>
                <motion.span
                  className="absolute rounded-full border border-white/15"
                  style={{ width: 160, height: 160 }}
                  animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.span
                  className="absolute rounded-full border border-white/10"
                  style={{ width: 160, height: 160 }}
                  animate={{ scale: [1, 1.6], opacity: [0.35, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                />
              </>
            )}
            <span className="absolute size-32 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-purple)_45%,transparent),transparent_70%)] blur-2xl" />
            <Logo size={92} variant="white" className="relative drop-shadow-[0_8px_30px_rgba(79,140,255,0.5)]" />
          </motion.div>

          {/* Saludo */}
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-2xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {greeting}{" "}
            <span className="bg-[linear-gradient(90deg,var(--electric),var(--brand-purple),var(--teal))] bg-clip-text text-transparent">
              {name}
            </span>
          </motion.h1>

          {sub && (
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="relative z-10 mt-3 max-w-md text-sm text-white/70 sm:text-base"
            >
              {sub}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
