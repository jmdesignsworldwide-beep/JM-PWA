"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { BRANDS } from "@/lib/nav";

/** Marca global: escribe ?marca= en la URL. El Dashboard la lee y se filtra. */
const OPCIONES = [...BRANDS, { id: "personal", label: "Personal" }];

export function BrandSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("marca") || "all";
  const [open, setOpen] = useState(false);
  const selected = OPCIONES.find((b) => b.id === current) ?? OPCIONES[0];

  function pick(id: string) {
    setOpen(false);
    const sp = new URLSearchParams(params.toString());
    if (id === "all") sp.delete("marca"); else sp.set("marca", id);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background/50 px-3 text-sm font-medium transition-colors hover:bg-accent"
      >
        <span className="size-2 rounded-full bg-[linear-gradient(90deg,var(--electric),var(--brand-purple))]" />
        <span className="hidden max-w-[140px] truncate sm:block">{selected.label}</span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
          >
            {OPCIONES.map((brand) => (
              <button
                key={brand.id}
                onMouseDown={() => pick(brand.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                {brand.label}
                {selected.id === brand.id && <Check className="size-4 text-electric" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
