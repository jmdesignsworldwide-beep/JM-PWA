// Lógica compartida de planes recurrentes (usada por la acción manual y el cron).
// No es "use server": recibe el cliente Supabase (sesión o admin) como parámetro.

export type DuePlan = {
  id: string; clase: string; es_personal: boolean; client_id: string | null; tipo: string | null;
  categoria: string | null; concepto: string | null; monto: number; moneda: string; frecuencia: string;
  proxima_factura: string; brand_id: string | null;
};

type Db = { from: (t: string) => { insert: (v: unknown) => Promise<{ error: unknown }> } };

/** Próxima fecha según la frecuencia (incluye quincenal = +15 días). */
export function nextRecurringDate(iso: string, frecuencia: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (frecuencia === "anual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else if (frecuencia === "trimestral") d.setUTCMonth(d.getUTCMonth() + 3);
  else if (frecuencia === "quincenal") d.setUTCDate(d.getUTCDate() + 15);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Genera el movimiento de un plan recurrente vencido. Devuelve true si generó.
 *   · gasto            → un GASTO directo en Finanzas
 *   · ingreso personal → un INGRESO directo (personal)
 *   · ingreso negocio  → una FACTURA pendiente + evento de cobro (como siempre)
 */
export async function generarPlanVencido(db: Db, p: DuePlan, hoy: string): Promise<boolean> {
  if (p.clase === "gasto") {
    const { error } = await db.from("expenses").insert({
      monto: p.monto, moneda: p.moneda, fecha: hoy,
      categoria: p.categoria, descripcion: p.concepto || `Gasto recurrente (${p.frecuencia})`,
      es_personal: p.es_personal, brand_id: p.es_personal ? null : p.brand_id,
    });
    return !error;
  }
  if (p.es_personal || !p.client_id) {
    const { error } = await db.from("incomes").insert({
      monto: p.monto, moneda: p.moneda, fecha: hoy,
      categoria: p.categoria || "Ingreso recurrente", descripcion: p.concepto || null,
      es_personal: p.es_personal, brand_id: p.es_personal ? null : p.brand_id, client_id: p.client_id,
    });
    return !error;
  }
  const etiqueta = p.tipo || p.concepto || "servicio";
  const { error } = await db.from("invoices").insert({
    client_id: p.client_id, es_fiscal: false,
    items_json: [{ producto: `Plan ${etiqueta} (${p.frecuencia})`, cantidad: 1, subtotal: p.monto }],
    subtotal: p.monto, itbis: 0, total: p.monto, moneda: p.moneda,
    estado_pago: "pendiente", fecha: hoy, brand_id: p.brand_id,
  });
  if (error) return false;
  await db.from("calendar_events").insert({
    titulo: `Cobro recurrente (${etiqueta})`, tipo: "cobro", fecha: p.proxima_factura,
    client_id: p.client_id, brand_id: p.brand_id, auto_generado: true,
    monto: p.monto, moneda: p.moneda,
  });
  return true;
}
