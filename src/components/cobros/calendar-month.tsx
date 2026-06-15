"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EVENT_TIPOS } from "@/lib/eventos";
import { money } from "@/lib/format";
import { rdToday } from "@/lib/fecha";
import { cn } from "@/lib/utils";

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function CalendarMonth({
  month,
  events,
  basePath,
}: {
  month: string; // YYYY-MM
  events: AgendaEvent[];
  basePath: string;
}) {
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
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${month}-${String(d).padStart(2, "0")}`);
  }

  return (
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
        {cells.map((iso, i) => (
          <div key={i} className={cn("min-h-24 border-b border-r border-border p-1.5", i % 7 === 6 && "border-r-0")}>
            {iso && (
              <>
                <div className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-xs",
                  iso === hoy ? "bg-electric font-semibold text-white" : "text-muted-foreground",
                )}>
                  {Number(iso.slice(-2))}
                </div>
                <div className="space-y-1">
                  {(byDay.get(iso) ?? []).slice(0, 3).map((e) => {
                    const t = e.tipo ? EVENT_TIPOS[e.tipo] : null;
                    const label = e.monto != null ? money(e.monto, e.moneda ?? "DOP") : (e.cliente?.nombre ?? e.titulo ?? "Evento");
                    const chip = (
                      <span
                        className={cn("block truncate rounded px-1.5 py-0.5 text-[10px]", e.completado && "line-through opacity-50")}
                        style={{ background: `color-mix(in srgb, ${t?.color ?? "var(--muted)"} 18%, transparent)`, color: t?.color }}
                        title={`${t?.label ?? ""}: ${e.titulo ?? ""}`}
                      >
                        {label}
                      </span>
                    );
                    return e.client_id ? (
                      <Link key={e.id} href={`/clientes/${e.client_id}`}>{chip}</Link>
                    ) : <div key={e.id}>{chip}</div>;
                  })}
                  {(byDay.get(iso)?.length ?? 0) > 3 && (
                    <span className="block text-[10px] text-muted-foreground">+{(byDay.get(iso)!.length - 3)} más</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
