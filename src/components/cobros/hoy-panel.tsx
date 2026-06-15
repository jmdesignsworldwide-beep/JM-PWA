import { AlertTriangle, CalendarCheck, Sun, Truck } from "lucide-react";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EventItem } from "./event-item";

type Hoy = {
  vencidos: AgendaEvent[];
  cobrosHoy: AgendaEvent[];
  entregasHoy: AgendaEvent[];
  entregasManana: AgendaEvent[];
  iniciosHoy: AgendaEvent[];
};

export function HoyPanel({ data, compact = false }: { data: Hoy; compact?: boolean }) {
  const totalHoy =
    data.cobrosHoy.length + data.entregasHoy.length + data.iniciosHoy.length + data.entregasManana.length;
  const nada = totalHoy === 0 && data.vencidos.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sun className="size-4 text-warning" />
        <h2 className="font-semibold">Hoy</h2>
        <span className="text-xs text-muted-foreground">tu briefing del día</span>
      </div>
      <div className="space-y-4 p-4">
        {nada && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todo al día ☕ No hay cobros, entregas ni atrasos para hoy.
          </p>
        )}

        {data.vencidos.length > 0 && (
          <Group icon={<AlertTriangle className="size-4 text-destructive" />} title={`Vencido (${data.vencidos.length})`} danger>
            {data.vencidos.map((e) => <EventItem key={e.id} e={e} vencido />)}
          </Group>
        )}

        {data.cobrosHoy.length > 0 && (
          <Group icon={<CalendarCheck className="size-4 text-success" />} title="Cobras hoy">
            {data.cobrosHoy.map((e) => <EventItem key={e.id} e={e} showDate={false} />)}
          </Group>
        )}

        {data.entregasHoy.length > 0 && (
          <Group icon={<Truck className="size-4 text-brand-purple" />} title="Entregas hoy">
            {data.entregasHoy.map((e) => <EventItem key={e.id} e={e} showDate={false} />)}
          </Group>
        )}

        {!compact && data.entregasManana.length > 0 && (
          <Group icon={<Truck className="size-4 text-muted-foreground" />} title="Entregas mañana">
            {data.entregasManana.map((e) => <EventItem key={e.id} e={e} showDate={false} />)}
          </Group>
        )}

        {!compact && data.iniciosHoy.length > 0 && (
          <Group icon={<Sun className="size-4 text-electric" />} title="Inicia hoy">
            {data.iniciosHoy.map((e) => <EventItem key={e.id} e={e} showDate={false} />)}
          </Group>
        )}
      </div>
    </div>
  );
}

function Group({ icon, title, danger, children }: { icon: React.ReactNode; title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-sm font-medium ${danger ? "text-destructive" : ""}`}>
        {icon} {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
