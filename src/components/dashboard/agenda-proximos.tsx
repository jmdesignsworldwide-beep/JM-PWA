import Link from "next/link";
import { CalendarClock, ArrowUpRight, ChevronRight } from "lucide-react";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EVENT_TIPOS } from "@/lib/eventos";
import { money, fechaCorta } from "@/lib/format";
import { rdToday, addDays } from "@/lib/fecha";

/** Etiqueta relativa amable: Hoy / Mañana / fecha corta. */
function cuando(fecha: string): string {
  const hoy = rdToday();
  if (fecha === hoy) return "Hoy";
  if (fecha === addDays(hoy, 1)) return "Mañana";
  return fechaCorta(fecha);
}

/**
 * Próximos eventos del Calendario en el Dashboard: reuniones, entregas y cobros
 * que vienen, ordenados por fecha. Cada uno abre su detalle en el Calendario.
 */
export function AgendaProximos({ eventos }: { eventos: AgendaEvent[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4 text-electric" /> Próximos eventos</h2>
        <Link href="/calendario" className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-electric">
          Ver calendario <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {eventos.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No tienes eventos próximos. <Link href="/calendario" className="text-electric hover:underline">Agenda uno</Link>.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {eventos.map((e) => {
            const tipo = e.tipo ? EVENT_TIPOS[e.tipo] : null;
            const titulo = e.titulo || e.cliente?.nombre || e.influencer?.nombre || tipo?.label || "Evento";
            const sub = [tipo?.label, e.cliente ? `${e.cliente.nombre} ${e.cliente.apellido ?? ""}`.trim() : null, e.influencer?.nombre]
              .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · ");
            return (
              <li key={e.id}>
                <Link
                  href={`/calendario?m=${e.fecha.slice(0, 7)}&ev=${e.id}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: tipo?.color ?? "var(--muted-foreground)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{titulo}</p>
                    {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium">{cuando(e.fecha)}{e.hora ? ` · ${e.hora}` : ""}</p>
                    {e.monto != null && <p className="text-xs text-muted-foreground">{money(e.monto, e.moneda ?? "DOP")}</p>}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-electric" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
