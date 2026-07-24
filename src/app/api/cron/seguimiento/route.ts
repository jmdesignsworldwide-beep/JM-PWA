import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { EMPRESA } from "@/lib/empresa";
import { rdToday, addDays } from "@/lib/fecha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hora actual (0-23) en zona horaria de RD. */
function rdHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santo_Domingo", hour: "2-digit", hour12: false,
    }).format(new Date()),
  );
}

/** Franja del día según la hora RD (para el saludo del aviso). */
function franjaDelDia(h: number): { key: "manana" | "mediodia" | "noche"; saludo: string } {
  if (h < 12) return { key: "manana", saludo: "Buenos días ☀️" };
  if (h < 18) return { key: "mediodia", saludo: "Mediodía 👋" };
  return { key: "noche", saludo: "Antes de dormir 🌙" };
}

const DIAS_REPREGUNTA = 15;

/**
 * Cron de SEGUIMIENTO de eventos del calendario vencidos.
 *
 * Se dispara 3 veces al día (mañana / mediodía / noche) desde GitHub Actions,
 * porque el plan free de Vercel solo permite crons una vez al día. Cada corrida:
 *
 *  1. Busca eventos concretos (no recurrentes) vencidos, sin completar y aún en
 *     seguimiento.
 *  2. Siembra `seguimiento_prox = hoy` la primera vez que se detecta un vencido
 *     (ese día se pregunta 3x).
 *  3. Si el día de preguntar ya pasó sin respuesta (hoy > prox), reprograma la
 *     próxima pregunta a +15 días (deja de recordar mientras tanto).
 *  4. Si hoy es el día de preguntar (hoy == prox), cuenta el evento para el
 *     aviso push de esta franja.
 *
 * La notificación NO se borra sola: vive en la campana hasta que el owner
 * responda Sí (completar) o No (mover de fecha) desde la app. Protegido con
 * CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const hoy = rdToday();
  const hora = rdHour();
  const franja = franjaDelDia(hora);
  const result: Record<string, unknown> = { hoy, franja: franja.key };

  // --- 1. Vencidos concretos en seguimiento ---
  const { data: vencidos } = await admin
    .from("calendar_events")
    .select("id, titulo, tipo, fecha, seguimiento_prox, seguimiento_ultimo_aviso")
    .is("recurrence", null)
    .eq("recurrence_skip", false)
    .eq("completado", false)
    .eq("seguimiento_activo", true)
    .lt("fecha", hoy);

  const rows = (vencidos ?? []) as {
    id: string; titulo: string | null; tipo: string | null; fecha: string;
    seguimiento_prox: string | null; seguimiento_ultimo_aviso: string | null;
  }[];

  let sembrados = 0, reprogramados = 0;
  const preguntarHoy: { id: string; titulo: string | null }[] = [];

  for (const ev of rows) {
    let prox = ev.seguimiento_prox;
    // 2. Primera vez que se ve vencido → se pregunta HOY.
    if (!prox) {
      prox = hoy;
      await admin.from("calendar_events").update({ seguimiento_prox: hoy }).eq("id", ev.id);
      sembrados++;
    }
    if (hoy < prox) continue; // aún no toca (esperando la re-pregunta a los 15 días)
    if (hoy > prox) {
      // 3. El día de preguntar pasó sin respuesta → re-preguntar en +15 días.
      await admin
        .from("calendar_events")
        .update({ seguimiento_prox: addDays(hoy, DIAS_REPREGUNTA), seguimiento_ultimo_aviso: null })
        .eq("id", ev.id);
      reprogramados++;
      continue;
    }
    // 4. hoy == prox → toca preguntar en esta franja.
    preguntarHoy.push({ id: ev.id, titulo: ev.titulo });
    if (ev.seguimiento_ultimo_aviso !== hoy) {
      await admin.from("calendar_events").update({ seguimiento_ultimo_aviso: hoy }).eq("id", ev.id);
    }
  }

  result.total_vencidos = rows.length;
  result.sembrados = sembrados;
  result.reprogramados = reprogramados;
  result.a_preguntar = preguntarHoy.length;

  // --- 5. Un aviso push (esta franja) al owner, si hay algo que preguntar ---
  if (preguntarHoy.length === 0) {
    result.push = "sin pendientes";
    return NextResponse.json(result);
  }

  // Respeta el toggle de notificaciones de eventos del owner.
  const { data: settings } = await admin
    .from("app_settings").select("notif_eventos_push").eq("id", "global").maybeSingle();
  const quierePush = ((settings ?? {}) as Record<string, unknown>).notif_eventos_push ?? true;
  if (!quierePush) {
    result.push = "desactivado (notif_eventos_push)";
    return NextResponse.json(result);
  }

  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPub || !vapidPriv || vapidPub.startsWith("tu-")) {
    result.push = "faltan llaves VAPID";
    return NextResponse.json(result);
  }

  try {
    const { data: owners } = await admin.from("users_profiles").select("id").eq("rol", "owner");
    const ownerIds = (owners ?? []).map((o) => (o as { id: string }).id);
    const { data: subs } = ownerIds.length
      ? await admin.from("push_subscriptions").select("subscription_json").in("user_id", ownerIds)
      : { data: [] as { subscription_json: unknown }[] };
    const list = (subs ?? []) as { subscription_json: unknown }[];

    const n = preguntarHoy.length;
    const ejemplo = preguntarHoy[0].titulo?.trim();
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
    result.push = `${sent}/${list.length}`;
  } catch (e) {
    result.push = `error: ${e instanceof Error ? e.message : "?"}`;
  }

  return NextResponse.json(result);
}
