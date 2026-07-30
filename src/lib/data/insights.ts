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

const curM = (m: string | null) => (m === "USD" ? "USD" : "DOP") as "DOP" | "USD";
const equivMensual = (monto: number, f: string | null) =>
  f === "anual" ? monto / 12 : f === "trimestral" ? monto / 3 : f === "quincenal" ? monto * 2 : monto;

export type DashboardKpis = {
  ingresado: { DOP: number; USD: number };
  gastado: { DOP: number; USD: number };
  porCobrar: number;
  mrr: number;
};

/**
 * KPIs de dinero del Dashboard, filtrables por marca (brand_id) o Personal.
 *   · marca vacía   → todo
 *   · brandId       → solo esa marca
 *   · "personal"    → solo movimientos personales (por cobrar/MRR son negocio → 0)
 */
export async function getDashboardKpis(brandId: string | null, personal: boolean): Promise<DashboardKpis> {
  const supabase = await createClient();
  const [inc, exp, cob, plans] = await Promise.all([
    supabase.from("incomes").select("monto, moneda, brand_id, es_personal"),
    supabase.from("expenses").select("monto, moneda, brand_id, es_personal"),
    supabase.from("calendar_events").select("monto, brand_id").eq("tipo", "cobro").eq("completado", false),
    supabase.from("recurring_plans").select("monto, moneda, brand_id, frecuencia, activo, clase, es_personal"),
  ]);
  const match = (b: string | null, esP: boolean) => personal ? esP : (brandId ? b === brandId : true);

  const ingresado = { DOP: 0, USD: 0 }, gastado = { DOP: 0, USD: 0 };
  for (const r of (inc.data ?? []) as { monto: number; moneda: string | null; brand_id: string | null; es_personal: boolean }[])
    if (match(r.brand_id, r.es_personal)) ingresado[curM(r.moneda)] += Number(r.monto);
  for (const r of (exp.data ?? []) as { monto: number; moneda: string | null; brand_id: string | null; es_personal: boolean }[])
    if (match(r.brand_id, r.es_personal)) gastado[curM(r.moneda)] += Number(r.monto);

  let porCobrar = 0;
  if (!personal) for (const r of (cob.data ?? []) as { monto: number | null; brand_id: string | null }[])
    if (brandId ? r.brand_id === brandId : true) porCobrar += Number(r.monto ?? 0);

  let mrr = 0;
  for (const p of (plans.data ?? []) as { monto: number; moneda: string | null; brand_id: string | null; frecuencia: string | null; activo: boolean; clase: string; es_personal: boolean }[])
    if (p.activo && p.clase !== "gasto" && curM(p.moneda) === "DOP" && match(p.brand_id, p.es_personal)) mrr += equivMensual(Number(p.monto), p.frecuencia);

  return { ingresado, gastado, porCobrar, mrr };
}

export async function getKpis(): Promise<Kpis> {
  const supabase = await createClient();
  const [balance, recur, clientsR, leadsR, ganadosR, projR, cobrosR] = await Promise.all([
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
    mrr: recur.mrr,
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
  if (nLeads > 0) insights.push({ icon: "clock", texto: `${nLeads} prospecto${nLeads > 1 ? "s llevan" : " lleva"} +7 días sin avanzar de etapa.` });

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
  const { mrr } = await getMRR();
  if (mrr > 0) insights.push({ icon: "money", texto: `Tu ingreso recurrente mensual (MRR) es de RD$ ${mrr.toLocaleString("es-DO")}.` });

  return insights;
}

/** Proyectos por estado. */
export async function getProjectsByStatus() {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("estado");
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { estado: string }[]) counts[r.estado] = (counts[r.estado] ?? 0) + 1;
  return counts;
}
