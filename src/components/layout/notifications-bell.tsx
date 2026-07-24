"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, X, Calendar, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { AgendaEvent } from "@/lib/data/agenda";
import type { SeguimientoEvento } from "@/lib/data/seguimiento";
import { EVENT_TIPOS } from "@/lib/eventos";
import { money, fechaCorta } from "@/lib/format";
import { rdToday, addDays } from "@/lib/fecha";
import { confirmarEventoHecho, moverEventoVencido } from "@/app/(app)/calendario/seguimiento-actions";
import { Button } from "@/components/ui/button";

export function NotificationsBell({
  count,
  items,
  seguimientos = [],
}: {
  count: number;
  items: AgendaEvent[];
  seguimientos?: SeguimientoEvento[];
}) {
  const [open, setOpen] = useState(false);
  const hoy = rdToday();
  const totalBadge = count + seguimientos.length;

  return (
    <div className="relative">
      <Button
        variant="ghost" size="icon" aria-label="Notificaciones"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="relative"
      >
        <Bell />
        {totalBadge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white ring-2 ring-background">
            {totalBadge}
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
              Notificaciones {totalBadge > 0 && <span className="text-muted-foreground">({totalBadge})</span>}
            </div>

            <div className="max-h-[28rem] overflow-y-auto p-1">
              {/* Eventos vencidos: ¿los hiciste? (Sí / No → mover) */}
              {seguimientos.length > 0 && (
                <div className="mb-1 rounded-lg bg-accent/40 p-1">
                  <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    ¿Completaste estos eventos?
                  </p>
                  {seguimientos.map((s) => (
                    <SeguimientoRow key={s.id} s={s} onDone={() => { if (seguimientos.length + count <= 1) setOpen(false); }} />
                  ))}
                </div>
              )}

              {items.length === 0 && seguimientos.length === 0 && (
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
              href="/calendario"
              onMouseDown={() => setOpen(false)}
              className="block border-t border-border px-3 py-2.5 text-center text-sm text-electric hover:bg-accent"
            >
              Ver calendario
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Una fila de evento vencido con acciones Sí / No (mover a hoy u otra fecha). */
function SeguimientoRow({ s, onDone }: { s: SeguimientoEvento; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modo, setModo] = useState<"idle" | "mover">("idle");
  const [fecha, setFecha] = useState(rdToday());

  function hecho() {
    start(async () => { await confirmarEventoHecho(s.id); router.refresh(); onDone(); });
  }
  function mover(f: string) {
    start(async () => { await moverEventoVencido(s.id, f); router.refresh(); onDone(); });
  }

  const titulo = s.titulo?.trim() || (s.tipo ? EVENT_TIPOS[s.tipo as keyof typeof EVENT_TIPOS]?.label : null) || "Evento";
  const venc = s.diasVencido === 0 ? "venció ayer" : `vencido hace ${s.diasVencido} día${s.diasVencido === 1 ? "" : "s"}`;

  return (
    <div className="rounded-lg px-2 py-2">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{titulo}{s.cliente && <span className="ml-1 text-muted-foreground">· {s.cliente}</span>}</p>
          <p className="text-xs text-muted-foreground">⚠️ {venc} · {fechaCorta(s.fecha)}</p>
        </div>
        {pending && <Loader2 className="mt-1 size-4 animate-spin text-muted-foreground" />}
      </div>

      {modo === "idle" ? (
        <div className="mt-2 flex gap-1.5 pl-4">
          <button
            onClick={hecho} disabled={pending}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-success/40 bg-success/10 px-2 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50"
          >
            <Check className="size-3.5" /> Sí, lo hice
          </button>
          <button
            onClick={() => setModo("mover")} disabled={pending}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <X className="size-3.5" /> Todavía no
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-1.5 pl-4">
          <p className="text-[11px] text-muted-foreground">¿Para cuándo lo mueves?</p>
          <div className="flex gap-1.5">
            <button onClick={() => mover(rdToday())} disabled={pending}
              className="rounded-md border border-electric/40 bg-electric/10 px-2 py-1.5 text-xs font-medium text-electric transition-colors hover:bg-electric/20 disabled:opacity-50">
              Hoy
            </button>
            <button onClick={() => mover(addDays(rdToday(), 1))} disabled={pending}
              className="rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50">
              Mañana
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Calendar className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input type="date" value={fecha} min={rdToday()} onChange={(e) => setFecha(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-background/50 pl-7 pr-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <button onClick={() => mover(fecha)} disabled={pending}
              className="rounded-md bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              Mover
            </button>
          </div>
          <button onClick={() => setModo("idle")} disabled={pending} className="text-[11px] text-muted-foreground hover:text-foreground">
            ← Volver
          </button>
        </div>
      )}
    </div>
  );
}
