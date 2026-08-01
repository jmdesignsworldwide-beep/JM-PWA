"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { rdToday } from "@/lib/fecha";
import { responder, proponerAccion, type Answer } from "@/lib/asistente/answer";
import { detectarIntencion, INTENT_LABEL, EJEMPLO, type IntentId } from "@/lib/asistente/intents";
import type { AccionData } from "@/lib/asistente/acciones";
import { addExpense, addIncome } from "@/app/(app)/finanzas/actions";
import { addDebt } from "@/app/(app)/cobros/debt-actions";
import { addEvent } from "@/app/(app)/cobros/actions";
import { addOrderPayment } from "@/app/(app)/pedidos/actions";
import { createLead } from "@/app/(app)/leads/actions";
import { addTodo } from "@/app/(app)/pendientes/actions";

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

  // 1) ¿Es una ACCIÓN? (registrar/agendar/crear). Se PROPONE y se confirma; no ejecuta aquí.
  const accion = await proponerAccion(limpio);
  if (accion) return accion;

  // 2) Si no, es una CONSULTA.
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

export type ResultadoAccion = { ok?: boolean; error?: string; mensaje?: string };

/**
 * Ejecuta la acción YA confirmada por el owner (botón "Sí"). Solo owner,
 * auditado por las server actions reutilizadas. Re-valida el monto: nunca
 * guarda dinero sin un valor > 0. Reutiliza la fuente única (no re-teclea).
 */
export async function ejecutarAccion(data: AccionData): Promise<ResultadoAccion> {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  if (!rateLimit(`asistente-accion:${auth.userId}`, 20, 60_000)) return { error: "Vas muy rápido, intenta en unos segundos." };
  const hoy = rdToday();
  const requiereMonto = () => !!data.monto && data.monto > 0;

  try {
    switch (data.tipo) {
      case "pendiente": {
        const texto = (data.concepto ?? "").trim();
        if (!texto) return { error: "Falta el texto del pendiente." };
        const r = await addTodo(texto, null);
        return "error" in r ? { error: r.error } : { ok: true, mensaje: "Pendiente anotado ✅" };
      }
      case "gasto": {
        if (!requiereMonto()) return { error: "Monto inválido." };
        const r = await addExpense({ monto: data.monto!, moneda: data.moneda ?? "DOP", fecha: data.fecha ?? hoy, categoria: data.concepto?.trim() || null, es_personal: !!data.esPersonal });
        return "error" in r ? { error: r.error } : { ok: true, mensaje: "Gasto registrado ✅" };
      }
      case "ingreso": {
        if (!requiereMonto()) return { error: "Monto inválido." };
        const r = await addIncome({ monto: data.monto!, moneda: data.moneda ?? "DOP", fecha: data.fecha ?? hoy, descripcion: data.concepto?.trim() || null, es_personal: !!data.esPersonal });
        return "error" in r ? { error: r.error } : { ok: true, mensaje: "Ingreso registrado ✅" };
      }
      case "evento": {
        if (!data.fecha) return { error: "Falta la fecha del evento." };
        const r = await addEvent({ titulo: data.concepto?.trim() || "Evento", tipo: "personal", fecha: data.fecha, hora: data.hora ?? null, client_id: data.clientId ?? null });
        return "error" in r ? { error: r.error } : { ok: true, mensaje: "Evento agendado ✅" };
      }
      case "deuda": {
        if (!requiereMonto()) return { error: "Monto inválido." };
        const r = await addDebt({ client_id: data.clientId ?? null, nuevoPersonalNombre: data.nombreNuevo ?? null, monto: data.monto!, moneda: data.moneda ?? "DOP", fecha: hoy, concepto: data.concepto?.trim() || null });
        return "error" in r ? { error: r.error } : { ok: true, mensaje: "Deuda registrada ✅" };
      }
      case "pago": {
        if (!requiereMonto() || !data.orderId) return { error: "Datos del abono incompletos." };
        const r = await addOrderPayment({ order_id: data.orderId, monto: data.monto!, moneda: data.moneda ?? "DOP", fecha: hoy, tipo: "abono" });
        return "error" in r ? { error: r.error } : { ok: true, mensaje: "Abono registrado ✅" };
      }
      case "cliente": {
        const nombre = (data.nombreNuevo ?? "").trim();
        if (!nombre) return { error: "Falta el nombre." };
        const r = await createLead({ nombre, es_lead: !!data.esProspecto });
        return "error" in r ? { error: r.error } : { ok: true, mensaje: data.esProspecto ? "Prospecto guardado ✅" : "Cliente guardado ✅" };
      }
      default:
        return { error: "No puedo ejecutar esa acción desde aquí." };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo completar la acción." };
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
