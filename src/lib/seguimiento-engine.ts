import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPRESA } from "@/lib/empresa";
import { addDays } from "@/lib/fecha";

/** Días que espera para volver a preguntar si no hubo respuesta ese día. */
const DIAS_REPREGUNTA = 15;

/** Franja del día según la hora RD (define el saludo del aviso). */
export function franjaDelDia(h: number): { key: "manana" | "mediodia" | "noche"; saludo: string } {
  if (h < 12) return { key: "manana", saludo: "Buenos días ☀️" };
  if (h < 18) return { key: "mediodia", saludo: "Mediodía 👋" };
  return { key: "noche", saludo: "Antes de dormir 🌙" };
}

/**
 * Motor del seguimiento de eventos del calendario vencidos. Lo llaman DOS crons:
 *   · /api/cron/daily        → una vez al día (mañana), sin configurar nada.
 *   · /api/cron/seguimiento  → mediodía y noche vía GitHub Actions (opcional).
 * Las franjas están repartidas entre ambos, así que nunca se duplican avisos.
 *
 * En cada corrida: (1) siembra el día de preguntar la primera vez que ve un
 * vencido, (2) reprograma +15 días si el día de preguntar pasó sin respuesta y
 * (3) manda UN push de la franja actual al owner con lo que toca preguntar hoy.
 * La máquina de estado es idempotente: correrla varias veces al día no rompe
 * nada. No borra la notificación — eso lo hace el owner desde la app.
 */
export async function runSeguimiento(
  admin: SupabaseClient,
  hoy: string,
  hora: number,
): Promise<Record<string, unknown>> {
  const franja = franjaDelDia(hora);
  const out: Record<string, unknown> = { hoy, franja: franja.key };

  const { data: vencidos } = await admin
    .from("calendar_events")
    .select("id, titulo, seguimiento_prox")
    .is("recurrence", null)
    .eq("recurrence_skip", false)
    .eq("completado", false)
    .eq("seguimiento_activo", true)
    .lt("fecha", hoy);

  const rows = (vencidos ?? []) as { id: string; titulo: string | null; seguimiento_prox: string | null }[];

  let sembrados = 0, reprogramados = 0;
  const preguntar: { id: string; titulo: string | null }[] = [];

  for (const ev of rows) {
    let prox = ev.seguimiento_prox;
    if (!prox) {
      prox = hoy; // primera vez que se ve vencido → se pregunta hoy
      await admin.from("calendar_events").update({ seguimiento_prox: hoy }).eq("id", ev.id);
      sembrados++;
    }
    if (hoy < prox) continue; // esperando la re-pregunta a los 15 días
    if (hoy > prox) {
      // el día de preguntar pasó sin respuesta → re-preguntar en +15 días
      await admin
        .from("calendar_events")
        .update({ seguimiento_prox: addDays(hoy, DIAS_REPREGUNTA), seguimiento_ultimo_aviso: null })
        .eq("id", ev.id);
      reprogramados++;
      continue;
    }
    // hoy == prox → toca preguntar en esta franja
    preguntar.push({ id: ev.id, titulo: ev.titulo });
    await admin.from("calendar_events").update({ seguimiento_ultimo_aviso: hoy }).eq("id", ev.id);
  }

  out.total_vencidos = rows.length;
  out.sembrados = sembrados;
  out.reprogramados = reprogramados;
  out.a_preguntar = preguntar.length;

  if (preguntar.length === 0) {
    out.push = "sin pendientes";
    return out;
  }

  // Respeta el toggle de notificaciones de eventos del owner.
  const { data: settings } = await admin
    .from("app_settings").select("notif_eventos_push").eq("id", "global").maybeSingle();
  const quierePush = ((settings ?? {}) as Record<string, unknown>).notif_eventos_push ?? true;
  if (!quierePush) {
    out.push = "desactivado (notif_eventos_push)";
    return out;
  }

  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPub || !vapidPriv || vapidPub.startsWith("tu-")) {
    out.push = "faltan llaves VAPID";
    return out;
  }

  try {
    const { data: owners } = await admin.from("users_profiles").select("id").eq("rol", "owner");
    const ownerIds = (owners ?? []).map((o) => (o as { id: string }).id);
    const { data: subs } = ownerIds.length
      ? await admin.from("push_subscriptions").select("subscription_json").in("user_id", ownerIds)
      : { data: [] as { subscription_json: unknown }[] };
    const list = (subs ?? []) as { subscription_json: unknown }[];

    const n = preguntar.length;
    const ejemplo = preguntar[0].titulo?.trim();
    const body = n === 1
      ? `¿Ya hiciste "${ejemplo ?? "tu evento"}"? Ábrela y confírmalo.`
      : `Tienes ${n} eventos vencidos por confirmar. Ábrela y dime cuáles hiciste.`;

    let sent = 0;
    if (list.length) {
      const webpush = (await import("web-push")).default;
      webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${EMPRESA.email}`, vapidPub, vapidPriv);
      const payload = JSON.stringify({ title: `${franja.saludo} — ¿lo completaste?`, body, url: "/calendario" });
      for (const s of list) {
        try { await webpush.sendNotification(s.subscription_json as never, payload); sent++; } catch { /* vencida */ }
      }
    }
    out.push = `${sent}/${list.length}`;
  } catch (e) {
    out.push = `error: ${e instanceof Error ? e.message : "?"}`;
  }

  return out;
}
