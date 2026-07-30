"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rdToday } from "@/lib/fecha";
import { generarPlanVencido, nextRecurringDate, type DuePlan } from "@/lib/recurrentes";

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

export type ExpenseLinea = { descripcion: string | null; monto: number | null };
export type ExpenseInput = {
  monto: number; moneda: "DOP" | "USD"; fecha: string; categoria?: string | null;
  descripcion?: string | null; factura_url?: string | null; project_id?: string | null; brand_id?: string | null;
  comercio?: string | null; itbis?: number | null; metodo_pago?: string | null; es_personal?: boolean;
  lineas_json?: ExpenseLinea[] | null;
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
  clase: "ingreso" | "gasto";
  es_personal?: boolean;
  client_id?: string | null;
  tipo?: "mantenimiento" | "hosting" | "retainer" | null;
  categoria?: string | null;
  concepto?: string | null;
  monto: number;
  moneda: "DOP" | "USD";
  frecuencia: "quincenal" | "mensual" | "trimestral" | "anual";
  proxima_factura: string;
  brand_id?: string | null;
};
export async function addRecurringPlan(input: RecurringInput) {
  const supabase = await createClient();
  if (!input.monto || input.monto <= 0) return { error: "Escribe un monto mayor que cero." };
  const personal = !!input.es_personal;
  // Ingreso de negocio necesita cliente; gasto/personal no.
  if (input.clase === "ingreso" && !personal && !input.client_id) return { error: "Elige el cliente del ingreso recurrente." };
  const { error } = await supabase.from("recurring_plans").insert({
    clase: input.clase,
    es_personal: personal,
    client_id: personal ? null : (input.client_id || null),
    tipo: input.clase === "ingreso" && !personal ? (input.tipo ?? null) : null,
    categoria: input.categoria?.trim() || null,
    concepto: input.concepto?.trim() || null,
    monto: input.monto,
    moneda: input.moneda,
    frecuencia: input.frecuencia,
    proxima_factura: input.proxima_factura,
    brand_id: personal ? null : (input.brand_id || null),
    activo: true,
  });
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

/** Genera los movimientos de los planes recurrentes vencidos (proxima_factura <= hoy). */
export async function generateRecurringDue() {
  const supabase = await createClient();
  const hoy = rdToday();
  const { data: due } = await supabase
    .from("recurring_plans")
    .select("*")
    .eq("activo", true)
    .lte("proxima_factura", hoy);

  let generadas = 0;
  for (const p of (due ?? []) as DuePlan[]) {
    const ok = await generarPlanVencido(supabase as never, p, hoy);
    if (!ok) continue;
    await supabase.from("recurring_plans").update({ proxima_factura: nextRecurringDate(p.proxima_factura, p.frecuencia) }).eq("id", p.id);
    generadas++;
  }
  revalidatePath("/finanzas");
  return { ok: true, generadas };
}
