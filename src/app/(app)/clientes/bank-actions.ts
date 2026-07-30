"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";

/** Solo el owner. Devuelve el admin (service_role) y el userId. */
async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };
  const { data: me } = await supabase.from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "owner") return { error: "Solo el owner puede ver datos bancarios." as const };
  return { admin: createAdminClient(), userId: user.id };
}

const clean = (v: unknown, max = 200): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

export type BankInput = {
  client_id: string;
  banco?: string | null;
  tipo_cuenta?: "ahorros" | "corriente" | "" | null;
  titular?: string | null;
  cedula_rnc?: string | null;
  numero?: string | null;
  pin: string;
};

/**
 * Guarda/actualiza los datos bancarios del contacto. El número se cifra en la
 * BD (RPC SECURITY DEFINER); requiere el PIN de Sistemas. Si dejas el número
 * vacío, se conserva el que ya estaba (solo actualiza banco/titular/etc.).
 */
export async function saveContactBank(input: BankInput) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  if (!input.client_id) return { error: "Contacto inválido." };
  if (!rateLimit(`bank:${auth.userId}`, 5, 60_000)) return { error: "Demasiados intentos. Espera un momento." };
  if (!/^\d{4,10}$/.test((input.pin ?? "").trim())) return { error: "PIN inválido." };
  const tipo = input.tipo_cuenta === "ahorros" || input.tipo_cuenta === "corriente" ? input.tipo_cuenta : null;

  const { error } = await auth.admin.rpc("save_contact_bank", {
    p_actor: auth.userId,
    p_client_id: input.client_id,
    p_banco: clean(input.banco, 120),
    p_tipo: tipo,
    p_titular: clean(input.titular, 160),
    p_cedula: clean(input.cedula_rnc, 40),
    p_numero: clean(input.numero, 40),
    p_pin: input.pin.trim(),
  });
  if (error) return { error: error.message.includes("PIN") ? "PIN incorrecto." : error.message };
  revalidatePath(`/clientes/${input.client_id}`);
  return { ok: true };
}

/** Revela el número completo verificando el PIN en el servidor. */
export async function revealBank(clientId: string, pin: string) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  if (!rateLimit(`bank-reveal:${auth.userId}`, 5, 60_000)) return { error: "Demasiados intentos. Espera un momento." };
  if (!/^\d{4,10}$/.test((pin ?? "").trim())) return { error: "PIN inválido." };

  const { data, error } = await auth.admin.rpc("reveal_contact_bank", {
    p_actor: auth.userId, p_client_id: clientId, p_pin: pin.trim(),
  });
  if (error) return { error: error.message };
  if (data == null) return { error: "PIN incorrecto." };
  return { ok: true, numero: data as string };
}
