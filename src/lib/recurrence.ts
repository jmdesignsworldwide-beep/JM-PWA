/**
 * Recurrencia por PATRÓN (no por filas). Un evento maestro guarda su frecuencia
 * y fecha de inicio; las ocurrencias se calculan aquí al vuelo para un rango.
 * Una excepción (fila hija) puede sobrescribir u ocultar una fecha puntual.
 */

export type Freq = "semanal" | "quincenal" | "mensual" | "anual";

export const FREQ_LABEL: Record<Freq, string> = {
  semanal: "Cada semana",
  quincenal: "Cada 15 días",
  mensual: "Cada mes",
  anual: "Cada año",
};

export const FREQ_LIST: { id: Freq; label: string }[] = [
  { id: "semanal", label: "Cada semana" },
  { id: "quincenal", label: "Cada 15 días (quincenal)" },
  { id: "mensual", label: "Cada mes" },
  { id: "anual", label: "Cada año" },
];

/** Separador del id virtual de una ocurrencia generada: `${masterId}::${fecha}`. */
export const OCC_SEP = "::";

/** ¿El id corresponde a una ocurrencia generada (virtual) de una serie? */
export function parseOccurrenceId(id: string): { masterId: string; fecha: string } | null {
  const i = id.indexOf(OCC_SEP);
  if (i === -1) return null;
  const masterId = id.slice(0, i);
  const fecha = id.slice(i + OCC_SEP.length);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  return { masterId, fecha };
}

/** Construye el id virtual de una ocurrencia. */
export function occurrenceId(masterId: string, fecha: string): string {
  return `${masterId}${OCC_SEP}${fecha}`;
}

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86400000);
}
function daysInMonth(y: number, m1: number): number {
  return new Date(Date.UTC(y, m1, 0)).getUTCDate(); // m1 = 1..12
}

/** ¿La serie que empieza en `start` (freq) cae en `date`? */
export function occursOn(start: string, freq: Freq, date: string): boolean {
  if (date < start) return false;
  const s = toUTC(start), d = toUTC(date);
  switch (freq) {
    case "semanal": {
      const diff = daysBetween(start, date);
      return diff % 7 === 0;
    }
    case "quincenal": {
      const diff = daysBetween(start, date);
      return diff % 14 === 0;
    }
    case "mensual": {
      const startDay = s.getUTCDate();
      const dy = d.getUTCFullYear(), dm = d.getUTCMonth() + 1, dd = d.getUTCDate();
      const dim = daysInMonth(dy, dm);
      // Si el mes no tiene ese día (ej. 31), la ocurrencia cae el último día.
      const target = Math.min(startDay, dim);
      return dd === target;
    }
    case "anual": {
      return s.getUTCMonth() === d.getUTCMonth() && s.getUTCDate() === d.getUTCDate();
    }
  }
}

/**
 * Fechas de una serie dentro de [from, to] (inclusive), respetando `until`.
 * Itera día a día: los rangos de lectura siempre están acotados (día/semana/
 * mes/ventana del digest), así que es barato.
 */
export function datesInRange(start: string, freq: Freq, until: string | null, from: string, to: string): string[] {
  const lo = from < start ? start : from;
  const hi = until && until < to ? until : to;
  if (hi < lo) return [];
  const out: string[] = [];
  let cur = toUTC(lo);
  const hiT = toUTC(hi).getTime();
  // Tope duro de seguridad (evita bucles largos si el rango es enorme).
  let guard = 0;
  while (cur.getTime() <= hiT && guard < 1000) {
    const cs = iso(cur);
    if (occursOn(start, freq, cs)) out.push(cs);
    cur = new Date(cur.getTime() + 86400000);
    guard++;
  }
  return out;
}
