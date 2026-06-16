import { createClient } from "@/lib/supabase/server";
import { rdToday, addDays, endOfWeek, endOfMonth } from "@/lib/fecha";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EventTipo = "inicio" | "entrega" | "cobro" | "acuerdo" | "personal";

export type AgendaEvent = {
  id: string;
  titulo: string | null;
  tipo: EventTipo | null;
  fecha: string;
  client_id: string | null;
  project_id: string | null;
  monto: number | null;
  moneda: string | null;
  completado: boolean;
  brand_id: string | null;
  auto_generado: boolean;
  cliente?: { nombre: string; apellido: string | null; whatsapp: string | null; telefono: string | null } | null;
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
  return events.map((e) => ({
    ...e,
    cliente: e.client_id ? map.get(e.client_id) ?? null : null,
  }));
}

const COLS = "id, titulo, tipo, fecha, client_id, project_id, monto, moneda, completado, brand_id, auto_generado";

/** Eventos en un rango de fechas [from, to]. */
export async function getEventsRange(from: string, to: string): Promise<AgendaEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calendar_events")
    .select(COLS)
    .gte("fecha", from)
    .lte("fecha", to)
    .order("fecha", { ascending: true });
  return attachClients(supabase, (data ?? []) as AgendaEvent[]);
}

/** Briefing "HOY". */
export async function getHoy() {
  const supabase = await createClient();
  const hoy = rdToday();
  const manana = addDays(hoy, 1);

  const { data } = await supabase
    .from("calendar_events")
    .select(COLS)
    .eq("completado", false)
    .lte("fecha", manana)
    .order("fecha", { ascending: true });

  const ev = await attachClients(supabase, (data ?? []) as AgendaEvent[]);
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
  const { data } = await supabase
    .from("calendar_events")
    .select(COLS)
    .eq("completado", false)
    .in("tipo", ["cobro", "entrega"])
    .lte("fecha", addDays(hoy, 60))
    .order("fecha", { ascending: true });
  return attachClients(supabase, (data ?? []) as AgendaEvent[]);
}

/** Resumen para la campana. */
export async function getAlerts() {
  const { vencidos, cobrosHoy, entregasHoy, entregasManana, avisosHoy } = await getHoy();
  const items = [...avisosHoy, ...vencidos, ...cobrosHoy, ...entregasHoy, ...entregasManana];
  return { count: items.length, items: items.slice(0, 8) };
}
