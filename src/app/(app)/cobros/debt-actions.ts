"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NewDebtInput = {
  /** Persona existente (cliente/prospecto/personal). */
  client_id?: string | null;
  /** Si no existe, se crea un contacto Personal con este nombre. */
  nuevoPersonalNombre?: string | null;
  monto: number;
  moneda: "DOP" | "USD";
  fecha: string;
  concepto?: string | null;
  nota?: string | null;
};

export async function addDebt(input: NewDebtInput) {
  const supabase = await createClient();
  if (!input.monto || input.monto <= 0) return { error: "Escribe un monto mayor que cero." };

  let clientId = input.client_id || null;
  // Crear contacto Personal al vuelo si se escribió un nombre nuevo.
  if (!clientId) {
    const nombre = input.nuevoPersonalNombre?.trim();
    if (!nombre) return { error: "Elige a quién le debes o escribe un nombre." };
    const { data: nuevo, error: e1 } = await supabase
      .from("clients")
      .insert({ nombre, es_personal: true, es_lead: false } as never)
      .select("id").single();
    if (e1) return { error: e1.message };
    clientId = (nuevo as { id: string }).id;
  }

  const { error } = await supabase.from("debts").insert({
    client_id: clientId,
    monto: input.monto,
    moneda: input.moneda,
    fecha: input.fecha,
    concepto: input.concepto?.trim() || null,
    nota: input.nota?.trim() || null,
  } as never);
  if (error) return { error: error.message };
  revalidatePath("/cobros");
  return { ok: true };
}

export async function toggleDebtSaldado(id: string, saldado: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("debts").update({ saldado } as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/cobros");
  return { ok: true };
}

export async function deleteDebt(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/cobros");
  return { ok: true };
}
