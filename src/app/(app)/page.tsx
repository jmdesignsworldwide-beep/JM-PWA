import {
  TrendingUp,
  Users,
  FileText,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/animations/motion";
import { MagneticCard } from "@/components/animations/magnetic-card";
import { BlurInText } from "@/components/animations/blur-in-text";
import { Spotlight } from "@/components/animations/spotlight";
import { CountUp } from "@/components/animations/count-up";
import { HoyPanel } from "@/components/cobros/hoy-panel";
import { getHoy } from "@/lib/data/agenda";

const KPIS = [
  { label: "Leads activos", value: 0, icon: TrendingUp, hint: "Pipeline de ventas" },
  { label: "Clientes", value: 0, icon: Users, hint: "Clientes activos" },
  { label: "Pedidos abiertos", value: 0, icon: FileText, hint: "En proceso" },
  {
    label: "Por cobrar (DOP)",
    value: 0,
    icon: Wallet,
    hint: "Saldo pendiente",
    prefix: "RD$ ",
  },
];

export default async function DashboardPage() {
  const hoy = await getHoy();
  return (
    <>
      {/* Hero del dashboard (momento "wow") */}
      <div className="mb-6">
        <BlurInText
          as="h1"
          text="Bienvenida, Marien 👋"
          className="block text-2xl font-semibold tracking-tight sm:text-3xl"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Tu centro de mando. Aquí verás todo lo que mueve el negocio.
        </p>
      </div>

      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <StaggerItem key={kpi.label}>
              <MagneticCard className="h-full p-5">
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
              </MagneticCard>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      <StaggerContainer className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StaggerItem className="lg:col-span-2">
          <Spotlight className="h-full rounded-xl border border-border bg-card" size={420}>
            <div className="p-6">
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
          </Spotlight>
        </StaggerItem>

        <StaggerItem>
          <HoyPanel data={hoy} compact />
        </StaggerItem>
      </StaggerContainer>
    </>
  );
}
