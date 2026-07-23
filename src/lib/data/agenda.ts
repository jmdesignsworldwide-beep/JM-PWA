import { createClient } from "@/lib/supabase/server";
import { rdToday, addDays, endOfWeek, endOfMonth } from "@/lib/fecha";
import { datesInRange, occurrenceId, type Freq } from "@/lib/recurrence";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EventTipo = "inicio" | "entrega" | "cobro" | "acuerdo" | "personal";

export type AgendaEvent = {
  id: string;
  titulo: string | null;
  tipo: EventTipo | null;
  fecha: string;
  client_id: string | null;
  project_id: string | null;
  influencer_id: string | null;
  monto: number | null;
  moneda: string | null;
  completado: boolean;
  brand_id: string | null;
  auto_generado: boolean;
  hora: string | null;
  meeting_url: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  recurrence: Freq | null;
  recurrence_until: string | null;
  recurrence_parent_id: string | null;
  recurrence_skip: boolean;
  /** true si es una ocurrencia GENERADA de una serie (no una fila propia). */
  esOcurrencia?: boolean;
  cliente?: { nombre: string; apellido: string | null; whatsapp: string | null; telefono: string | null } | null;
  influencer?: { nombre: string } | null;
};

/** Adjunta los datos de cliente (nombre/teléfono) a una lista de eventos. */
async function attachClients(
  supabase: SupabaseClient,
  events: AgendaEvent[],
): Promise<AgendaEvent[]> {
  const ids = [...new Set(events.map((e) => e.client_id).filter(Boolean))] as string[];
  if (ids.length === 0) return events;
  const { data } = await supabase
    .from("clients")
    .select("id, nombre, apellido, whatsapp, telefono")
    .in("id", ids);
  const map = new Map((data ?? []).map((c) => [c.id, c]));
  const infIds = [...new Set(events.map((e) => e.influencer_id).filter(Boolean))] as string[];
  let infMap = new Map<string, { nombre: string }>();
  if (infIds.length) {
    const { data: infs } = await supabase.from("influencers").select("id, nombre").in("id", infIds);
    infMap = new Map((infs ?? []).map((i) => [i.id, { nombre: i.nombre }]));
  }
  return events.map((e) => ({
    ...e,
    cliente: e.client_id ? map.get(e.client_id) ?? null : null,
    influencer: e.influencer_id ? infMap.get(e.influencer_id) ?? null : null,
  }));
}

const COLS = "id, titulo, tipo, fecha, client_id, project_id, influencer_id, monto, moneda, completado, brand_id, auto_generado, hora, meeting_url, ubicacion, descripcion, recurrence, recurrence_until, recurrence_parent_id, recurrence_skip";

const childKey = (parent: string, fecha: string) => `${parent}|${fecha}`;

/**
 * Filas CONCRETAS en [from, to]: eventos únicos + excepciones "override" de una
 * serie (una ocurrencia editada). NO incluye maestras ni excepciones "skip".
 */
async function concreteRows(supabase: SupabaseClient, from: string, to: string): Promise<AgendaEvent[]> {
  const { data } = await supabase
    .from("calendar_events").select(COLS)
    .is("recurrence", null)
    .eq("recurrence_skip", false)
    .gte("fecha", from).lte("fecha", to);
  return (data ?? []) as AgendaEvent[];
}

/**
 * Ocurrencias GENERADAS (virtuales) de las series en [from, to], saltando las
 * fechas que ya tienen una excepción (override o skip). Sin materializar filas.
 */
async function generatedOccurrences(supabase: SupabaseClient, from: string, to: string): Promise<AgendaEvent[]> {
  const { data: mastersRaw } = await supabase
    .from("calendar_events").select(COLS)
    .not("recurrence", "is", null)
    .lte("fecha", to);
  const masters = ((mastersRaw ?? []) as AgendaEvent[]).filter((m) => !m.recurrence_until || m.recurrence_until >= from);
  if (masters.length === 0) return [];

  // Excepciones (cualquier hija) de esas series dentro del rango: bloquean generación.
  const { data: exRaw } = await supabase
    .from("calendar_events").select("recurrence_parent_id, fecha")
    .in("recurrence_parent_id", masters.map((m) => m.id))
    .gte("fecha", from).lte("fecha", to);
  const blocked = new Set(((exRaw ?? []) as { recurrence_parent_id: string; fecha: string }[]).map((c) => childKey(c.recurrence_parent_id, c.fecha)));

  const out: AgendaEvent[] = [];
  for (const m of masters) {
    for (const fecha of datesInRange(m.fecha, m.recurrence as Freq, m.recurrence_until, from, to)) {
      if (blocked.has(childKey(m.id, fecha))) continue;
      out.push({ ...m, id: occurrenceId(m.id, fecha), fecha, completado: false, recurrence_parent_id: m.id, esOcurrencia: true });
    }
  }
  return out;
}

/**
 * Todo lo que ocurre en [from, to]: concretas + ocurrencias generadas.
 * Exportada para que el digest (cron, admin client) reutilice la MISMA
 * expansión y las ocurrencias entren en el resumen diario igual que un evento.
 */
export async function expandEvents(supabase: SupabaseClient, from: string, to: string): Promise<AgendaEvent[]> {
  return expandRange(supabase, from, to);
}
async function expandRange(supabase: SupabaseClient, from: string, to: string): Promise<AgendaEvent[]> {
  const [concrete, generated] = await Promise.all([
    concreteRows(supabase, from, to),
    generatedOccurrences(supabase, from, to),
  ]);
  return [...concrete, ...generated].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Eventos en un rango de fechas [from, to] (incluye ocurrencias recurrentes). */
export async function getEventsRange(from: string, to: string): Promise<AgendaEvent[]> {
  const supabase = await createClient();
  return attachClients(supabase, await expandRange(supabase, from, to));
}

/** Próximos eventos (de hoy en adelante, no completados) ordenados por fecha. */
export async function getProximosEventos(limit = 7): Promise<AgendaEvent[]> {
  const supabase = await createClient();
  const hoy = rdToday();
  const ev = (await expandRange(supabase, hoy, addDays(hoy, 120)))
    .filter((e) => !e.completado)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? "").localeCompare(b.hora ?? ""))
    .slice(0, limit);
  return attachClients(supabase, ev);
}

/** Briefing "HOY" — incluye las ocurrencias recurrentes de hoy/mañana. */
export async function getHoy() {
  const supabase = await createClient();
  const hoy = rdToday();
  const manana = addDays(hoy, 1);

  const [vencRaw, hoyMan] = await Promise.all([
    concreteRows(supabase, "2000-01-01", addDays(hoy, -1)),
    expandRange(supabase, hoy, manana),
  ]);
  const relevantes = [
    ...vencRaw.filter((e) => e.tipo === "cobro" || e.tipo === "entrega"),
    ...hoyMan,
  ].filter((e) => !e.completado);
  const ev = await attachClients(supabase, relevantes);
  return {
    hoy,
    vencidos: ev.filter((e) => e.fecha < hoy && (e.tipo === "cobro" || e.tipo === "entrega")),
    cobrosHoy: ev.filter((e) => e.fecha === hoy && e.tipo === "cobro"),
    entregasHoy: ev.filter((e) => e.fecha === hoy && e.tipo === "entrega"),
    entregasManana: ev.filter((e) => e.fecha === manana && e.tipo === "entrega"),
    iniciosHoy: ev.filter((e) => e.fecha === hoy && e.tipo === "inicio"),
    // Avisos (ej. firmas de contrato desde el portal)
    avisosHoy: ev.filter((e) => e.fecha === hoy && e.tipo === "acuerdo"),
  };
}

/** Flujo de caja: cobros futuros no completados por ventana y moneda + vencido. */
export async function getCashflow() {
  const supabase = await createClient();
  const hoy = rdToday();
  const finSemana = endOfWeek(hoy);
  const finProx = addDays(finSemana, 7);
  const finMes = endOfMonth(hoy);

  const { data } = await supabase
    .from("calendar_events")
    .select("fecha, monto, moneda")
    .eq("tipo", "cobro")
    .eq("completado", false);

  const rows = (data ?? []) as { fecha: string; monto: number | null; moneda: string | null }[];
  const acc = {
    vencido: { DOP: 0, USD: 0 },
    estaSemana: { DOP: 0, USD: 0 },
    proxSemana: { DOP: 0, USD: 0 },
    esteMes: { DOP: 0, USD: 0 },
  };
  for (const r of rows) {
    const m = r.monto ?? 0;
    const cur = (r.moneda === "USD" ? "USD" : "DOP") as "DOP" | "USD";
    if (r.fecha < hoy) acc.vencido[cur] += m;
    else {
      if (r.fecha <= finSemana) acc.estaSemana[cur] += m;
      else if (r.fecha <= finProx) acc.proxSemana[cur] += m;
      if (r.fecha <= finMes) acc.esteMes[cur] += m;
    }
  }
  return acc;
}

/** Pendientes próximos (cobros/entregas no completados, hasta 60 días). */
export async function getPendientes(): Promise<AgendaEvent[]> {
  const supabase = await createClient();
  const hoy = rdToday();
  const [concrete, generated] = await Promise.all([
    concreteRows(supabase, "2000-01-01", addDays(hoy, 60)),   // incluye vencidos concretos
    generatedOccurrences(supabase, hoy, addDays(hoy, 60)),     // recurrentes futuras (sin inundar el pasado)
  ]);
  const ev = [...concrete, ...generated]
    .filter((e) => !e.completado && (e.tipo === "cobro" || e.tipo === "entrega"))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return attachClients(supabase, ev);
}

export type PagoOrderLite = { id: string; total: number; moneda: string; fecha: string; estado: string };
export type PagoLite = { id: string; order_id: string; monto: number; moneda: string; fecha: string; tipo: string; metodo: string | null; nota: string | null; comprobante_url: string | null };
export type SaldoCliente = {
  id: string;
  nombre: string;
  orders: PagoOrderLite[];
  payments: PagoLite[];
  /** Por moneda: total contratado, pagado y saldo pendiente. */
  porMoneda: { moneda: string; total: number; pagado: number; saldo: number }[];
  saldoTotalDOP: number;
};

/**
 * Saldos por cliente: lo que cada uno debe (pendiente), lo que ya pagó y el
 * total contratado — todo desde los PEDIDOS y los PAGOS (fuente única). Se usa
 * para que "Cobros y Entregas" muestre la deuda real, no solo el pronóstico.
 */
export async function getSaldosClientes(): Promise<SaldoCliente[]> {
  const supabase = await createClient();
  const [ordersRes, paymentsRes] = await Promise.all([
    supabase.from("orders").select("id, client_id, total, moneda, fecha, estado"),
    supabase.from("order_payments").select("id, order_id, client_id, monto, moneda, fecha, tipo, metodo, nota, comprobante_url"),
  ]);
  const orders = (ordersRes.data ?? []) as (PagoOrderLite & { client_id: string })[];
  const payments = (paymentsRes.data ?? []) as (PagoLite & { client_id: string })[];
  if (orders.length === 0) return [];

  const clientIds = [...new Set(orders.map((o) => o.client_id))];
  const { data: cls } = await supabase.from("clients").select("id, nombre, apellido").in("id", clientIds);
  const nameMap = new Map((cls ?? []).map((c) => [c.id, `${c.nombre} ${c.apellido ?? ""}`.trim()]));

  const cur = (m: string | null) => (m === "USD" ? "USD" : "DOP");
  const byClient = new Map<string, SaldoCliente>();
  for (const o of orders) {
    const c = byClient.get(o.client_id) ?? {
      id: o.client_id, nombre: nameMap.get(o.client_id) ?? "Cliente",
      orders: [], payments: [], porMoneda: [], saldoTotalDOP: 0,
    };
    c.orders.push({ id: o.id, total: Number(o.total) || 0, moneda: o.moneda, fecha: o.fecha, estado: o.estado });
    byClient.set(o.client_id, c);
  }
  for (const p of payments) {
    const c = byClient.get(p.client_id);
    if (c) c.payments.push({ id: p.id, order_id: p.order_id, monto: Number(p.monto) || 0, moneda: p.moneda, fecha: p.fecha, tipo: p.tipo, metodo: p.metodo, nota: p.nota, comprobante_url: p.comprobante_url });
  }

  const result: SaldoCliente[] = [];
  for (const c of byClient.values()) {
    const map = new Map<string, { total: number; pagado: number }>();
    for (const o of c.orders) {
      const e = map.get(cur(o.moneda)) ?? { total: 0, pagado: 0 };
      e.total += o.total; map.set(cur(o.moneda), e);
    }
    for (const p of c.payments) {
      const e = map.get(cur(p.moneda)) ?? { total: 0, pagado: 0 };
      e.pagado += p.monto; map.set(cur(p.moneda), e);
    }
    c.porMoneda = [...map.entries()].map(([moneda, v]) => ({ moneda, total: v.total, pagado: v.pagado, saldo: Math.max(0, v.total - v.pagado) }));
    c.saldoTotalDOP = c.porMoneda.find((m) => m.moneda === "DOP")?.saldo ?? 0;
    result.push(c);
  }
  // Quien más debe (en DOP) primero; luego por saldo USD.
  return result.sort((a, b) => {
    const sa = a.porMoneda.reduce((s, m) => s + m.saldo, 0);
    const sb = b.porMoneda.reduce((s, m) => s + m.saldo, 0);
    return sb - sa;
  });
}

/** Resumen para la campana. */
export async function getAlerts() {
  const { vencidos, cobrosHoy, entregasHoy, entregasManana, avisosHoy } = await getHoy();
  const items = [...avisosHoy, ...vencidos, ...cobrosHoy, ...entregasHoy, ...entregasManana];
  return { count: items.length, items: items.slice(0, 8) };
}
