import { PageHeader } from "@/components/layout/page-header";
import { CalendarMonth } from "@/components/cobros/calendar-month";
import { AddEventDialog } from "@/components/cobros/add-event-dialog";
import { getEventsRange } from "@/lib/data/agenda";
import { getClients } from "@/lib/data/clients";
import { EVENT_TIPO_LIST } from "@/lib/eventos";
import { rdToday, startOfMonth, endOfMonth } from "@/lib/fecha";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Calendario" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : rdToday().slice(0, 7);
  const first = `${month}-01`;
  const supabase = await createClient();
  const [events, clients, { data: projs }] = await Promise.all([
    getEventsRange(startOfMonth(first), endOfMonth(first)),
    getClients(),
    supabase.from("projects").select("id, nombre").order("created_at", { ascending: false }).limit(200),
  ]);
  const clientOpts = clients.map((c) => ({ id: c.id, nombre: c.nombre, apellido: c.apellido, whatsapp: c.whatsapp, telefono: c.telefono }));
  const projectOpts = ((projs ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Proyecto" }));

  return (
    <>
      <PageHeader title="Calendario" subtitle="Todos los eventos: cobros, entregas, inicios, acuerdos y personales.">
        <AddEventDialog clients={clientOpts} projects={projectOpts} />
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {EVENT_TIPO_LIST.map((t) => (
          <span key={t.id} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: t.color }} /> {t.label}
          </span>
        ))}
      </div>

      <CalendarMonth month={month} events={events} basePath="/calendario" />
    </>
  );
}
