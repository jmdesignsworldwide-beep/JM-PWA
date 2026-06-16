import { createClient } from "@/lib/supabase/server";
import { getBalance, getMRR, getProjectMargins } from "@/lib/data/finanzas";
import { rdToday, addDays } from "@/lib/fecha";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export type Kpis = {
  ingresado: { DOP: number; USD: number };
  gastado: { DOP: number; USD: number };
  porCobrar: number;
  leadsActivos: number;
  proyectosActivos: number;
  conversion: number;
  mrr: number;
};

export async function getKpis(): Promise<Kpis> {
  const supabase = await createClient();
  const [balance, mrr, clientsR, leadsR, ganadosR, projR, cobrosR] = await Promise.all([
    getBalance(),
    getMRR(),
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("es_lead", true),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("es_lead", false),
    supabase.from("projects").select("id", { count: "exact", head: true }).in("estado", ["pendiente", "en_progreso"]),
    supabase.from("calendar_events").select("monto").eq("tipo", "cobro").eq("completado", false),
  ]);

  const total = clientsR.count ?? 0;
  const ganados = ganadosR.count ?? 0;
  const porCobrar = ((cobrosR.data ?? []) as { monto: number | null }[]).reduce((s, r) => s + Number(r.monto ?? 0), 0);

  return {
    ingresado: balance.ingresos,
    gastado: balance.gastos,
    porCobrar,
    leadsActivos: leadsR.count ?? 0,
    proyectosActivos: projR.count ?? 0,
    conversion: total > 0 ? Math.round((ganados / total) * 100) : 0,
    mrr,
  };
}

export type Insight = { icon: "trend" | "warn" | "money" | "clock" | "star"; texto: string };

/** Insights REALES — solo se incluyen si los datos los respaldan. */
export async function getRuleInsights(): Promise<Insight[]> {
  const supabase = await createClient();
  const hoy = rdToday();
  const insights: Insight[] = [];

  // Proyectos en riesgo de entrega tardía
  const { data: riesgo } = await supabase
    .from("projects").select("id, fecha_entrega, estado")
    .eq("estado", "en_progreso").lte("fecha_entrega", addDays(hoy, 3));
  const nRiesgo = (riesgo ?? []).filter((p) => p.fecha_entrega).length;
  if (nRiesgo > 0) insights.push({ icon: "warn", texto: `Tienes ${nRiesgo} proyecto${nRiesgo > 1 ? "s" : ""} en riesgo de entrega tardía.` });

  // Leads estancados (+7 días sin avanzar)
  const { data: leads } = await supabase
    .from("clients").select("id, updated_at").eq("es_lead", true).lt("updated_at", `${addDays(hoy, -7)}T23:59:59`);
  const nLeads = (leads ?? []).length;
  if (nLeads > 0) insights.push({ icon: "clock", texto: `${nLeads} lead${nLeads > 1 ? "s llevan" : " lleva"} +7 días sin avanzar de etapa.` });

  // Industria más rentable (por margen promedio)
  const margins = await getProjectMargins();
  if (margins.length > 0) {
    const { data: clients } = await supabase.from("clients").select("id, industria");
    const indMap = new Map((clients ?? []).map((c) => [c.id, c.industria]));
    const byInd: Record<string, { sum: number; n: number }> = {};
    for (const m of margins) {
      const ind = indMap.get(m.client_id) ?? "General";
      if (!ind) continue;
      byInd[ind] ??= { sum: 0, n: 0 };
      byInd[ind].sum += m.margen; byInd[ind].n++;
    }
    const ranked = Object.entries(byInd).map(([ind, v]) => ({ ind, avg: v.sum / v.n })).sort((a, b) => b.avg - a.avg);
    if (ranked.length > 0 && ranked[0].avg > 0) {
      insights.push({ icon: "star", texto: `Tu industria más rentable es ${ranked[0].ind} (margen promedio ${ranked[0].avg.toFixed(0)}%).` });
    }
  }

  // Mes históricamente más lento (requiere >=3 meses con datos)
  const { data: inc } = await supabase.from("incomes").select("monto, fecha");
  const porMes: Record<number, number> = {};
  for (const r of (inc ?? []) as { monto: number; fecha: string }[]) {
    const mes = new Date(`${r.fecha}T12:00:00Z`).getUTCMonth();
    porMes[mes] = (porMes[mes] ?? 0) + Number(r.monto);
  }
  const mesesConDatos = Object.keys(porMes);
  if (mesesConDatos.length >= 3) {
    const minMes = mesesConDatos.map(Number).sort((a, b) => porMes[a] - porMes[b])[0];
    insights.push({ icon: "trend", texto: `${MESES[minMes][0].toUpperCase()}${MESES[minMes].slice(1)} es históricamente tu mes más lento.` });
  }

  // MRR
  const mrr = await getMRR();
  if (mrr > 0) insights.push({ icon: "money", texto: `Tu ingreso recurrente mensual (MRR) es de RD$ ${mrr.toLocaleString("es-DO")}.` });

  return insights;
}

/** Embudo de conversión de leads. */
export async function getFunnel() {
  const supabase = await createClient();
  const etapas = ["nuevo", "contactado", "cotizado", "contrato_enviado", "ganado", "perdido"];
  const { data } = await supabase.from("clients").select("etapa_venta");
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { etapa_venta: string }[]) counts[r.etapa_venta] = (counts[r.etapa_venta] ?? 0) + 1;
  return etapas.map((e) => ({ etapa: e, count: counts[e] ?? 0 }));
}

/** Proyectos por estado. */
export async function getProjectsByStatus() {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("estado");
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { estado: string }[]) counts[r.estado] = (counts[r.estado] ?? 0) + 1;
  return counts;
}
