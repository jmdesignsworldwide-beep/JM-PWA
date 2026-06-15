import { PageHeader } from "@/components/layout/page-header";
import { HoyPanel } from "@/components/cobros/hoy-panel";
import { CashflowPanel } from "@/components/cobros/cashflow-panel";
import { CalendarMonth } from "@/components/cobros/calendar-month";
import { PendientesList } from "@/components/cobros/pendientes-list";
import { getHoy, getCashflow, getPendientes, getEventsRange } from "@/lib/data/agenda";
import { rdToday, startOfMonth, endOfMonth } from "@/lib/fecha";

export const metadata = { title: "Cobros y Entregas" };

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : rdToday().slice(0, 7);
  const first = `${month}-01`;

  const [hoy, cashflow, pendientes, monthEvents] = await Promise.all([
    getHoy(),
    getCashflow(),
    getPendientes(),
    getEventsRange(startOfMonth(first), endOfMonth(first)),
  ]);

  const calEvents = monthEvents.filter((e) => e.tipo === "cobro" || e.tipo === "entrega" || e.tipo === "inicio");

  return (
    <>
      <PageHeader
        title="Cobros y Entregas"
        subtitle="Tu dinero en movimiento. Lo vencido va primero."
      />

      <div className="space-y-6">
        <CashflowPanel data={cashflow} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <HoyPanel data={hoy} />
          <div className="space-y-6">
            <CalendarMonth month={month} events={calEvents} basePath="/cobros" />
          </div>
        </div>

        <section>
          <h2 className="mb-3 font-semibold">Pendientes (próximos 60 días)</h2>
          <PendientesList items={pendientes} />
        </section>
      </div>
    </>
  );
}
