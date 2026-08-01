// ============================================================================
// ASISTENTE — Capa 2 (consulta de datos) + Capa 3 (respuesta)
// Server-only. Toma la intención detectada y responde con DATOS REALES de la
// base (nunca inventa). Reutiliza las funciones de datos que ya existen.
// ============================================================================
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { rdToday, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "@/lib/fecha";
import { detectarIntencion, normalizar, INTENT_LABEL, type IntentId, type PeriodoKey } from "./intents";
import { getManualDebts } from "@/lib/data/debts";
import { getSaldosClientes, getPendientes, getEventsRange } from "@/lib/data/agenda";
import { getMovimientos } from "@/lib/data/finanzas";
import { getContacts, getBrands } from "@/lib/data/clients";
import { getVentures } from "@/lib/data/ventures";

export type AnswerItem = { label: string; sub?: string; monto?: string; href?: string };
export type Answer = {
  intent: IntentId | "desconocido";
  titulo: string;
  texto?: string;       // línea principal (número grande cuando aplica)
  detalle?: string;
  items?: AnswerItem[];
  periodoLabel?: string;
  fallback?: boolean;   // muestra chips de categorías
};

const fechaLarga = (iso: string) => {
  try { return new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)); }
  catch { return iso; }
};

function rango(periodo: PeriodoKey | null, defMes = true): { from: string; to: string; label: string } {
  const hoy = rdToday();
  switch (periodo) {
    case "hoy": return { from: hoy, to: hoy, label: "hoy" };
    case "ayer": { const a = addDays(hoy, -1); return { from: a, to: a, label: "ayer" }; }
    case "semana": return { from: startOfWeek(hoy), to: endOfWeek(hoy), label: "esta semana" };
    case "mes_pasado": {
      const d = new Date(`${hoy}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1);
      const prev = d.toISOString().slice(0, 10);
      return { from: startOfMonth(prev), to: endOfMonth(prev), label: "el mes pasado" };
    }
    case "anio": return { from: `${hoy.slice(0, 4)}-01-01`, to: `${hoy.slice(0, 4)}-12-31`, label: "este año" };
    case "mes": return { from: startOfMonth(hoy), to: endOfMonth(hoy), label: "este mes" };
    default:
      return defMes
        ? { from: startOfMonth(hoy), to: endOfMonth(hoy), label: "este mes" }
        : { from: hoy, to: addDays(hoy, 7), label: "próximos 7 días" };
  }
}

/** Marca mencionada (por nombre) o "Personal". Devuelve null si no hay. */
async function detectarMarca(t: string): Promise<{ id: string | "personal"; nombre: string } | null> {
  if (/\bpersonal(es)?\b/.test(t)) return { id: "personal", nombre: "Personal" };
  const brands = await getBrands();
  for (const b of brands) {
    const key = normalizar(b.nombre).replace(/\s/g, "");
    // "kitjoy", "jmdistribution"… o una palabra distintiva del nombre.
    const palabra = normalizar(b.nombre).split(/\s+/).find((w) => w.length >= 4);
    if (t.replace(/\s/g, "").includes(key) || (palabra && t.includes(palabra))) return { id: b.id, nombre: b.nombre };
  }
  return null;
}

const sumar = (rows: { monto: number; moneda: string | null }[]) => {
  const b = { DOP: 0, USD: 0 };
  for (const r of rows) b[r.moneda === "USD" ? "USD" : "DOP"] += Number(r.monto) || 0;
  return b;
};
const money2 = (b: { DOP: number; USD: number }) => b.USD ? `${money(b.DOP, "DOP")} · ${money(b.USD, "USD")}` : money(b.DOP, "DOP");

/** Motor principal: texto libre → respuesta con datos reales. */
export async function responder(texto: string): Promise<Answer> {
  const t = normalizar(texto);
  const { intent, periodo } = detectarIntencion(texto);
  const marca = await detectarMarca(t);
  const filtraMarca = <T extends { brand_id: string | null; es_personal: boolean }>(rows: T[]) =>
    !marca ? rows.filter((r) => !r.es_personal)
      : marca.id === "personal" ? rows.filter((r) => r.es_personal)
        : rows.filter((r) => r.brand_id === marca.id);

  switch (intent) {
    case "deudas": {
      const debts = (await getManualDebts()).filter((d) => !d.saldado && d.saldo > 0);
      if (debts.length === 0) return { intent, titulo: "A quién le debes", texto: "No le debes a nadie ahora mismo 🎉" };
      const tot = sumar(debts.map((d) => ({ monto: d.saldo, moneda: d.moneda })));
      return {
        intent, titulo: "A quién le debes",
        texto: `Debes ${money2(tot)} en total`,
        detalle: `${debts.length} deuda${debts.length === 1 ? "" : "s"} pendiente${debts.length === 1 ? "" : "s"}`,
        items: debts.map((d) => ({ label: d.personaNombre, sub: d.concepto ?? undefined, monto: money(d.saldo, d.moneda), href: `/clientes/${d.client_id}` })),
      };
    }

    case "cobros": {
      const saldos = (await getSaldosClientes()).filter((s) => s.porMoneda.some((m) => m.saldo > 0));
      if (saldos.length === 0) return { intent, titulo: "Quién te debe", texto: "Nadie te debe ahora mismo 🎉" };
      saldos.sort((a, b) => b.saldoTotalDOP - a.saldoTotalDOP);
      const totDOP = saldos.reduce((s, c) => s + c.saldoTotalDOP, 0);
      return {
        intent, titulo: "Quién te debe",
        texto: `Te deben ${money(totDOP, "DOP")} en total`,
        detalle: `${saldos.length} cliente${saldos.length === 1 ? "" : "s"} con saldo pendiente`,
        items: saldos.map((s) => ({
          label: s.nombre,
          monto: s.porMoneda.filter((m) => m.saldo > 0).map((m) => money(m.saldo, m.moneda)).join(" · "),
          href: `/cobros?cliente=${s.id}`,
        })),
      };
    }

    case "vencimientos": {
      const cobros = (await getPendientes()).filter((e) => e.tipo === "cobro");
      const hoy = rdToday();
      if (cobros.length === 0) return { intent, titulo: "Próximos cobros", texto: "No tienes cobros programados 🎉" };
      return {
        intent, titulo: "Próximos cobros",
        detalle: `${cobros.length} cobro${cobros.length === 1 ? "" : "s"} en los próximos 60 días`,
        items: cobros.slice(0, 15).map((e) => ({
          label: e.cliente?.nombre ?? e.titulo ?? "Cobro",
          sub: `${e.fecha < hoy ? "⚠️ vencido · " : ""}${fechaLarga(e.fecha)}`,
          monto: e.monto ? money(e.monto, e.moneda ?? "DOP") : undefined,
          href: "/cobros",
        })),
      };
    }

    case "ingresos": case "gastos": case "neto": {
      const r = rango(periodo);
      const { incomes, expenses } = await getMovimientos();
      const inR = <T extends { fecha: string }>(rows: T[]) => rows.filter((x) => x.fecha >= r.from && x.fecha <= r.to);
      const ing = sumar(filtraMarca(inR(incomes)));
      const gas = sumar(filtraMarca(inR(expenses)));
      const suf = marca ? ` · ${marca.nombre}` : "";
      if (intent === "ingresos")
        return { intent, titulo: `Ingresos${suf}`, texto: money2(ing), periodoLabel: r.label };
      if (intent === "gastos")
        return { intent, titulo: `Gastos${suf}`, texto: money2(gas), periodoLabel: r.label };
      const neto = { DOP: ing.DOP - gas.DOP, USD: ing.USD - gas.USD };
      return {
        intent, titulo: `Balance neto${suf}`, texto: money2(neto),
        detalle: `Ingresos ${money2(ing)} − Gastos ${money2(gas)}`, periodoLabel: r.label,
      };
    }

    case "agenda": {
      const r = rango(periodo, false);
      const ev = (await getEventsRange(r.from, r.to)).filter((e) => !e.completado);
      if (ev.length === 0) return { intent, titulo: "Tu agenda", texto: `Nada agendado para ${r.label} 🎉`, periodoLabel: r.label };
      return {
        intent, titulo: "Tu agenda", periodoLabel: r.label,
        detalle: `${ev.length} evento${ev.length === 1 ? "" : "s"}`,
        items: ev.slice(0, 20).map((e) => ({
          label: e.titulo || e.cliente?.nombre || (e.tipo ?? "Evento"),
          sub: `${fechaLarga(e.fecha)}${e.hora ? ` · ${e.hora.slice(0, 5)}` : ""}${e.tipo ? ` · ${e.tipo}` : ""}`,
          href: "/cobros",
        })),
      };
    }

    case "pedidos": {
      const supabase = await createClient();
      const [{ data: ords }, contacts] = await Promise.all([
        supabase.from("orders").select("id, client_id, estado, total, moneda, fecha, brand_id"),
        getContacts(),
      ]);
      let lista = (ords ?? []) as { id: string; client_id: string; estado: string; total: number; moneda: string; fecha: string; brand_id: string | null }[];
      if (marca && marca.id !== "personal") lista = lista.filter((o) => o.brand_id === marca.id);
      const nombre = new Map(contacts.map((c) => [c.id, `${c.nombre} ${c.apellido ?? ""}`.trim()]));
      const activos = lista.filter((o) => o.estado === "activo");
      const completados = lista.filter((o) => o.estado === "completado");
      return {
        intent, titulo: "Tus pedidos",
        texto: `${activos.length} activo${activos.length === 1 ? "" : "s"} · ${completados.length} completado${completados.length === 1 ? "" : "s"}`,
        detalle: marca ? marca.nombre : undefined,
        items: activos.slice(0, 15).map((o) => ({
          label: nombre.get(o.client_id) ?? "Cliente",
          sub: fechaLarga(o.fecha),
          monto: money(o.total, o.moneda),
          href: `/pedidos/${o.id}`,
        })),
      };
    }

    case "clientes": {
      const [contacts, saldos] = await Promise.all([getContacts(), getSaldosClientes()]);
      const activos = contacts.filter((c) => !c.es_personal && !c.es_lead).length;
      const prospectos = contacts.filter((c) => !c.es_personal && c.es_lead).length;
      const ranking = [...saldos].map((s) => ({ nombre: s.nombre, id: s.id, total: s.porMoneda.reduce((a, m) => a + m.total, 0) }))
        .sort((a, b) => b.total - a.total).slice(0, 8);
      return {
        intent, titulo: "Tus clientes",
        texto: `${activos} cliente${activos === 1 ? "" : "s"} · ${prospectos} prospecto${prospectos === 1 ? "" : "s"}`,
        detalle: ranking.length ? "Los que más te han comprado:" : undefined,
        items: ranking.map((r) => ({ label: r.nombre, monto: money(r.total, "DOP"), href: `/clientes/${r.id}` })),
      };
    }

    case "proyectos": {
      const supabase = await createClient();
      const [ventures, { data: todos }] = await Promise.all([
        getVentures(),
        supabase.from("personal_todos").select("venture_id, hecho").not("venture_id", "is", null),
      ]);
      const pend = new Map<string, number>();
      for (const td of (todos ?? []) as { venture_id: string; hecho: boolean }[])
        if (!td.hecho) pend.set(td.venture_id, (pend.get(td.venture_id) ?? 0) + 1);
      if (ventures.length === 0) return { intent, titulo: "Tus proyectos", texto: "Aún no tienes proyectos en la incubadora." };
      return {
        intent, titulo: "Tus proyectos",
        detalle: `${ventures.length} proyecto${ventures.length === 1 ? "" : "s"}`,
        items: ventures.map((v) => {
          const n = pend.get(v.id) ?? 0;
          return { label: v.nombre, sub: n ? `${n} pendiente${n === 1 ? "" : "s"}` : "Al día ✓", href: "/pendientes" };
        }),
      };
    }

    case "resumen": {
      const r = rango(periodo);
      const [{ incomes, expenses }, saldos, prox] = await Promise.all([getMovimientos(), getSaldosClientes(), getPendientes()]);
      const inR = <T extends { fecha: string }>(rows: T[]) => rows.filter((x) => x.fecha >= r.from && x.fecha <= r.to);
      const ing = sumar(inR(incomes).filter((x) => !x.es_personal));
      const gas = sumar(inR(expenses).filter((x) => !x.es_personal));
      const porCobrar = saldos.reduce((s, c) => s + c.saldoTotalDOP, 0);
      const cobrosProx = prox.filter((e) => e.tipo === "cobro").length;
      return {
        intent, titulo: "Resumen del negocio", periodoLabel: r.label,
        texto: `Neto ${money2({ DOP: ing.DOP - gas.DOP, USD: ing.USD - gas.USD })}`,
        items: [
          { label: "Ingresos", monto: money2(ing) },
          { label: "Gastos", monto: money2(gas) },
          { label: "Por cobrar", monto: money(porCobrar, "DOP"), href: "/cobros" },
          { label: "Cobros próximos (60 días)", sub: `${cobrosProx}`, href: "/cobros" },
        ],
      };
    }

    default:
      return {
        intent: "desconocido",
        titulo: "No entendí bien 🤔",
        texto: "¿Quieres saber sobre cobros, deudas, finanzas, agenda, pedidos o clientes?",
        fallback: true,
      };
  }
}

/** Etiqueta legible de una intención (para las preguntas frecuentes). */
export function labelIntent(id: IntentId) { return INTENT_LABEL[id]; }
