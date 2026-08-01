// ============================================================================
// ASISTENTE — Acciones (motor por reglas). Detecta el VERBO de acción y extrae
// los datos (monto, concepto, fecha, hora, nombre). Puro (client+server safe).
// La ejecución y la resolución de nombres contra la base van en el server.
// Regla de oro: toda acción con dinero se CONFIRMA mostrando el monto.
// ============================================================================
import { normalizar } from "./intents";

export type AccionTipo = "pendiente" | "gasto" | "ingreso" | "evento" | "pago" | "deuda" | "cliente" | "pedido";
export type Moneda = "DOP" | "USD";

export type SlotsAccion = {
  monto?: number;
  concepto?: string;      // concepto/título libre
  fecha?: string;         // ISO YYYY-MM-DD
  hora?: string;          // HH:MM
  nombreTexto?: string;   // nombre crudo mencionado (se resuelve/crea en el server)
  esPersonal?: boolean;
  esProspecto?: boolean;
};

export type AccionDetectada = { tipo: AccionTipo; slots: SlotsAccion };

/**
 * Datos ya resueltos de una acción, listos para ejecutar en el server.
 * Viaja al cliente (para confirmar) y vuelve al server (para ejecutar); el
 * server SIEMPRE re-valida (owner + monto>0) antes de tocar la base.
 */
export type AccionData = {
  tipo: AccionTipo;
  monto?: number;
  moneda?: Moneda;
  concepto?: string;
  fecha?: string;
  hora?: string;
  clientId?: string;      // contacto resuelto contra la base
  clientNombre?: string;
  nombreNuevo?: string;   // crear contacto/persona al vuelo
  orderId?: string;       // abono a un pedido concreto
  esPersonal?: boolean;
  esProspecto?: boolean;
};

/** Propuesta de acción que se muestra al owner para confirmar (Sí/No). */
export type AccionConfirm = {
  tipo: AccionTipo;
  resumen: string;        // "Registrar gasto de RD$500 en comida"
  data: AccionData;
};

/** Moneda mencionada. Por defecto DOP (moneda principal). */
export function extraerMoneda(t: string): Moneda {
  return /\b(usd|us\$|dolar(es)?|dollars?)\b/.test(t) ? "USD" : "DOP";
}

/**
 * Atajos de acción para el acceso rápido. Al tocarlos PRELLENAN el input (no
 * envían): el owner completa el dato que falta (monto, nombre…) y confirma.
 */
export const ACCIONES_RAPIDAS: { label: string; plantilla: string }[] = [
  { label: "+ Gasto", plantilla: "gasté " },
  { label: "+ Ingreso", plantilla: "entró " },
  { label: "+ Pendiente", plantilla: "recuérdame " },
  { label: "+ Agendar", plantilla: "agéndame " },
];

/** Monto en el texto: "rd$1,500.50", "500", "1500". Coma = miles, punto = decimal. */
export function extraerMonto(t: string): number | undefined {
  const m = t.replace(/rd\$?/g, "").match(/(\d[\d.,]*)/);
  if (!m) return undefined;
  const raw = m[1].replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const DOW = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

/** Fecha mencionada → ISO. Necesita `hoyISO` (el server pasa rdToday()). */
export function extraerFecha(t: string, hoyISO: string): string | undefined {
  const base = new Date(`${hoyISO}T12:00:00Z`);
  if (/\bhoy\b/.test(t)) return hoyISO;
  if (/\bmanana\b/.test(t)) { base.setUTCDate(base.getUTCDate() + 1); return base.toISOString().slice(0, 10); }
  if (/\bpasado manana\b/.test(t)) { base.setUTCDate(base.getUTCDate() + 2); return base.toISOString().slice(0, 10); }
  // Día de la semana: "el viernes" → el próximo viernes (o hoy si es ese día y aún no pasó).
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b(el |este |proximo )?${DOW[i]}\\b`).test(t)) {
      const hoyDow = base.getUTCDay();
      let delta = (i - hoyDow + 7) % 7;
      if (delta === 0) delta = 7; // "el viernes" nunca es hoy
      base.setUTCDate(base.getUTCDate() + delta);
      return base.toISOString().slice(0, 10);
    }
  }
  return undefined;
}

/** Hora mencionada → HH:MM. "a las 3", "3pm", "3 de la tarde". */
export function extraerHora(t: string): string | undefined {
  const m = t.match(/(?:a las |a la )?(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la manana|de la tarde|de la noche)?/);
  if (!m || !/a las|a la|am|pm|de la/.test(t)) return undefined;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3] ?? "";
  if (h > 23 || min > 59) return undefined;
  if (/pm|tarde|noche/.test(mer) && h < 12) h += 12;
  else if (/am|manana/.test(mer) && h === 12) h = 0;
  else if (!mer && h >= 1 && h <= 7) h += 12; // sin meridiano y hora baja → tarde (default de negocio)
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Texto después de un disparador ("recuérdame X", "gasté 500 en X"). */
function colaDespues(t: string, triggers: string[]): string | undefined {
  for (const tr of triggers) {
    const i = t.indexOf(tr);
    if (i >= 0) {
      const cola = t.slice(i + tr.length).replace(/^[:\s]+/, "").trim();
      if (cola) return cola;
    }
  }
  return undefined;
}

/** Detecta si el texto es una ACCIÓN y extrae sus slots. null si no lo es. */
export function detectarAccion(texto: string, hoyISO: string): AccionDetectada | null {
  const t = normalizar(texto);
  const monto = extraerMonto(t);
  const fecha = extraerFecha(t, hoyISO);
  const hora = extraerHora(t);
  const personal = /\bpersonal(es)?\b/.test(t);

  // PEDIDO — abre el formulario prellenado (no crea a ciegas).
  if (/\b(nuevo pedido|hazle un pedido|crear pedido|hacer un pedido|pedido para|pedido de)\b/.test(t) && /\b(para|a|de)\b/.test(t))
    return { tipo: "pedido", slots: { nombreTexto: colaDespues(t, ["para ", "hazle un pedido a ", "pedido de ", "pedido para "]) } };

  // CLIENTE / PROSPECTO
  if (/\b(nuevo cliente|agrega un cliente|agregar cliente|registra a|anade prospecto|nuevo prospecto|guarda a|guardar cliente|crear cliente)\b/.test(t)) {
    const esProspecto = /\bprospecto\b/.test(t);
    const nombreTexto = colaDespues(t, ["nuevo cliente ", "nuevo prospecto ", "anade prospecto ", "agrega un cliente ", "registra a ", "guarda a ", "crear cliente "]);
    return { tipo: "cliente", slots: { nombreTexto, esProspecto } };
  }

  // EVENTO — agendar (verbo de calendario, o "recuérdame … [fecha/hora]")
  if (/\b(agendame|agenda |ponme una reunion|reunion con|cita con|pon un evento|agrega al calendario|agregar al calendario|agendar)\b/.test(t) ||
      (/\brecuerdame\b/.test(t) && (fecha || hora))) {
    const titulo = colaDespues(t, ["agendame ", "agenda ", "agrega al calendario ", "pon un evento ", "reunion con ", "cita con ", "recuerdame "]);
    return { tipo: "evento", slots: { concepto: titulo, fecha, hora, nombreTexto: colaDespues(t, ["con ", "reunion con ", "cita con "]) } };
  }

  // DEUDA — "le debo 500 a X"
  if (/\ble debo\b/.test(t) && monto)
    return { tipo: "deuda", slots: { monto, nombreTexto: colaDespues(t, [" a "]), concepto: colaDespues(t, ["por ", "de "]) } };

  // PAGO de cliente — "[X] me pagó 500", "abono de X por 500", "cobré 500 de X".
  // El nombre suele ir ANTES del verbo ("Franklin me pagó"), así que no exigimos
  // preposición: el nombre se resuelve contra la base en el server (texto completo).
  // "me pagaron" (plural/impersonal) NO es pago de cliente → cae a ingreso.
  if (monto && (/\bme pago\b/.test(t) || /\babono\b/.test(t) || /\bcobre\b/.test(t) || /\bme deposito\b/.test(t)) && !/\ble debo\b/.test(t))
    return { tipo: "pago", slots: { monto, nombreTexto: colaDespues(t, ["abono de ", "cobre ", "me pago ", "de "]) } };

  // GASTO — "gasté 500 en X", "pagué 500 por X", "registra un gasto de 500"
  if (monto && (/\bgaste\b/.test(t) || /\bgasto de\b/.test(t) || /\bpague\b/.test(t) || /\bse me fue\b/.test(t) || /\bregistra un gasto\b/.test(t)))
    return { tipo: "gasto", slots: { monto, concepto: colaDespues(t, ["en ", "por ", "de "]), fecha: fecha ?? hoyISO, esPersonal: personal } };

  // INGRESO — "entró 500", "recibí 500", "me pagaron 500" (sin cliente), "ingreso de 500"
  if (monto && (/\bentro\b/.test(t) || /\brecibi\b/.test(t) || /\bme pagaron\b/.test(t) || /\bingreso de\b/.test(t) || /\bregistra un ingreso\b/.test(t)))
    return { tipo: "ingreso", slots: { monto, concepto: colaDespues(t, ["de ", "por ", "en "]), fecha: fecha ?? hoyISO, esPersonal: personal } };

  // PENDIENTE — "recuérdame X", "anota que X", "apúntame X", "pendiente: X"
  if (/\b(anademe un pendiente|agregame a la lista|recuerdame|anota que|ponme un pendiente|tengo que acordarme de|apuntame|apunta que|pendiente:|nota:)\b/.test(t)) {
    const texto = colaDespues(t, ["anademe un pendiente ", "agregame a la lista ", "recuerdame ", "anota que tengo que ", "anota que ", "ponme un pendiente ", "tengo que acordarme de ", "apuntame ", "apunta que ", "pendiente:", "nota:"]);
    return { tipo: "pendiente", slots: { concepto: texto, esPersonal: personal } };
  }

  return null;
}
