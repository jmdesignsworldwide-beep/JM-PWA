"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOccurrenceId } from "@/lib/recurrence";

/** Alcance de una acción sobre un evento recurrente. */
export type EventScope = "una" | "serie";

function revalCalendario() {
  revalidatePath("/calendario");
  revalidatePath("/cobros");
  revalidatePath("/pendientes");
  revalidatePath("/");
}

/**
 * Crea/actualiza la excepción (fila hija) de una serie para una fecha puntual.
 * `skip=true` la oculta (borrar solo esa ocurrencia); si no, es un override con
 * los campos de `patch` (editar/completar solo esa ocurrencia).
 */
async function materializeException(
  supabase: Awaited<ReturnType<typeof createClient>>,
  masterId: string,
  fecha: string,
  patch: Record<string, unknown>,
  skip = false,
) {
  const { data: existing } = await supabase
    .from("calendar_events").select("id")
    .eq("recurrence_parent_id", masterId).eq("fecha", fecha).maybeSingle();
  if (existing) {
    return supabase.from("calendar_events").update({ ...patch, recurrence_skip: skip } as never).eq("id", (existing as { id: string }).id);
  }
  const { data: m } = await supabase.from("calendar_events").select("*").eq("id", masterId).maybeSingle();
  if (!m) return { error: { message: "Serie no encontrada" } };
  const base = m as Record<string, unknown>;
  return supabase.from("calendar_events").insert({
    titulo: base.titulo, tipo: base.tipo, hora: base.hora, monto: base.monto, moneda: base.moneda,
    client_id: base.client_id, project_id: base.project_id, influencer_id: base.influencer_id,
    brand_id: base.brand_id, meeting_url: base.meeting_url, ubicacion: base.ubicacion, descripcion: base.descripcion,
    recordatorio_min: base.recordatorio_min, auto_generado: base.auto_generado,
    fecha, recurrence: null, recurrence_parent_id: masterId, recurrence_skip: skip,
    completado: false,
    ...patch,
  } as never);
}

export async function toggleCompletado(id: string, completado: boolean) {
  const supabase = await createClient();
  const occ = parseOccurrenceId(id);
  if (occ) {
    // Completar SOLO esa ocurrencia: se materializa como override.
    const res = await materializeException(supabase, occ.masterId, occ.fecha, { completado });
    if ("error" in res && res.error) return { error: res.error.message };
  } else {
    const { error } = await supabase.from("calendar_events").update({ completado }).eq("id", id);
    if (error) return { error: error.message };
  }
  revalCalendario();
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
  influencer_id?: string | null;
  meeting_url?: string | null;
  ubicacion?: string | null;
  descripcion?: string | null;
  recordatorio_min?: number | null;
  brand_id?: string | null;
  recurrence?: "semanal" | "quincenal" | "mensual" | "anual" | null;
  recurrence_until?: string | null;
};

export async function addEvent(input: NewEventInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").insert({
    ...input,
    recurrence: input.recurrence ?? null,
    recurrence_until: input.recurrence ? (input.recurrence_until ?? null) : null,
    auto_generado: false,
  } as never);
  if (error) return { error: error.message };
  revalCalendario();
  return { ok: true };
}

export type EditEventInput = {
  titulo?: string | null;
  tipo?: "inicio" | "entrega" | "cobro" | "acuerdo" | "personal";
  fecha?: string;
  hora?: string | null;
  monto?: number | null;
  moneda?: "DOP" | "USD" | null;
  descripcion?: string | null;
};

/** Edita un evento. Para recurrentes, `scope` decide una ocurrencia o la serie. */
export async function updateEvent(id: string, patch: EditEventInput, scope: EventScope = "una") {
  const supabase = await createClient();
  const occ = parseOccurrenceId(id);
  if (occ) {
    if (scope === "serie") {
      // Editar la serie: no se mueve la fecha de inicio desde una ocurrencia.
      const { fecha, ...rest } = patch; void fecha;
      const { error } = await supabase.from("calendar_events").update(rest as never).eq("id", occ.masterId);
      if (error) return { error: error.message };
    } else {
      const res = await materializeException(supabase, occ.masterId, occ.fecha, patch as Record<string, unknown>);
      if ("error" in res && res.error) return { error: res.error.message };
    }
    revalCalendario();
    return { ok: true };
  }
  // Fila concreta (única u override) o maestra abierta directamente.
  const { data: row } = await supabase.from("calendar_events").select("recurrence, recurrence_parent_id").eq("id", id).maybeSingle();
  const r = row as { recurrence: string | null; recurrence_parent_id: string | null } | null;
  if (r?.recurrence && scope === "serie") {
    const { fecha, ...rest } = patch; void fecha;
    const { error } = await supabase.from("calendar_events").update(rest as never).eq("id", id);
    if (error) return { error: error.message };
  } else if (r?.recurrence_parent_id && scope === "serie") {
    const { fecha, ...rest } = patch; void fecha;
    const { error } = await supabase.from("calendar_events").update(rest as never).eq("id", r.recurrence_parent_id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("calendar_events").update(patch as never).eq("id", id);
    if (error) return { error: error.message };
  }
  revalCalendario();
  return { ok: true };
}

export async function deleteEvent(id: string, scope: EventScope = "una") {
  const supabase = await createClient();
  const occ = parseOccurrenceId(id);
  if (occ) {
    if (scope === "serie") {
      const { error } = await supabase.from("calendar_events").delete().eq("id", occ.masterId);
      if (error) return { error: error.message };
    } else {
      const res = await materializeException(supabase, occ.masterId, occ.fecha, {}, true);
      if ("error" in res && res.error) return { error: res.error.message };
    }
    revalCalendario();
    return { ok: true };
  }
  const { data: row } = await supabase.from("calendar_events").select("recurrence, recurrence_parent_id, fecha").eq("id", id).maybeSingle();
  const r = row as { recurrence: string | null; recurrence_parent_id: string | null; fecha: string } | null;
  if (r?.recurrence && scope === "una") {
    // Ocultar solo la primera ocurrencia de la serie (la maestra sigue).
    const res = await materializeException(supabase, id, r.fecha, {}, true);
    if ("error" in res && res.error) return { error: res.error.message };
  } else if (r?.recurrence_parent_id && scope === "serie") {
    const { error } = await supabase.from("calendar_events").delete().eq("id", r.recurrence_parent_id);
    if (error) return { error: error.message };
  } else if (r?.recurrence_parent_id && scope === "una") {
    // Override existente: se convierte en "skip" para ocultar esa fecha.
    const { error } = await supabase.from("calendar_events").update({ recurrence_skip: true } as never).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) return { error: error.message };
  }
  revalCalendario();
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

/** Crea un proyecto rápido (solo nombre) ligado a un cliente, desde el calendario. */
export async function createQuickProject(nombre: string, clientId: string) {
  const supabase = await createClient();
  if (!clientId) return { error: "Primero elige o crea un cliente para el proyecto." };
  const { data, error } = await supabase
    .from("projects")
    .insert({ nombre: nombre.trim(), client_id: clientId, estado: "pendiente" } as never)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/calendario");
  return { id: (data as { id: string }).id };
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
