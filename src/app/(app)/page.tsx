import Link from "next/link";
import { Wallet, Repeat, ArrowUpRight, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/animations/motion";
import { MagneticCard } from "@/components/animations/magnetic-card";
import { BlurInText } from "@/components/animations/blur-in-text";
import { CountUp } from "@/components/animations/count-up";
import { HoyPanel } from "@/components/cobros/hoy-panel";
import { DailyExpensePrompt } from "@/components/finanzas/daily-expense-prompt";
import { ExecSummary } from "@/components/dashboard/exec-summary";
import { AccionesPanel } from "@/components/dashboard/acciones-panel";
import { AgendaProximos } from "@/components/dashboard/agenda-proximos";
import { getHoy, getProximosEventos, type AgendaEvent } from "@/lib/data/agenda";
import { getBrands } from "@/lib/data/clients";
import { getDashboardKpis } from "@/lib/data/insights";
import { getSuggestedActions } from "@/lib/data/acciones";
import { createClient } from "@/lib/supabase/server";
import { rdToday } from "@/lib/fecha";
import { fechaCorta } from "@/lib/format";

// El selector de marca de arriba escribe ?marca=<slug>; aquí lo resolvemos.
const MARCA_KEY: Record<string, string> = { "jm-designs": "design", kitjoy: "kitjoy", "jm-distribution": "distribution" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ marca?: string }>;
}) {
  const { marca } = await searchParams;
  const personal = marca === "personal";

  const supabase = await createClient();
  const [proximos, hoy, brands, acciones, cats, projs, dailyLog] = await Promise.all([
    getProximosEventos(7),
    getHoy(),
    getBrands(),
    getSuggestedActions(),
    supabase.from("categories").select("nombre, tipo, es_personal").eq("tipo", "gasto"),
    supabase.from("projects").select("id, nombre").order("created_at", { ascending: false }).limit(100),
    supabase.from("daily_expense_log").select("fecha").eq("fecha", rdToday()).maybeSingle(),
  ]);

  // Resolver el slug del selector a un brand_id real (por nombre de la marca).
  const key = marca && MARCA_KEY[marca];
  const brand = key ? brands.find((b) => b.nombre.toLowerCase().replace(/\s/g, "").includes(key)) : null;
  const brandId = brand?.id ?? null;
  const marcaLabel = personal ? "Personal" : (brand?.nombre ?? null);

  const kpis = await getDashboardKpis(brandId, personal);

  // Filtrar la agenda por marca (los eventos llevan brand_id). Personal no aplica a eventos.
  const filtEv = (arr: AgendaEvent[]) => (brandId ? arr.filter((e) => e.brand_id === brandId) : arr);
  const hoyFilt = brandId ? {
    ...hoy,
    vencidos: filtEv(hoy.vencidos), cobrosHoy: filtEv(hoy.cobrosHoy), entregasHoy: filtEv(hoy.entregasHoy),
    entregasManana: filtEv(hoy.entregasManana), iniciosHoy: filtEv(hoy.iniciosHoy), avisosHoy: filtEv(hoy.avisosHoy),
  } : hoy;
  const proximosFilt = personal ? proximos : filtEv(proximos);

  const catRows = (cats.data ?? []) as { nombre: string; es_personal: boolean }[];
  const categoriasGasto = catRows.filter((c) => !c.es_personal).map((c) => c.nombre);
  const categoriasGastoPersonal = catRows.filter((c) => c.es_personal).map((c) => c.nombre);
  const projects = ((projs.data ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Proyecto" }));

  const KPIS = [
    { label: "Por cobrar (DOP)", value: kpis.porCobrar, icon: Wallet, hint: "Saldo pendiente", prefix: "RD$ ", href: "/cobros" },
    { label: "Ingresado (DOP)", value: kpis.ingresado.DOP, icon: TrendingUp, hint: "Total histórico", prefix: "RD$ ", href: "/finanzas" },
    { label: "Gastado (DOP)", value: kpis.gastado.DOP, icon: TrendingDown, hint: "Total histórico", prefix: "RD$ ", href: "/finanzas" },
    { label: "MRR (DOP)", value: kpis.mrr, icon: Repeat, hint: "Recurrente mensual", prefix: "RD$ ", href: "/finanzas" },
  ];

  return (
    <>
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
          <Sparkles className="size-3 text-electric" /> {fechaCorta(rdToday())}
          {marcaLabel && <span className="ml-1 text-electric">· {marcaLabel}</span>}
        </span>
        <BlurInText as="h1" text="Bienvenida, Marien 👋" className="mt-2 block text-2xl font-semibold tracking-tight sm:text-3xl" />
        <p className="mt-1 text-sm text-muted-foreground">Tu centro de mando inteligente. El sistema corre adelante de ti.</p>
      </div>

      <div className="mb-6">
        <DailyExpensePrompt registradoHoy={!!dailyLog.data} categorias={categoriasGasto} categoriasPersonal={categoriasGastoPersonal} projects={projects} brands={brands} />
      </div>

      {/* Resumen del día (IA) */}
      <div className="mb-6"><ExecSummary /></div>

      {/* KPIs de dinero (se filtran por la marca de arriba) */}
      <StaggerContainer className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <StaggerItem key={kpi.label}>
              <Link href={kpi.href} className="block h-full">
                <MagneticCard className="group relative h-full overflow-hidden p-4 transition-colors hover:border-electric/40">
                  <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-20 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--electric)_18%,transparent),transparent_70%)] opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-white shadow-sm"><Icon className="size-5" /></div>
                    <ArrowUpRight className="size-4 text-muted-foreground/50 transition-colors group-hover:text-electric" />
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight">
                    <CountUp value={kpi.value} prefix={kpi.prefix} />
                  </p>
                  <p className="mt-1 text-xs font-medium">{kpi.label}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.hint}</p>
                </MagneticCard>
              </Link>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Próximos eventos + HOY */}
      <StaggerContainer className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StaggerItem><AgendaProximos eventos={proximosFilt} /></StaggerItem>
        <StaggerItem><HoyPanel data={hoyFilt} compact /></StaggerItem>
      </StaggerContainer>

      {/* Acciones sugeridas */}
      <div className="mt-4"><AccionesPanel acciones={acciones} /></div>
    </>
  );
}
