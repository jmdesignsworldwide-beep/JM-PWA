"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { BlurInText } from "@/components/animations/blur-in-text";
import { ShimmerBorder } from "@/components/animations/shimmer-border";
import { Spotlight } from "@/components/animations/spotlight";

export function PortalIntro({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="relative z-10 w-full max-w-md"
    >
      <ShimmerBorder radius={20} className="shadow-2xl">
        <Spotlight className="rounded-[19px] p-8" size={400}>
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo size={52} className="mb-4 drop-shadow-[0_8px_24px_rgba(79,140,255,0.45)]" />
            <BlurInText as="h1" text="Tu espacio de proyecto" className="text-2xl font-semibold tracking-tight" />
            <p className="mt-1 text-sm text-muted-foreground">
              Bienvenido a tu portal de cliente de JM Designs Worldwide.
            </p>
          </div>
          {children}
        </Spotlight>
      </ShimmerBorder>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Acceso exclusivo para clientes de JM Designs Worldwide
      </p>
    </motion.div>
  );
}
