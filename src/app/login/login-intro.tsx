"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";

/** Envoltorio cinematográfico de la tarjeta de login (escala + fade, spring). */
export function LoginIntro({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="relative z-10 w-full max-w-md"
    >
      <div className="glass rounded-2xl p-8 shadow-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 18 }}
          className="mb-6 flex flex-col items-center text-center"
        >
          <Logo size={56} className="mb-4 drop-shadow-[0_8px_24px_rgba(79,140,255,0.45)]" />
          <h1 className="text-2xl font-semibold tracking-tight">
            JM <span className="text-gradient">Control Center</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inicia sesión para entrar a tu centro de mando.
          </p>
        </motion.div>

        {children}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        JM Designs Worldwide · Acceso privado
      </p>
    </motion.div>
  );
}
