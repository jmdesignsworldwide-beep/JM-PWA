import { TrendingUp, Users, FileText, Wallet, Repeat, Target, ArrowUpRight, Sparkles, Lightbulb, BarChart3 } from "lucide-react";
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
import { fechaCorta } from "@/lib/format";

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
    { label: "Prospectos activos", value: kpis.leadsActivos, icon: TrendingUp, hint: "Pipeline" },
    { label: "Proyectos activos", value: kpis.proyectosActivos, icon: FileText, hint: "En curso" },
    { label: "Conversión", value: kpis.conversion, icon: Target, hint: "Prospectos ganados", suffix: "%" },
    { label: "MRR (DOP)", value: kpis.mrr, icon: Repeat, hint: "Recurrente mensual", prefix: "RD$ " },
    { label: "Ingresado (DOP)", value: kpis.ingresado.DOP, icon: Users, hint: "Total histórico", prefix: "RD$ " },
  ];

  return (
    <>
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
          <Sparkles className="size-3 text-electric" /> {fechaCorta(rdToday())}
        </span>
        <BlurInText as="h1" text="Bienvenida, Marien 👋" className="mt-2 block text-2xl font-semibold tracking-tight sm:text-3xl" />
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
              <MagneticCard className="group relative h-full overflow-hidden p-4">
                <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-20 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--electric)_18%,transparent),transparent_70%)] opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-white shadow-sm"><Icon className="size-5" /></div>
                  <ArrowUpRight className="size-4 text-muted-foreground/50 transition-colors group-hover:text-electric" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight">
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
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Lightbulb className="size-4 text-electric" /> Insights</h2>
        <InsightCards insights={insights} />
      </div>

      {/* Gráficos */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><BarChart3 className="size-4 text-electric" /> Embudo y proyectos</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FunnelChart data={funnel} />
          <StatusChart data={byStatus} />
        </div>
      </div>
    </>
  );
}
