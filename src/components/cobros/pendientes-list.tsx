import type { AgendaEvent } from "@/lib/data/agenda";
import { rdToday } from "@/lib/fecha";
import { EventItem } from "./event-item";

export function PendientesList({ items }: { items: AgendaEvent[] }) {
  const hoy = rdToday();
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
        No hay cobros ni entregas pendientes. 🎉
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((e) => (
        <EventItem key={e.id} e={e} vencido={e.fecha < hoy} />
      ))}
    </div>
  );
}
