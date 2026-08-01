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
import { detectarAccion, extraerMoneda, type AccionConfirm, type Moneda } from "./acciones";
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
  accion?: AccionConfirm; // propuesta de acción pendiente de confirmar (Sí/No)
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

/** Cliente/persona mencionada por nombre (coincidencia tolerante, palabra ≥4). */
function detectarNombre(t: string, contacts: { id: string; nombre: string; apellido: string | null }[]): { id: string; nombre: string } | null {
  let best: { id: string; nombre: string; len: number } | null = null;
  for (const c of contacts) {
    const full = normalizar(`${c.nombre} ${c.apellido ?? ""}`);
    for (const w of full.split(/\s+/)) {
      if (w.length >= 4 && t.includes(w) && (!best || w.length > best.len))
        best = { id: c.id, nombre: `${c.nombre} ${c.apellido ?? ""}`.trim(), len: w.length };
    }
  }
  return best ? { id: best.id, nombre: best.nombre } : null;
}

const sumar = (rows: { monto: number; moneda: string | null }[]) => {
  const b = { DOP: 0, USD: 0 };
  for (const r of rows) b[r.moneda === "USD" ? "USD" : "DOP"] += Number(r.monto) || 0;
  return b;
};
const money2 = (b: { DOP: number; USD: number }) => b.USD ? `${money(b.DOP, "DOP")} · ${money(b.USD, "USD")}` : money(b.DOP, "DOP");

// ── Acciones (crear/registrar/agendar) ─────────────────────────────────────
const titleCase = (s: string) => s.replace(/\b[a-záéíóúñ]/g, (c) => c.toUpperCase());
const sentence = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Quita la cola de fecha/hora de un título ("reunión con Edwin el viernes a las 3" → "reunión con Edwin"). */
function limpiarTitulo(s?: string): string | undefined {
  if (!s) return undefined;
  const out = s
    .replace(/\b(el |este |proximo )?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b.*$/, "")
    .replace(/\ba las?\s+\d.*$/, "")
    .replace(/\b\d{1,2}\s*(am|pm)\b.*$/, "")
    .replace(/\b(hoy|manana|pasado manana)\b.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return out || undefined;
}

/**
 * ¿El texto es una ACCIÓN? Detecta el verbo, resuelve nombres contra la base y
 * devuelve una propuesta para CONFIRMAR (nunca ejecuta aquí). null si no es una
 * acción → el caller cae a la consulta normal. Regla de oro: toda acción con
 * dinero muestra el monto antes de guardar.
 */
export async function proponerAccion(texto: string): Promise<Answer | null> {
  const hoy = rdToday();
  const det = detectarAccion(texto, hoy);
  if (!det) return null;
  const t = normalizar(texto);
  const moneda: Moneda = extraerMoneda(t);
  const { tipo, slots } = det;

  // Resolución de nombre perezosa (solo cuando hace falta), sobre el texto completo.
  let cache: { id: string; nombre: string; apellido: string | null }[] | null = null;
  const resolver = async (raw?: string) => {
    if (!cache) cache = (await getContacts()).map((c) => ({ id: c.id, nombre: c.nombre, apellido: c.apellido }));
    return detectarNombre(normalizar(raw ?? texto), cache);
  };

  switch (tipo) {
    case "pendiente": {
      const concepto = sentence((slots.concepto ?? "").trim());
      if (!concepto) return { intent: "desconocido", titulo: "¿Qué anoto?", texto: "Dime qué apunto. Ej.: “recuérdame llamar a Franklin”." };
      return {
        intent: "desconocido", titulo: "¿Lo anoto?", texto: `Pendiente: “${concepto}”`,
        accion: { tipo, resumen: `Anotar pendiente: “${concepto}”`, data: { tipo, concepto, esPersonal: slots.esPersonal } },
      };
    }

    case "gasto": case "ingreso": {
      const monto = slots.monto;
      if (!monto) return { intent: "desconocido", titulo: "¿Cuánto?", texto: `Dime el monto. Ej.: “${tipo === "gasto" ? "gasté 500 en comida" : "entró 500 por un diseño"}”.` };
      const concepto = sentence((slots.concepto ?? "").trim());
      const fecha = slots.fecha ?? hoy;
      const cuando = fecha === hoy ? "hoy" : fechaLarga(fecha);
      const donde = concepto ? ` · ${concepto}` : "";
      const verbo = tipo === "gasto" ? "gasto" : "ingreso";
      return {
        intent: "desconocido", titulo: tipo === "gasto" ? "¿Registro el gasto?" : "¿Registro el ingreso?",
        texto: money(monto, moneda),
        detalle: `${sentence(verbo)} · ${cuando}${slots.esPersonal ? " · Personal" : ""}${donde}`,
        accion: { tipo, resumen: `Registrar ${verbo} de ${money(monto, moneda)}${donde}`, data: { tipo, monto, moneda, concepto: concepto || undefined, fecha, esPersonal: slots.esPersonal } },
      };
    }

    case "evento": {
      if (!slots.fecha) return { intent: "desconocido", titulo: "¿Para qué día?", texto: "Dime la fecha. Ej.: “agéndame reunión con Edwin el viernes a las 3”." };
      const nom = await resolver();
      const titulo = sentence(limpiarTitulo(slots.concepto) ?? (nom ? `Reunión con ${nom.nombre}` : "Evento"));
      const cuando = `${fechaLarga(slots.fecha)}${slots.hora ? ` · ${slots.hora}` : ""}`;
      return {
        intent: "desconocido", titulo: "¿Lo agendo?", texto: titulo,
        detalle: `${cuando}${nom ? ` · ${nom.nombre}` : ""}`,
        accion: { tipo, resumen: `Agendar “${titulo}” · ${cuando}`, data: { tipo, concepto: titulo, fecha: slots.fecha, hora: slots.hora ?? undefined, clientId: nom?.id, clientNombre: nom?.nombre } },
      };
    }

    case "deuda": {
      const monto = slots.monto!;
      const nom = await resolver();
      const nombreNuevo = nom ? undefined : titleCase(limpiarTitulo(slots.nombreTexto) ?? "");
      if (!nom && !nombreNuevo) return { intent: "desconocido", titulo: "¿A quién le debes?", texto: "Dime el nombre. Ej.: “le debo 500 a Franklin”." };
      const quien = nom?.nombre ?? nombreNuevo!;
      const concepto = sentence(limpiarTitulo(slots.concepto) ?? "");
      return {
        intent: "desconocido", titulo: "¿Registro la deuda?", texto: `Le debes ${money(monto, moneda)} a ${quien}`,
        detalle: concepto || undefined,
        accion: { tipo, resumen: `Registrar deuda de ${money(monto, moneda)} a ${quien}`, data: { tipo, monto, moneda, clientId: nom?.id, nombreNuevo, clientNombre: quien, concepto: concepto || undefined } },
      };
    }

    case "pago": {
      const monto = slots.monto!;
      const nom = await resolver();
      if (!nom) return { intent: "desconocido", titulo: "¿Quién te pagó?", texto: "Dime el nombre del cliente. Ej.: “Franklin me pagó 500”." };
      // Nunca adivinamos a qué pedido va el dinero. Solo auto-aplicamos si hay UNO.
      const supabase = await createClient();
      const { data: ords } = await supabase.from("orders").select("id, total, moneda, fecha").eq("client_id", nom.id).eq("estado", "activo");
      const activos = (ords ?? []) as { id: string; total: number; moneda: string; fecha: string }[];
      if (activos.length !== 1) {
        return {
          intent: "desconocido", titulo: `Pago de ${nom.nombre}`,
          texto: activos.length === 0 ? `${nom.nombre} no tiene pedidos activos. Regístralo en Cobros.` : `${nom.nombre} tiene ${activos.length} pedidos activos. Elige a cuál va el abono.`,
          items: [{ label: "Abrir en Cobros", href: `/cobros?cliente=${nom.id}` }],
        };
      }
      const o = activos[0];
      const mon = (o.moneda === "USD" ? "USD" : "DOP") as Moneda;
      return {
        intent: "desconocido", titulo: "¿Registro el abono?", texto: `${money(monto, mon)} de ${nom.nombre}`,
        detalle: `Abono al pedido del ${fechaLarga(o.fecha)}`,
        accion: { tipo, resumen: `Registrar abono de ${money(monto, mon)} de ${nom.nombre}`, data: { tipo, monto, moneda: mon, orderId: o.id, clientId: nom.id, clientNombre: nom.nombre } },
      };
    }

    case "cliente": {
      const nombre = titleCase(limpiarTitulo(slots.nombreTexto) ?? "");
      if (!nombre) return { intent: "desconocido", titulo: "¿Cómo se llama?", texto: "Dime el nombre. Ej.: “nuevo cliente Juan Pérez”." };
      const label = slots.esProspecto ? "prospecto" : "cliente";
      return {
        intent: "desconocido", titulo: `¿Guardo el ${label}?`, texto: nombre,
        accion: { tipo, resumen: `Guardar ${label} “${nombre}”`, data: { tipo, nombreNuevo: nombre, esProspecto: slots.esProspecto } },
      };
    }

    case "pedido": {
      // El pedido es complejo (ítems, montos): abrimos el formulario prellenado.
      const nom = await resolver();
      return {
        intent: "desconocido", titulo: "Nuevo pedido",
        texto: nom ? `Te llevo a crear un pedido para ${nom.nombre}.` : "Te llevo a crear un pedido. Elige el cliente allí.",
        items: [{ label: nom ? `Crear pedido para ${nom.nombre}` : "Ir a Pedidos", href: nom ? `/pedidos/nuevo?cliente=${nom.id}` : "/pedidos/nuevo" }],
      };
    }
  }
  return null;
}

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
      let debts = (await getManualDebts()).filter((d) => !d.saldado && d.saldo > 0);
      const nom = detectarNombre(t, debts.map((d) => ({ id: d.client_id, nombre: d.personaNombre, apellido: null })));
      if (nom) {
        debts = debts.filter((d) => d.client_id === nom.id);
        if (debts.length === 0) return { intent, titulo: `Deuda · ${nom.nombre}`, texto: `No le debes nada a ${nom.nombre} 🎉` };
        const totN = sumar(debts.map((d) => ({ monto: d.saldo, moneda: d.moneda })));
        return { intent, titulo: `Le debes a ${nom.nombre}`, texto: money2(totN), items: debts.map((d) => ({ label: d.concepto ?? "Deuda", monto: money(d.saldo, d.moneda), href: `/clientes/${d.client_id}` })) };
      }
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
      const todos = await getSaldosClientes();
      const nom = detectarNombre(t, todos.map((s) => ({ id: s.id, nombre: s.nombre, apellido: null })));
      if (nom) {
        const suyo = todos.find((s) => s.id === nom.id);
        const pend = suyo?.porMoneda.filter((m) => m.saldo > 0) ?? [];
        if (pend.length === 0) return { intent, titulo: `Cobros · ${nom.nombre}`, texto: `${nom.nombre} está al día 🎉` };
        return { intent, titulo: `Te debe · ${nom.nombre}`, texto: `${nom.nombre} te debe ${pend.map((m) => money(m.saldo, m.moneda)).join(" · ")}`, items: [{ label: "Ver en Cobros", href: `/cobros?cliente=${suyo!.id}` }] };
      }
      const saldos = todos.filter((s) => s.porMoneda.some((m) => m.saldo > 0));
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
      if (intent === "gastos") {
        const porCat: Record<string, number> = {};
        for (const e of filtraMarca(inR(expenses))) { const k = e.categoria ?? "Sin categoría"; porCat[k] = (porCat[k] ?? 0) + (Number(e.monto) || 0); }
        const items = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cat, tot]) => ({ label: cat, monto: money(tot, "DOP") }));
        return { intent, titulo: `Gastos${suf}`, texto: money2(gas), detalle: items.length ? "Por categoría:" : undefined, items, periodoLabel: r.label };
      }
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
      const nom = detectarNombre(t, contacts.map((c) => ({ id: c.id, nombre: c.nombre, apellido: c.apellido })));
      if (nom) lista = lista.filter((o) => o.client_id === nom.id);
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

    case "datos_cliente": {
      const contacts = await getContacts();
      const nom = detectarNombre(t, contacts.map((c) => ({ id: c.id, nombre: c.nombre, apellido: c.apellido })));
      if (!nom) return { intent, titulo: "¿De cuál cliente?", texto: "Dime el nombre del cliente y te doy sus datos.", fallback: false };
      const c = contacts.find((x) => x.id === nom.id)!;
      const items: AnswerItem[] = [];
      if (c.whatsapp) items.push({ label: "WhatsApp", sub: c.whatsapp, href: `https://wa.me/1${c.whatsapp.replace(/\D/g, "").replace(/^1/, "")}` });
      if (c.telefono) items.push({ label: "Teléfono", sub: c.telefono });
      if (c.correo) items.push({ label: "Correo", sub: c.correo });
      items.push({ label: "Abrir ficha", href: `/clientes/${c.id}` });
      return {
        intent, titulo: nom.nombre,
        detalle: [c.categoria_servicio, c.industria].filter(Boolean).join(" · ") || undefined,
        texto: items.length <= 1 ? "Sin datos de contacto guardados." : undefined,
        items,
      };
    }

    case "pendientes": {
      const supabase = await createClient();
      const { data } = await supabase
        .from("personal_todos")
        .select("id, texto, hecho, venture_id, created_at")
        .eq("hecho", false).is("venture_id", null)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as { id: string; texto: string }[];
      if (rows.length === 0) return { intent, titulo: "Mis pendientes", texto: "Estás al día — sin pendientes 🎉" };
      return {
        intent, titulo: "Mis pendientes",
        detalle: `${rows.length} sin terminar`,
        items: rows.slice(0, 20).map((td) => ({ label: td.texto, href: "/pendientes" })),
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
