"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, CalendarDays } from "lucide-react";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EVENT_TIPOS } from "@/lib/eventos";
import { money } from "@/lib/format";
import { rdToday, addDays } from "@/lib/fecha";
import { cn } from "@/lib/utils";
import { EventDetail } from "./event-detail";
import { AddEventDialog } from "./add-event-dialog";

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

type Client = { id: string; nombre: string; apellido: string | null; whatsapp: string | null; telefono: string | null };
type Project = { id: string; nombre: string };
type Influencer = { id: string; nombre: string };

function sortByHora(a: AgendaEvent, b: AgendaEvent) {
  if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
  if (a.hora) return -1;
  if (b.hora) return 1;
  return 0;
}
function tituloDia(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd}, ${d} de ${MESES[m - 1]} ${y}`;
}

export function CalendarDay({
  date, events, openEventId, clients = [], projects = [], influencers = [],
}: {
  date: string; // YYYY-MM-DD
  events: AgendaEvent[];
  openEventId?: string;
  clients?: Client[]; projects?: Project[]; influencers?: Influencer[];
}) {
  const [selected, setSelected] = useState<AgendaEvent | null>(
    () => (openEventId ? events.find((e) => e.id === openEventId) ?? null : null),
  );
  const hoy = rdToday();
  const dayEvents = events.filter((e) => e.fecha === date).sort(sortByHora);

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="font-semibold capitalize">{tituloDia(date)}</h2>
            <p className="text-xs text-muted-foreground">{dayEvents.length} evento{dayEvents.length === 1 ? "" : "s"}{date === hoy ? " · hoy" : ""}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/calendario?v=dia&d=${addDays(date, -1)}`} className="rounded-md p-1.5 hover:bg-accent"><ChevronLeft className="size-4" /></Link>
            <Link href={`/calendario?v=dia&d=${hoy}`} className="rounded-md px-2 py-1 text-xs hover:bg-accent">Hoy</Link>
            <Link href={`/calendario?v=dia&d=${addDays(date, 1)}`} className="rounded-md p-1.5 hover:bg-accent"><ChevronRight className="size-4" /></Link>
          </div>
        </div>

        <div className="border-b border-border p-3">
          <AddEventDialog clients={clients} projects={projects} influencers={influencers}
            defaultDate={date} triggerLabel="Agregar evento" triggerVariant="gradient" triggerClassName="w-full justify-center" />
        </div>

        <div className="p-3">
          {dayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <CalendarDays className="size-8 opacity-40" />
              Sin eventos este día. Agrega el primero con el botón de arriba.
            </div>
          ) : (
            <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="space-y-2">
              {dayEvents.map((e) => {
                const t = e.tipo ? EVENT_TIPOS[e.tipo] : null;
                const nombre = e.cliente ? `${e.cliente.nombre} ${e.cliente.apellido ?? ""}`.trim() : e.influencer?.nombre ?? null;
                const sub = [nombre, e.monto != null ? money(e.monto, e.moneda ?? "DOP") : null].filter(Boolean).join(" · ");
                return (
                  <motion.li key={e.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                    <button type="button" onClick={() => setSelected(e)}
                      className={cn("flex w-full items-stretch gap-3 rounded-xl border border-border bg-background/40 p-3 text-left transition-colors hover:bg-accent/50", e.completado && "opacity-60")}>
                      <span className="w-1 shrink-0 rounded-full" style={{ background: t?.color ?? "var(--muted-foreground)" }} />
                      <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary/60 px-1 py-1.5">
                        <Clock className="size-3 text-muted-foreground" />
                        <span className="mt-0.5 text-xs font-semibold tabular-nums">{e.hora ? e.hora.slice(0, 5) : "—"}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate font-medium", e.completado && "line-through")}>{e.titulo ?? t?.label ?? "Evento"}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {t && <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: t.color }} /> {t.label}</span>}
                          {sub && <span className="truncate">· {sub}</span>}
                        </span>
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </div>
      </div>

      {selected && <EventDetail e={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
