"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EVENT_TIPOS } from "@/lib/eventos";
import { money, fechaCorta } from "@/lib/format";
import { rdToday } from "@/lib/fecha";
import { Button } from "@/components/ui/button";

export function NotificationsBell({
  count,
  items,
}: {
  count: number;
  items: AgendaEvent[];
}) {
  const [open, setOpen] = useState(false);
  const hoy = rdToday();

  return (
    <div className="relative">
      <Button
        variant="ghost" size="icon" aria-label="Notificaciones"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="relative"
      >
        <Bell />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white ring-2 ring-background">
            {count}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
          >
            <div className="border-b border-border px-3 py-2.5 text-sm font-medium">
              Notificaciones {count > 0 && <span className="text-muted-foreground">({count})</span>}
            </div>
            <div className="max-h-96 overflow-y-auto p-1">
              {items.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">Todo al día ☕</p>
              )}
              {items.map((e) => {
                const t = e.tipo ? EVENT_TIPOS[e.tipo] : null;
                const vencido = e.fecha < hoy;
                const inner = (
                  <div className="flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-accent">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: vencido ? "var(--destructive)" : t?.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {e.cliente?.nombre ?? e.titulo}
                        {e.monto != null && <span className="ml-1 text-muted-foreground">· {money(e.monto, e.moneda ?? "DOP")}</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {vencido ? "⚠️ Vencido · " : ""}{t?.label} · {fechaCorta(e.fecha)}
                      </p>
                    </div>
                  </div>
                );
                return e.client_id ? (
                  <Link key={e.id} href={`/clientes/${e.client_id}`} onMouseDown={() => setOpen(false)}>{inner}</Link>
                ) : <div key={e.id}>{inner}</div>;
              })}
            </div>
            <Link
              href="/cobros"
              onMouseDown={() => setOpen(false)}
              className="block border-t border-border px-3 py-2.5 text-center text-sm text-electric hover:bg-accent"
            >
              Ver cobros y entregas
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
