"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleCompletado(id: string, completado: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .update({ completado })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/cobros");
  revalidatePath("/calendario");
  revalidatePath("/");
  return { ok: true };
}

export type NewEventInput = {
  titulo: string;
  tipo: "inicio" | "entrega" | "cobro" | "acuerdo" | "personal";
  fecha: string;
  hora?: string | null;
  monto?: number | null;
  moneda?: "DOP" | "USD" | null;
  client_id?: string | null;
  project_id?: string | null;
  meeting_url?: string | null;
  ubicacion?: string | null;
  descripcion?: string | null;
  recordatorio_min?: number | null;
  brand_id?: string | null;
};

export async function addEvent(input: NewEventInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").insert({
    ...input,
    auto_generado: false,
  } as never);
  if (error) return { error: error.message };
  revalidatePath("/calendario");
  revalidatePath("/cobros");
  return { ok: true };
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/calendario");
  revalidatePath("/cobros");
  return { ok: true };
}

export async function updateReminderSettings(input: {
  resumen_hora: string;
  dias_aviso_entrega: number;
  dias_aviso_cobro: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update(input)
    .eq("id", "global");
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}

/** Guarda la suscripción Web Push del usuario actual. */
export async function savePushSubscription(subscription: unknown) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ user_id: user.id, subscription_json: subscription as never });
  if (error) return { error: error.message };
  return { ok: true };
}
