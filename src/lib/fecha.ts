/** Utilidades de fecha en zona horaria de RD (America/Santo_Domingo). */
const TZ = "America/Santo_Domingo";

/** Fecha de hoy en RD como 'YYYY-MM-DD'. */
export function rdToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA da YYYY-MM-DD
}

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana de `iso`. */
export function startOfWeek(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  return addDays(iso, -dow);
}

export function endOfWeek(iso: string): string {
  return addDays(startOfWeek(iso), 6);
}

/** Último día del mes de `iso`. */
export function endOfMonth(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return last.toISOString().slice(0, 10);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}
