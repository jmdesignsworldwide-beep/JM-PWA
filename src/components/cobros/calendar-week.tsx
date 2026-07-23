"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EVENT_TIPOS } from "@/lib/eventos";
import { money } from "@/lib/format";
import { rdToday, addDays } from "@/lib/fecha";
import { cn } from "@/lib/utils";
import { EventDetail } from "./event-detail";
import { AddEventDialog } from "./add-event-dialog";

const DOW = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Client = { id: string; nombre: string; apellido: string | null; whatsapp: string | null; telefono: string | null };
type Project = { id: string; nombre: string };
type Influencer = { id: string; nombre: string };

function sortByHora(a: AgendaEvent, b: AgendaEvent) {
  if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
  if (a.hora) return -1;
  if (b.hora) return 1;
  return 0;
}

export function CalendarWeek({
  from, events, openEventId, clients = [], projects = [], influencers = [],
}: {
  from: string; // lunes de la semana (YYYY-MM-DD)
  events: AgendaEvent[];
  openEventId?: string;
  clients?: Client[]; projects?: Project[]; influencers?: Influencer[];
}) {
  const [selected, setSelected] = useState<AgendaEvent | null>(
    () => (openEventId ? events.find((e) => e.id === openEventId) ?? null : null),
  );
  const hoy = rdToday();
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const to = days[6];

  const byDay = new Map<string, AgendaEvent[]>();
  for (const e of events) {
    const arr = byDay.get(e.fecha) ?? [];
    arr.push(e);
    byDay.set(e.fecha, arr);
  }

  const rango = `${Number(from.slice(-2))} ${MESES[Number(from.slice(5, 7)) - 1]} — ${Number(to.slice(-2))} ${MESES[Number(to.slice(5, 7)) - 1]}`;

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-semibold">{rango}</h2>
          <div className="flex items-center gap-1">
            <Link href={`/calendario?v=semana&d=${addDays(from, -7)}`} className="rounded-md p-1.5 hover:bg-accent"><ChevronLeft className="size-4" /></Link>
            <Link href={`/calendario?v=semana&d=${hoy}`} className="rounded-md px-2 py-1 text-xs hover:bg-accent">Hoy</Link>
            <Link href={`/calendario?v=semana&d=${addDays(from, 7)}`} className="rounded-md p-1.5 hover:bg-accent"><ChevronRight className="size-4" /></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-7">
          {days.map((iso, i) => {
            const evs = (byDay.get(iso) ?? []).slice().sort(sortByHora);
            const esHoy = iso === hoy;
            const finde = i >= 5;
            return (
              <div key={iso} className={cn("min-h-[9rem] border-b border-border sm:border-r p-2", i % 7 === 6 && "sm:border-r-0", finde && "bg-secondary/20")}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] uppercase text-muted-foreground">{DOW[i]}</span>
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs", esHoy ? "bg-electric font-semibold text-white" : "font-medium")}>{Number(iso.slice(-2))}</span>
                  </div>
                  <AddEventDialog clients={clients} projects={projects} influencers={influencers} defaultDate={iso}
                    triggerLabel="" triggerVariant="ghost" triggerSize="sm" triggerClassName="size-6 p-0 justify-center" />
                </div>
                <div className="space-y-1">
                  {evs.length === 0 ? <p className="px-1 text-[11px] text-muted-foreground/60">—</p> : evs.map((e) => {
                    const c = e.tipo ? EVENT_TIPOS[e.tipo].color : "var(--muted-foreground)";
                    const nombre = e.cliente ? `${e.cliente.nombre} ${e.cliente.apellido ?? ""}`.trim() : e.influencer?.nombre ?? null;
                    return (
                      <button key={e.id} type="button" onClick={() => setSelected(e)}
                        className={cn("flex w-full items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-1.5 py-1 text-left transition-colors hover:bg-accent/50", e.completado && "opacity-55")}>
                        <span className="mt-0 h-full w-1 shrink-0 self-stretch rounded-full" style={{ background: c }} />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-xs font-medium", e.completado && "line-through")}>
                            {e.hora ? <span className="tabular-nums text-muted-foreground">{e.hora.slice(0, 5)} </span> : null}
                            {e.titulo ?? (e.tipo ? EVENT_TIPOS[e.tipo].label : "Evento")}
                          </span>
                          {(nombre || e.monto != null) && (
                            <span className="block truncate text-[10px] text-muted-foreground">{[nombre, e.monto != null ? money(e.monto, e.moneda ?? "DOP") : null].filter(Boolean).join(" · ")}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && <EventDetail e={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
