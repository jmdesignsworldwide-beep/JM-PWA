"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { responder, type Answer } from "@/lib/asistente/answer";
import { detectarIntencion, INTENT_LABEL, EJEMPLO, type IntentId } from "@/lib/asistente/intents";

/** Solo el owner usa el asistente. */
async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };
  const { data: me } = await supabase.from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "owner") return { error: "Solo el owner puede usar el asistente." as const };
  return { supabase, userId: user.id };
}

/** Pregunta libre → respuesta con datos reales. Cuenta el uso de la intención. */
export async function preguntar(texto: string): Promise<Answer & { error?: string }> {
  const auth = await requireOwner();
  if ("error" in auth) return { intent: "desconocido", titulo: "", error: auth.error };
  if (!rateLimit(`asistente:${auth.userId}`, 30, 60_000)) return { intent: "desconocido", titulo: "Espera un momento", texto: "Vas muy rápido, intenta de nuevo en unos segundos." };
  const limpio = (texto ?? "").slice(0, 300);
  if (!limpio.trim()) return { intent: "desconocido", titulo: "Escribe una pregunta", texto: "Ej.: “quién me debe”, “cuánto gasté este mes”, “qué tengo esta semana”." };

  const res = await responder(limpio);

  // Contador de uso (best-effort: si aún no existe la tabla, no rompe nada).
  const { intent } = detectarIntencion(limpio);
  if (intent !== "desconocido") {
    try {
      const { data: cur } = await auth.supabase.from("assistant_faq").select("uso").eq("intent", intent).maybeSingle();
      await auth.supabase.from("assistant_faq").upsert(
        { intent, label: INTENT_LABEL[intent], uso: ((cur as { uso: number } | null)?.uso ?? 0) + 1 } as never,
        { onConflict: "intent" },
      );
    } catch { /* la tabla llega con la migración */ }
  }
  return res;
}

export type FaqQuick = { intent: IntentId; label: string; pregunta: string; favorita: boolean };

/** Top de preguntas frecuentes (favoritas primero, luego por uso). Default: las clásicas. */
export async function getFaqTop(): Promise<FaqQuick[]> {
  const auth = await requireOwner();
  const base: IntentId[] = ["cobros", "deudas", "neto", "agenda"];
  const toQuick = (id: IntentId, favorita = false): FaqQuick => ({ intent: id, label: INTENT_LABEL[id], pregunta: EJEMPLO[id], favorita });
  if ("error" in auth) return base.map((id) => toQuick(id));
  try {
    const { data } = await auth.supabase
      .from("assistant_faq")
      .select("intent, favorita, uso")
      .order("favorita", { ascending: false })
      .order("uso", { ascending: false })
      .limit(6);
    const rows = (data ?? []) as { intent: IntentId; favorita: boolean; uso: number }[];
    const usados = rows.filter((r) => r.favorita || r.uso > 0).map((r) => toQuick(r.intent, r.favorita));
    // Rellena hasta 4 con las clásicas si aún no hay historial suficiente.
    const faltan = base.filter((id) => !usados.some((u) => u.intent === id)).map((id) => toQuick(id));
    return [...usados, ...faltan].slice(0, 6);
  } catch {
    return base.map((id) => toQuick(id));
  }
}

/** Fija/quita una intención como favorita. */
export async function toggleFavorita(intent: IntentId, favorita: boolean) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("assistant_faq").upsert(
    { intent, label: INTENT_LABEL[intent], favorita } as never,
    { onConflict: "intent" },
  );
  if (error) return { error: error.message };
  return { ok: true };
}
