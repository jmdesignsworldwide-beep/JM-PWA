import { ListChecks, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/animations/motion";
import { HoyPanel } from "@/components/cobros/hoy-panel";
import { CashflowPanel } from "@/components/cobros/cashflow-panel";
import { CalendarMonth } from "@/components/cobros/calendar-month";
import { PendientesList } from "@/components/cobros/pendientes-list";
import { DeudasPanel } from "@/components/cobros/deudas-panel";
import { DeudasEquipoPanel } from "@/components/cobros/deudas-equipo-panel";
import { ManualDebtsPanel } from "@/components/cobros/manual-debts-panel";
import { getHoy, getCashflow, getPendientes, getEventsRange, getSaldosClientes } from "@/lib/data/agenda";
import { getDebts } from "@/lib/data/equipo";
import { getManualDebts } from "@/lib/data/debts";
import { getContacts } from "@/lib/data/clients";
import { HandCoins } from "lucide-react";
import { rdToday, startOfMonth, endOfMonth } from "@/lib/fecha";

export const metadata = { title: "Cobros y Entregas" };

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; cliente?: string }>;
}) {
  const { m, cliente } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : rdToday().slice(0, 7);
  const first = `${month}-01`;

  const [hoy, cashflow, pendientes, monthEvents, saldos, debts, manualDebts, contacts] = await Promise.all([
    getHoy(),
    getCashflow(),
    getPendientes(),
    getEventsRange(startOfMonth(first), endOfMonth(first)),
    getSaldosClientes(),
    getDebts(),
    getManualDebts(),
    getContacts(),
  ]);

  const calEvents = monthEvents.filter((e) => e.tipo === "cobro" || e.tipo === "entrega" || e.tipo === "inicio");

  return (
    <>
      <PageHeader
        title="Cobros y Entregas"
        subtitle="Tu dinero en movimiento. Lo vencido va primero."
      />

      <StaggerContainer className="space-y-6">
        <StaggerItem><CashflowPanel data={cashflow} /></StaggerItem>

        <StaggerItem>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Wallet className="size-4 text-electric" /> Saldos por cliente</h2>
          <p className="mb-3 text-sm text-muted-foreground">Lo que cada cliente debe y lo que ya pagó. Clic para registrar un pago (entra solo a Finanzas).</p>
          <DeudasPanel saldos={saldos} openClientId={cliente} />
        </StaggerItem>

        <StaggerItem>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><HandCoins className="size-4 text-electric" /> ¿A quién le debo?</h2>
          <p className="mb-3 text-sm text-muted-foreground">Deudas que registras a mano + lo que le debes al equipo por tareas hechas.</p>
          <ManualDebtsPanel debts={manualDebts} contacts={contacts.map((c) => ({ id: c.id, nombre: c.nombre, apellido: c.apellido, es_personal: c.es_personal, es_lead: c.es_lead }))} />
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Del equipo (por tareas)</p>
            <DeudasEquipoPanel debts={debts} />
          </div>
        </StaggerItem>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <StaggerItem><HoyPanel data={hoy} /></StaggerItem>
          <StaggerItem className="space-y-6">
            <CalendarMonth month={month} events={calEvents} basePath="/cobros" />
          </StaggerItem>
        </div>

        <StaggerItem>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ListChecks className="size-4 text-electric" /> Pendientes (próximos 60 días)</h2>
          <PendientesList items={pendientes} />
        </StaggerItem>
      </StaggerContainer>
    </>
  );
}
