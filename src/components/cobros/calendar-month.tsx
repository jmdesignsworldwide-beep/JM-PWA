"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Clock, CalendarDays } from "lucide-react";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EVENT_TIPOS } from "@/lib/eventos";
import { money } from "@/lib/format";
import { rdToday } from "@/lib/fecha";
import { cn } from "@/lib/utils";
import { EventDetail } from "./event-detail";
import { AddEventDialog } from "./add-event-dialog";
import { Sheet } from "@/components/ui/sheet";

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const WEEKDAYS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

type Client = { id: string; nombre: string; apellido: string | null; whatsapp: string | null; telefono: string | null };
type Project = { id: string; nombre: string };
type Influencer = { id: string; nombre: string };

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Orden por hora: con hora primero (ascendente), luego sin hora. */
function sortByHora(a: AgendaEvent, b: AgendaEvent) {
  if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
  if (a.hora) return -1;
  if (b.hora) return 1;
  return 0;
}

function tituloDia(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd}, ${d} de ${MESES[m - 1]}`;
}

export function CalendarMonth({
  month,
  events,
  basePath,
  openEventId,
  clients = [],
  projects = [],
  influencers = [],
}: {
  month: string; // YYYY-MM
  events: AgendaEvent[];
  basePath: string;
  openEventId?: string;
  clients?: Client[];
  projects?: Project[];
  influencers?: Influencer[];
}) {
  // Deep-link: ?ev=<id> abre el detalle de ese evento al cargar (init lazy).
  const [selected, setSelected] = useState<AgendaEvent | null>(
    () => (openEventId ? events.find((e) => e.id === openEventId) ?? null : null),
  );
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const startOffset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const hoy = rdToday();

  const byDay = new Map<string, AgendaEvent[]>();
  for (const e of events) {
    const arr = byDay.get(e.fecha) ?? [];
    arr.push(e);
    byDay.set(e.fecha, arr);
  }

  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);

  const dayEvents = dayOpen ? (byDay.get(dayOpen) ?? []).slice().sort(sortByHora) : [];

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-semibold capitalize">{MESES[m - 1]} {y}</h2>
          <div className="flex items-center gap-1">
            <Link href={`${basePath}?m=${shiftMonth(month, -1)}`} className="rounded-md p-1.5 hover:bg-accent">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={`${basePath}?m=${rdToday().slice(0, 7)}`} className="rounded-md px-2 py-1 text-xs hover:bg-accent">
              Hoy
            </Link>
            <Link href={`${basePath}?m=${shiftMonth(month, 1)}`} className="rounded-md p-1.5 hover:bg-accent">
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border text-center text-[11px] font-medium uppercase text-muted-foreground">
          {DOW.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((iso, i) => {
            if (!iso) return <div key={i} className={cn("min-h-24 border-b border-r border-border", i % 7 === 6 && "border-r-0")} />;
            const evs = (byDay.get(iso) ?? []).slice().sort(sortByHora);
            const n = evs.length;
            const esHoy = iso === hoy;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDayOpen(iso)}
                className={cn(
                  "flex min-h-24 flex-col border-b border-r border-border p-1.5 text-left transition-colors",
                  i % 7 === 6 && "border-r-0",
                  esHoy && "bg-[color-mix(in_srgb,var(--electric)_7%,transparent)]",
                  "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-electric/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    esHoy ? "bg-electric font-semibold text-white shadow-[0_2px_10px_-2px_var(--electric)]" : "text-muted-foreground",
                  )}>
                    {Number(iso.slice(-2))}
                  </span>
                  {n > 0 && (
                    <span className="rounded-full bg-secondary px-1.5 text-[10px] font-medium text-muted-foreground">{n}</span>
                  )}
                </div>
                {n > 0 && (
                  <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                    {evs.slice(0, 6).map((e) => {
                      const c = e.tipo ? EVENT_TIPOS[e.tipo].color : "var(--muted-foreground)";
                      return (
                        <span
                          key={e.id}
                          className="size-1.5 rounded-full"
                          style={{ background: c, opacity: e.completado ? 0.35 : 1 }}
                        />
                      );
                    })}
                    {n > 6 && <span className="text-[9px] font-medium text-muted-foreground">+{n - 6}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel del día (hoja lateral reutilizable con safe-area) */}
      <AnimatePresence>
        {dayOpen && (
          <Sheet side="right" onClose={() => setDayOpen(null)}>
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                <div>
                  <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <CalendarDays className="size-3.5" /> Agenda del día
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold capitalize">{tituloDia(dayOpen)}</h3>
                  <p className="text-xs text-muted-foreground">{dayEvents.length} evento{dayEvents.length === 1 ? "" : "s"}</p>
                </div>
                <button onClick={() => setDayOpen(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>

              {/* Acción: agregar evento con la fecha ya puesta */}
              <div className="border-b border-border p-3">
                <AddEventDialog
                  clients={clients} projects={projects} influencers={influencers}
                  defaultDate={dayOpen} triggerLabel="Agregar evento"
                  triggerVariant="gradient" triggerClassName="w-full justify-center"
                />
              </div>

              {/* Lista ordenada por hora */}
              <div className="flex-1 overflow-y-auto p-3">
                {dayEvents.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                    <CalendarDays className="size-8 opacity-40" />
                    Sin eventos este día. Agrega el primero con el botón de arriba.
                  </div>
                ) : (
                  <motion.ul
                    initial="hidden" animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.04 } } }}
                    className="space-y-2"
                  >
                    {dayEvents.map((e) => {
                      const t = e.tipo ? EVENT_TIPOS[e.tipo] : null;
                      const nombre = e.cliente ? `${e.cliente.nombre} ${e.cliente.apellido ?? ""}`.trim() : null;
                      const sub = [nombre, e.monto != null ? money(e.monto, e.moneda ?? "DOP") : null].filter(Boolean).join(" · ");
                      return (
                        <motion.li key={e.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                          <button
                            type="button"
                            onClick={() => setSelected(e)}
                            className={cn(
                              "flex w-full items-stretch gap-3 rounded-xl border border-border bg-background/40 p-3 text-left transition-colors hover:bg-accent/50",
                              e.completado && "opacity-60",
                            )}
                          >
                            <span className="w-1 shrink-0 rounded-full" style={{ background: t?.color ?? "var(--muted-foreground)" }} />
                            <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary/60 px-1 py-1.5">
                              <Clock className="size-3 text-muted-foreground" />
                              <span className="mt-0.5 text-xs font-semibold tabular-nums">{e.hora ? e.hora.slice(0, 5) : "—"}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className={cn("truncate font-medium", e.completado && "line-through")}>{e.titulo ?? t?.label ?? "Evento"}</span>
                              </span>
                              <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                {t && (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="size-2 rounded-full" style={{ background: t.color }} /> {t.label}
                                  </span>
                                )}
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
          </Sheet>
        )}
      </AnimatePresence>

      {selected && <EventDetail e={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
