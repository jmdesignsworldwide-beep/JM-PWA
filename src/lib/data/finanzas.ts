import { createClient } from "@/lib/supabase/server";
import { rdToday, startOfMonth, addDays } from "@/lib/fecha";
import type { Row } from "@/lib/database.types";

export type Income = Row<"incomes">;
export type Expense = Row<"expenses">;
export type RecurringPlan = Row<"recurring_plans">;

type Bucket = { DOP: number; USD: number };
const cur = (m: string | null) => (m === "USD" ? "USD" : "DOP") as "DOP" | "USD";

export async function getIncomes(limit = 100): Promise<Income[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("incomes").select("*").order("fecha", { ascending: false }).limit(limit);
  return (data ?? []) as Income[];
}

export async function getExpenses(limit = 100): Promise<Expense[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("*").order("fecha", { ascending: false }).limit(limit);
  return (data ?? []) as Expense[];
}

/** Balance global por moneda + neto. */
export async function getBalance() {
  const supabase = await createClient();
  const [inc, exp] = await Promise.all([
    supabase.from("incomes").select("monto, moneda"),
    supabase.from("expenses").select("monto, moneda").eq("es_personal", false),
  ]);
  const ingresos: Bucket = { DOP: 0, USD: 0 };
  const gastos: Bucket = { DOP: 0, USD: 0 };
  for (const r of (inc.data ?? []) as { monto: number; moneda: string | null }[]) ingresos[cur(r.moneda)] += Number(r.monto);
  for (const r of (exp.data ?? []) as { monto: number; moneda: string | null }[]) gastos[cur(r.moneda)] += Number(r.monto);
  return {
    ingresos,
    gastos,
    neto: { DOP: ingresos.DOP - gastos.DOP, USD: ingresos.USD - gastos.USD },
  };
}

/** Ingresos vs gastos por mes (últimos 6 meses, en DOP). */
export async function getMonthlyFlow() {
  const supabase = await createClient();
  const today = rdToday();
  const from = addDays(startOfMonth(today), -160);
  const [inc, exp] = await Promise.all([
    supabase.from("incomes").select("monto, moneda, fecha").gte("fecha", from),
    supabase.from("expenses").select("monto, moneda, fecha").gte("fecha", from).eq("es_personal", false),
  ]);
  const meses: Record<string, { ingresos: number; gastos: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(`${today}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - i);
    meses[d.toISOString().slice(0, 7)] = { ingresos: 0, gastos: 0 };
  }
  for (const r of (inc.data ?? []) as { monto: number; moneda: string | null; fecha: string }[]) {
    const k = r.fecha.slice(0, 7); if (meses[k]) meses[k].ingresos += Number(r.monto);
  }
  for (const r of (exp.data ?? []) as { monto: number; moneda: string | null; fecha: string }[]) {
    const k = r.fecha.slice(0, 7); if (meses[k]) meses[k].gastos += Number(r.monto);
  }
  return Object.entries(meses).map(([mes, v]) => ({ mes, ...v }));
}

/** Gastos por categoría (DOP). */
export async function getExpensesByCategory() {
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("categoria, monto").eq("es_personal", false);
  const map: Record<string, number> = {};
  for (const r of (data ?? []) as { categoria: string | null; monto: number }[]) {
    const k = r.categoria ?? "Sin categoría";
    map[k] = (map[k] ?? 0) + Number(r.monto);
  }
  return Object.entries(map).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
}

/** Margen real por proyecto: precio − gastos asignados. */
export async function getProjectMargins() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, nombre, precio_total, moneda, tipo, client_id")
    .order("created_at", { ascending: false })
    .limit(50);
  const projs = (projects ?? []) as { id: string; nombre: string | null; precio_total: number; moneda: string; tipo: string | null; client_id: string }[];
  if (projs.length === 0) return [];

  const { data: exps } = await supabase
    .from("expenses")
    .select("project_id, monto")
    .eq("es_personal", false)
    .in("project_id", projs.map((p) => p.id));
  const gastosByProj: Record<string, number> = {};
  for (const e of (exps ?? []) as { project_id: string | null; monto: number }[]) {
    if (e.project_id) gastosByProj[e.project_id] = (gastosByProj[e.project_id] ?? 0) + Number(e.monto);
  }
  return projs.map((p) => {
    const gastos = gastosByProj[p.id] ?? 0;
    const ganancia = Number(p.precio_total) - gastos;
    const margen = p.precio_total > 0 ? (ganancia / Number(p.precio_total)) * 100 : 0;
    return { ...p, gastos, ganancia, margen };
  });
}

export async function getRecurringPlans(): Promise<RecurringPlan[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("recurring_plans").select("*").order("proxima_factura", { ascending: true });
  return (data ?? []) as RecurringPlan[];
}

/** MRR: ingreso recurrente mensual equivalente (DOP), planes activos. */
export async function getMRR() {
  const plans = await getRecurringPlans();
  let mrr = 0;
  for (const p of plans.filter((x) => x.activo && cur(x.moneda) === "DOP")) {
    const f = p.frecuencia;
    const m = Number(p.monto);
    mrr += f === "anual" ? m / 12 : f === "trimestral" ? m / 3 : m;
  }
  return mrr;
}
