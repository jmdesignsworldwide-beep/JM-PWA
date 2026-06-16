"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Megaphone, Sparkles } from "lucide-react";
import type { Row } from "@/lib/database.types";
import { fechaCorta } from "@/lib/format";

type Update = Row<"project_updates">;

/** Feed cálido "en qué estamos trabajando ahora". */
export function UpdateFeed({ updates }: { updates: Update[] }) {
  const reduce = useReducedMotion();
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Megaphone className="size-4 text-brand-purple" />
        <h2 className="font-semibold">En qué estamos trabajando</h2>
      </div>
      <div className="p-5">
        {updates.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Pronto verás aquí las novedades de tu proyecto. ✨
          </p>
        ) : (
          <ol className="relative space-y-5">
            {updates.map((u, i) => (
              <motion.li
                key={u.id}
                initial={reduce ? false : { opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="relative flex gap-3"
              >
                <div className="flex flex-col items-center">
                  <span className="mt-1 flex size-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-white">
                    <Sparkles className="size-3.5" />
                  </span>
                  {i < updates.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-1">
                  <p className="font-medium leading-tight">{u.titulo}</p>
                  {u.contenido && <p className="mt-1 text-sm text-muted-foreground">{u.contenido}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{fechaCorta(u.created_at)}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
