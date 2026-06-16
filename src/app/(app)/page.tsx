import { TrendingUp, Users, FileText, Wallet, Repeat, Target, ArrowUpRight } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/animations/motion";
import { MagneticCard } from "@/components/animations/magnetic-card";
import { BlurInText } from "@/components/animations/blur-in-text";
import { CountUp } from "@/components/animations/count-up";
import { HoyPanel } from "@/components/cobros/hoy-panel";
import { DailyExpensePrompt } from "@/components/finanzas/daily-expense-prompt";
import { ExecSummary } from "@/components/dashboard/exec-summary";
import { AccionesPanel } from "@/components/dashboard/acciones-panel";
import { InsightCards } from "@/components/dashboard/insight-cards";
import { FunnelChart, StatusChart } from "@/components/dashboard/mini-charts";
import { getHoy } from "@/lib/data/agenda";
import { getBrands } from "@/lib/data/clients";
import { getKpis, getRuleInsights, getFunnel, getProjectsByStatus } from "@/lib/data/insights";
import { getSuggestedActions } from "@/lib/data/acciones";
import { createClient } from "@/lib/supabase/server";
import { rdToday } from "@/lib/fecha";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [hoy, brands, kpis, insights, acciones, funnel, byStatus, cats, projs, dailyLog] = await Promise.all([
    getHoy(),
    getBrands(),
    getKpis(),
    getRuleInsights(),
    getSuggestedActions(),
    getFunnel(),
    getProjectsByStatus(),
    supabase.from("categories").select("nombre, tipo").eq("tipo", "gasto"),
    supabase.from("projects").select("id, nombre").order("created_at", { ascending: false }).limit(100),
    supabase.from("daily_expense_log").select("fecha").eq("fecha", rdToday()).maybeSingle(),
  ]);
  const categoriasGasto = ((cats.data ?? []) as { nombre: string }[]).map((c) => c.nombre);
  const projects = ((projs.data ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Proyecto" }));

  const KPIS = [
    { label: "Por cobrar (DOP)", value: kpis.porCobrar, icon: Wallet, hint: "Saldo pendiente", prefix: "RD$ " },
    { label: "Leads activos", value: kpis.leadsActivos, icon: TrendingUp, hint: "Pipeline" },
    { label: "Proyectos activos", value: kpis.proyectosActivos, icon: FileText, hint: "En curso" },
    { label: "Conversión", value: kpis.conversion, icon: Target, hint: "Leads ganados", suffix: "%" },
    { label: "MRR (DOP)", value: kpis.mrr, icon: Repeat, hint: "Recurrente mensual", prefix: "RD$ " },
    { label: "Ingresado (DOP)", value: kpis.ingresado.DOP, icon: Users, hint: "Total histórico", prefix: "RD$ " },
  ];

  return (
    <>
      <div className="mb-6">
        <BlurInText as="h1" text="Bienvenida, Marien 👋" className="block text-2xl font-semibold tracking-tight sm:text-3xl" />
        <p className="mt-1 text-sm text-muted-foreground">Tu centro de mando inteligente. El sistema corre adelante de ti.</p>
      </div>

      <div className="mb-6">
        <DailyExpensePrompt registradoHoy={!!dailyLog.data} categorias={categoriasGasto} projects={projects} brands={brands} />
      </div>

      {/* Resumen IA */}
      <div className="mb-6"><ExecSummary /></div>

      {/* KPIs reales */}
      <StaggerContainer className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <StaggerItem key={kpi.label}>
              <MagneticCard className="h-full p-4">
                <div className="flex items-start justify-between">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-electric"><Icon className="size-4" /></div>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  <CountUp value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />
                </p>
                <p className="mt-1 text-xs font-medium">{kpi.label}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.hint}</p>
              </MagneticCard>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Acciones sugeridas + HOY */}
      <StaggerContainer className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StaggerItem><AccionesPanel acciones={acciones} /></StaggerItem>
        <StaggerItem><HoyPanel data={hoy} compact /></StaggerItem>
      </StaggerContainer>

      {/* Insights */}
      <div className="mt-6">
        <h2 className="mb-3 font-semibold">Insights</h2>
        <InsightCards insights={insights} />
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FunnelChart data={funnel} />
        <StatusChart data={byStatus} />
      </div>
    </>
  );
}
