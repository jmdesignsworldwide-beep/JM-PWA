"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rdToday } from "@/lib/fecha";

export type IncomeInput = {
  monto: number; moneda: "DOP" | "USD"; fecha: string; categoria?: string | null;
  client_id?: string | null; project_id?: string | null; descripcion?: string | null;
  comprobante_url?: string | null; brand_id?: string | null; es_personal?: boolean;
};
export async function addIncome(input: IncomeInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("incomes").insert(input);
  if (error) return { error: error.message };
  revalidatePath("/finanzas");
  return { ok: true };
}

/** Edita un movimiento existente (ingreso o gasto). */
export async function updateMovimiento(
  kind: "income" | "expense",
  id: string,
  patch: Partial<ExpenseInput & IncomeInput>,
) {
  const supabase = await createClient();
  const table = kind === "income" ? "incomes" : "expenses";
  const { error } = await supabase.from(table).update(patch as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finanzas");
  revalidatePath("/");
  return { ok: true };
}

/** Borra un movimiento (ingreso o gasto). */
export async function deleteMovimiento(kind: "income" | "expense", id: string) {
  const supabase = await createClient();
  const table = kind === "income" ? "incomes" : "expenses";
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finanzas");
  revalidatePath("/");
  return { ok: true };
}

/** URL firmada temporal para ver el recibo/comprobante guardado (bucket privado). */
export async function getReceiptUrl(fileUrl: string) {
  const supabase = await createClient();
  const slash = fileUrl.indexOf("/");
  if (slash < 0) return { error: "Ruta inválida" };
  const bucket = fileUrl.slice(0, slash);
  const path = fileUrl.slice(slash + 1);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

export type ExpenseInput = {
  monto: number; moneda: "DOP" | "USD"; fecha: string; categoria?: string | null;
  descripcion?: string | null; factura_url?: string | null; project_id?: string | null; brand_id?: string | null;
  comercio?: string | null; itbis?: number | null; metodo_pago?: string | null; es_personal?: boolean;
};
export async function addExpense(input: ExpenseInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert(input);
  if (error) return { error: error.message };
  revalidatePath("/finanzas");
  revalidatePath("/");
  return { ok: true };
}

/** "No gasté nada hoy": registra el día sin gasto. */
export async function logNoExpense() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_expense_log")
    .upsert({ fecha: rdToday(), sin_gasto: true }, { onConflict: "fecha" });
  if (error) return { error: error.message };
  revalidatePath("/finanzas");
  revalidatePath("/");
  return { ok: true };
}

export type RecurringInput = {
  client_id: string; tipo: "mantenimiento" | "hosting" | "retainer"; monto: number;
  moneda: "DOP" | "USD"; frecuencia: "mensual" | "trimestral" | "anual"; proxima_factura: string; brand_id?: string | null;
};
export async function addRecurringPlan(input: RecurringInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_plans").insert({ ...input, activo: true });
  if (error) return { error: error.message };
  revalidatePath("/finanzas");
  return { ok: true };
}

export async function toggleRecurring(id: string, activo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_plans").update({ activo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finanzas");
  return { ok: true };
}

function nextDate(iso: string, frecuencia: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (frecuencia === "anual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else if (frecuencia === "trimestral") d.setUTCMonth(d.getUTCMonth() + 3);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** Genera facturas de los planes recurrentes vencidos (proxima_factura <= hoy). */
export async function generateRecurringDue() {
  const supabase = await createClient();
  const hoy = rdToday();
  const { data: due } = await supabase
    .from("recurring_plans")
    .select("*")
    .eq("activo", true)
    .lte("proxima_factura", hoy);

  let generadas = 0;
  for (const p of (due ?? []) as { id: string; client_id: string; tipo: string; monto: number; moneda: string; frecuencia: string; proxima_factura: string; brand_id: string | null }[]) {
    const { error } = await supabase.from("invoices").insert({
      client_id: p.client_id,
      es_fiscal: false,
      items_json: [{ producto: `Plan ${p.tipo} (${p.frecuencia})`, cantidad: 1, subtotal: p.monto }],
      subtotal: p.monto, itbis: 0, total: p.monto, moneda: p.moneda as "DOP" | "USD",
      estado_pago: "pendiente", fecha: hoy, brand_id: p.brand_id,
    });
    if (error) continue;
    await supabase.from("calendar_events").insert({
      titulo: `Cobro recurrente (${p.tipo})`, tipo: "cobro", fecha: p.proxima_factura,
      client_id: p.client_id, brand_id: p.brand_id, auto_generado: true,
      monto: p.monto, moneda: p.moneda as "DOP" | "USD",
    });
    await supabase.from("recurring_plans").update({ proxima_factura: nextDate(p.proxima_factura, p.frecuencia) }).eq("id", p.id);
    generadas++;
  }
  revalidatePath("/finanzas");
  return { ok: true, generadas };
}
