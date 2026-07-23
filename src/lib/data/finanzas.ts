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

/**
 * Trae TODOS los movimientos (ingresos + gastos) con sus campos completos
 * para la vista interactiva de Finanzas. La agregación (balance, mensual,
 * categorías) se hace en el cliente para que los filtros — Negocio/Personal,
 * rango de fechas y marca — recalculen todo al instante.
 */
export async function getMovimientos(limit = 2000): Promise<{ incomes: Income[]; expenses: Expense[] }> {
  const supabase = await createClient();
  const [inc, exp] = await Promise.all([
    supabase.from("incomes").select("*").order("fecha", { ascending: false }).limit(limit),
    supabase.from("expenses").select("*").order("fecha", { ascending: false }).limit(limit),
  ]);
  return {
    incomes: (inc.data ?? []) as Income[],
    expenses: (exp.data ?? []) as Expense[],
  };
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

export type ProjectAbono = { id: string; monto: number; moneda: string; fecha: string; tipo: string; metodo: string | null; nota: string | null; comprobante_url: string | null };
export type ProjectGasto = { id: string; monto: number; moneda: string; fecha: string; categoria: string | null; descripcion: string | null; comercio: string | null; factura_url: string | null };
export type ProjectMargin = {
  id: string; nombre: string | null; precio_total: number; moneda: string;
  tipo: string | null; client_id: string; brand_id: string | null;
  clienteNombre: string | null; brandNombre: string | null;
  gastos: number; cobrado: number; ganancia: number; margen: number;
  abonos: ProjectAbono[]; gastosList: ProjectGasto[];
};

/**
 * Margen real por proyecto, con el historial completo para el detalle:
 * precio contratado, lo realmente cobrado (abonos), los gastos asignados y
 * quién es el cliente / marca. Un proyecto sin cobro (RD$0) es válido: se
 * muestra tal cual con su gasto, sin marcarlo como error.
 */
export async function getProjectMargins(): Promise<ProjectMargin[]> {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, nombre, precio_total, moneda, tipo, client_id, order_id, brand_id")
    .order("created_at", { ascending: false })
    .limit(50);
  const projs = (projects ?? []) as { id: string; nombre: string | null; precio_total: number; moneda: string; tipo: string | null; client_id: string; order_id: string | null; brand_id: string | null }[];
  if (projs.length === 0) return [];

  const projIds = projs.map((p) => p.id);
  const orderIds = projs.map((p) => p.order_id).filter(Boolean) as string[];
  const clientIds = [...new Set(projs.map((p) => p.client_id))];
  const brandIds = [...new Set(projs.map((p) => p.brand_id).filter(Boolean))] as string[];

  const [expsRes, paysRes, clientsRes, brandsRes] = await Promise.all([
    supabase.from("expenses").select("id, project_id, monto, moneda, fecha, categoria, descripcion, comercio, factura_url").eq("es_personal", false).in("project_id", projIds),
    orderIds.length
      ? supabase.from("order_payments").select("id, order_id, monto, moneda, fecha, tipo, metodo, nota, comprobante_url").in("order_id", orderIds)
      : Promise.resolve({ data: [] as unknown[] }),
    clientIds.length
      ? supabase.from("clients").select("id, nombre, apellido").in("id", clientIds)
      : Promise.resolve({ data: [] as unknown[] }),
    brandIds.length
      ? supabase.from("brands").select("id, nombre").in("id", brandIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const gastosByProj: Record<string, ProjectGasto[]> = {};
  for (const e of (expsRes.data ?? []) as (ProjectGasto & { project_id: string | null })[]) {
    if (!e.project_id) continue;
    (gastosByProj[e.project_id] ??= []).push({ id: e.id, monto: Number(e.monto), moneda: e.moneda, fecha: e.fecha, categoria: e.categoria, descripcion: e.descripcion, comercio: e.comercio, factura_url: e.factura_url });
  }

  const orderToProj = new Map(projs.filter((p) => p.order_id).map((p) => [p.order_id as string, p.id]));
  const abonosByProj: Record<string, ProjectAbono[]> = {};
  for (const a of (paysRes.data ?? []) as (ProjectAbono & { order_id: string })[]) {
    const pid = orderToProj.get(a.order_id);
    if (!pid) continue;
    (abonosByProj[pid] ??= []).push({ id: a.id, monto: Number(a.monto), moneda: a.moneda, fecha: a.fecha, tipo: a.tipo, metodo: a.metodo, nota: a.nota, comprobante_url: a.comprobante_url });
  }

  const clientRows = (clientsRes.data ?? []) as { id: string; nombre: string; apellido: string | null }[];
  const brandRows = (brandsRes.data ?? []) as { id: string; nombre: string }[];
  const clientMap = new Map(clientRows.map((c) => [c.id, `${c.nombre} ${c.apellido ?? ""}`.trim()]));
  const brandMap = new Map(brandRows.map((b) => [b.id, b.nombre]));

  return projs.map((p) => {
    const gastosList = (gastosByProj[p.id] ?? []).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const abonos = (abonosByProj[p.id] ?? []).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const gastos = gastosList.reduce((s, g) => s + g.monto, 0);
    const cobrado = abonos.reduce((s, a) => s + a.monto, 0);
    const ganancia = Number(p.precio_total) - gastos;
    const margen = p.precio_total > 0 ? (ganancia / Number(p.precio_total)) * 100 : 0;
    return {
      id: p.id, nombre: p.nombre, precio_total: Number(p.precio_total), moneda: p.moneda,
      tipo: p.tipo, client_id: p.client_id, brand_id: p.brand_id,
      clienteNombre: clientMap.get(p.client_id) ?? null,
      brandNombre: p.brand_id ? brandMap.get(p.brand_id) ?? null : null,
      gastos, cobrado, ganancia, margen, abonos, gastosList,
    };
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
