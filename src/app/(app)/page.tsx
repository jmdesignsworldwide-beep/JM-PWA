import {
  TrendingUp,
  Users,
  FileText,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, AnimatedCard, StaggerItem } from "@/components/animations/motion";
import { CountUp } from "@/components/animations/count-up";

const KPIS = [
  {
    label: "Leads activos",
    value: 0,
    icon: TrendingUp,
    hint: "Pipeline de ventas",
  },
  {
    label: "Clientes",
    value: 0,
    icon: Users,
    hint: "Clientes activos",
  },
  {
    label: "Pedidos abiertos",
    value: 0,
    icon: FileText,
    hint: "En proceso",
  },
  {
    label: "Por cobrar (DOP)",
    value: 0,
    icon: Wallet,
    hint: "Saldo pendiente",
    prefix: "RD$ ",
  },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Bienvenida, Marien 👋"
        subtitle="Tu centro de mando. Aquí verás todo lo que mueve el negocio."
      />

      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <AnimatedCard key={kpi.label} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-electric">
                  <Icon className="size-5" />
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                <CountUp value={kpi.value} prefix={kpi.prefix} />
              </p>
              <p className="mt-1 text-sm font-medium">{kpi.label}</p>
              <p className="text-xs text-muted-foreground">{kpi.hint}</p>
            </AnimatedCard>
          );
        })}
      </StaggerContainer>

      <StaggerContainer className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StaggerItem className="lg:col-span-2">
          <div className="h-full rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold">Actividad reciente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando empieces a registrar leads, pedidos y cobros, los verás
              aquí.
            </p>
            <div className="mt-5 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton size-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-1/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="h-full rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold">Próximo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              El flujo central (Lead → Pedido → Contrato → Factura) llega en las
              próximas fases.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {[
                "Fase 2 · Base de datos",
                "Fase 3 · Leads y Clientes",
                "Fase 4 · Pedidos → Facturas",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="size-1.5 rounded-full bg-electric" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </>
  );
}
