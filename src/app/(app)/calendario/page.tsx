import { PageHeader } from "@/components/layout/page-header";
import { CalendarMonth } from "@/components/cobros/calendar-month";
import { CalendarWeek } from "@/components/cobros/calendar-week";
import { CalendarDay } from "@/components/cobros/calendar-day";
import { CalendarViewSwitcher } from "@/components/cobros/calendar-view-switcher";
import { AddEventDialog } from "@/components/cobros/add-event-dialog";
import { getEventsRange } from "@/lib/data/agenda";
import { getClients } from "@/lib/data/clients";
import { getInfluencers } from "@/lib/data/influencers";
import { EVENT_TIPO_LIST } from "@/lib/eventos";
import { rdToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "@/lib/fecha";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Calendario" };

type Vista = "dia" | "semana" | "mes";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; d?: string; v?: string; ev?: string }>;
}) {
  const { m, d, v, ev } = await searchParams;
  const vista: Vista = v === "dia" || v === "semana" ? v : "mes";

  // Ancla: día para día/semana; mes para la vista mensual.
  const anchor = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : rdToday();
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : anchor.slice(0, 7);

  // Rango a cargar según la vista.
  let from: string, to: string;
  if (vista === "dia") { from = anchor; to = anchor; }
  else if (vista === "semana") { from = startOfWeek(anchor); to = endOfWeek(anchor); }
  else { const first = `${month}-01`; from = startOfMonth(first); to = endOfMonth(first); }

  const supabase = await createClient();
  const [events, clients, influencers, { data: projs }] = await Promise.all([
    getEventsRange(from, to),
    getClients(),
    getInfluencers(),
    supabase.from("projects").select("id, nombre").order("created_at", { ascending: false }).limit(200),
  ]);
  const clientOpts = clients.map((c) => ({ id: c.id, nombre: c.nombre, apellido: c.apellido, whatsapp: c.whatsapp, telefono: c.telefono }));
  const projectOpts = ((projs ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Proyecto" }));
  const influencerOpts = influencers.map((i) => ({ id: i.id, nombre: i.nombre }));

  return (
    <>
      <PageHeader title="Calendario" subtitle="Todos los eventos: cobros, entregas, inicios, acuerdos y personales.">
        <AddEventDialog clients={clientOpts} projects={projectOpts} influencers={influencerOpts} defaultDate={vista === "mes" ? undefined : anchor} />
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CalendarViewSwitcher vista={vista} anchor={anchor} month={month} />
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {EVENT_TIPO_LIST.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: t.color }} /> {t.label}
            </span>
          ))}
        </div>
      </div>

      {vista === "mes" && (
        <CalendarMonth
          month={month} events={events} basePath="/calendario" openEventId={ev}
          clients={clientOpts} projects={projectOpts} influencers={influencerOpts}
        />
      )}
      {vista === "semana" && (
        <CalendarWeek
          from={from} events={events} openEventId={ev}
          clients={clientOpts} projects={projectOpts} influencers={influencerOpts}
        />
      )}
      {vista === "dia" && (
        <CalendarDay
          date={anchor} events={events} openEventId={ev}
          clients={clientOpts} projects={projectOpts} influencers={influencerOpts}
        />
      )}
    </>
  );
}
