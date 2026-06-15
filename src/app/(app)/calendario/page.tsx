import { PageHeader } from "@/components/layout/page-header";
import { CalendarMonth } from "@/components/cobros/calendar-month";
import { AddEventDialog } from "@/components/cobros/add-event-dialog";
import { getEventsRange } from "@/lib/data/agenda";
import { EVENT_TIPO_LIST } from "@/lib/eventos";
import { rdToday, startOfMonth, endOfMonth } from "@/lib/fecha";

export const metadata = { title: "Calendario" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : rdToday().slice(0, 7);
  const first = `${month}-01`;
  const events = await getEventsRange(startOfMonth(first), endOfMonth(first));

  return (
    <>
      <PageHeader title="Calendario" subtitle="Todos los eventos: cobros, entregas, inicios, acuerdos y personales.">
        <AddEventDialog />
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
