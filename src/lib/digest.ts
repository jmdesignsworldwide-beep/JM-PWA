import { EMPRESA } from "@/lib/empresa";
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { money } from "@/lib/format";
import { EVENT_TIPOS } from "@/lib/eventos";
import { expandEvents } from "@/lib/data/agenda";

/**
 * Resumen MATUTINO del día (fuente única): todo lo que hay en el calendario ESE
 * día + a quién hay que cobrarle (cobros vencidos o que vencen hoy). Lo usan
 * tanto el cron como el botón "Enviar mi resumen de hoy ahora", para que el
 * contenido sea idéntico.
 */

type Admin = SupabaseClient;

type Ev = {
  id: string; titulo: string | null; tipo: string; fecha: string; hora: string | null;
  monto: number | null; moneda: string | null; client_id: string | null; influencer_id: string | null;
};

export type DigestData = {
  hoy: string;
  agenda: { hora: string | null; titulo: string; tipoLabel: string; quien: string | null }[];
  cobros: { titulo: string; quien: string | null; monto: number | null; moneda: string; vencido: number }[];
  totalCobrarDOP: number;
  totalCobrarUSD: number;
  isEmpty: boolean;
  /** Cuerpo de correo (detallado) y de push (conciso) ya armados. */
  emailText: string;
  emailSubject: string;
  pushBody: string;
};

function diffDias(desde: string, hasta: string): number {
  const a = new Date(`${desde}T12:00:00Z`).getTime();
  const b = new Date(`${hasta}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

/** Arma el resumen del día a partir de los datos reales. */
export async function buildTodayDigest(admin: Admin, hoy: string): Promise<DigestData> {
  // HOY (incluye ocurrencias recurrentes) + cobros/entregas VENCIDOS concretos,
  // no completados. Usa la MISMA expansión que el calendario para no perder
  // ninguna repetición.
  const [hoyEv, overdueRaw] = await Promise.all([
    expandEvents(admin, hoy, hoy),
    admin
      .from("calendar_events")
      .select("id, titulo, tipo, fecha, hora, monto, moneda, client_id, influencer_id, completado")
      .is("recurrence", null).eq("recurrence_skip", false)
      .eq("completado", false).lt("fecha", hoy).in("tipo", ["cobro", "entrega"]),
  ]);
  const all = [
    ...((overdueRaw.data ?? []) as (Ev & { completado: boolean })[]),
    ...hoyEv,
  ].filter((e) => !e.completado) as Ev[];

  // Nombres de cliente para mostrar "a quién".
  const clientIds = [...new Set(all.map((e) => e.client_id).filter(Boolean))] as string[];
  const nameMap = new Map<string, string>();
  if (clientIds.length) {
    const { data: cls } = await admin.from("clients").select("id, nombre, apellido").in("id", clientIds);
    for (const c of (cls ?? []) as { id: string; nombre: string; apellido: string | null }[]) {
      nameMap.set(c.id, `${c.nombre} ${c.apellido ?? ""}`.trim());
    }
  }
  const quienDe = (e: Ev) => (e.client_id ? nameMap.get(e.client_id) ?? null : null);

  // Agenda del día: todo lo de HOY que no sea cobro (reuniones, entregas, inicios, acuerdos, personales).
  const agenda = all
    .filter((e) => e.fecha === hoy && e.tipo !== "cobro")
    .map((e) => ({
      hora: e.hora ? e.hora.slice(0, 5) : null,
      titulo: e.titulo ?? EVENT_TIPOS[e.tipo as keyof typeof EVENT_TIPOS]?.label ?? "Evento",
      tipoLabel: EVENT_TIPOS[e.tipo as keyof typeof EVENT_TIPOS]?.label ?? e.tipo,
      quien: quienDe(e),
    }));

  // Cobros: vencen hoy O ya están vencidos (fecha <= hoy). A quién y cuánto.
  const cobrosRaw = all.filter((e) => e.tipo === "cobro");
  const cobros = cobrosRaw.map((e) => ({
    titulo: e.titulo ?? "Cobro",
    quien: quienDe(e),
    monto: e.monto,
    moneda: e.moneda ?? "DOP",
    vencido: Math.max(0, diffDias(e.fecha, hoy)),
  }));
  let totalCobrarDOP = 0, totalCobrarUSD = 0;
  for (const c of cobros) {
    if (c.monto == null) continue;
    if (c.moneda === "USD") totalCobrarUSD += Number(c.monto); else totalCobrarDOP += Number(c.monto);
  }

  const isEmpty = agenda.length === 0 && cobros.length === 0;

  // ---- Cuerpo de correo (detallado) ----
  const lineasAgenda = agenda.map((a) =>
    `  • ${a.hora ? `${a.hora} ` : ""}${a.titulo} [${a.tipoLabel}]${a.quien ? ` — ${a.quien}` : ""}`);
  const lineasCobros = cobros.map((c) => {
    const venc = c.vencido > 0 ? ` (vencido ${c.vencido} día${c.vencido === 1 ? "" : "s"})` : " (vence hoy)";
    return `  • ${c.quien ?? c.titulo}: ${c.monto != null ? money(c.monto, c.moneda) : "monto por definir"}${venc}`;
  });

  const totalLinea = [
    totalCobrarDOP ? money(totalCobrarDOP, "DOP") : "",
    totalCobrarUSD ? money(totalCobrarUSD, "USD") : "",
  ].filter(Boolean).join(" + ");

  const emailText = isEmpty
    ? `Buenos días ☀️\n\nHoy (${hoy}) no tienes eventos en el calendario ni cobros pendientes. ¡Día despejado!`
    : `Buenos días ☀️ — tu resumen de hoy (${hoy}):\n\n` +
      `📅 AGENDA DEL DÍA (${agenda.length})\n${lineasAgenda.length ? lineasAgenda.join("\n") : "  • Sin eventos hoy"}\n\n` +
      `💰 POR COBRAR (${cobros.length})${totalLinea ? ` — total ${totalLinea}` : ""}\n${lineasCobros.length ? lineasCobros.join("\n") : "  • Nada por cobrar"}`;

  // ---- Subject + cuerpo de push (conciso pero real) ----
  const emailSubject = isEmpty
    ? `Tu día (${hoy}) — sin pendientes`
    : `Tu día — ${agenda.length} en agenda · ${cobros.length} por cobrar${totalLinea ? ` (${totalLinea})` : ""}`;

  let pushBody: string;
  if (isEmpty) {
    pushBody = "Día despejado: sin eventos ni cobros pendientes.";
  } else {
    const partes: string[] = [];
    partes.push(`${agenda.length} en agenda · ${cobros.length} por cobrar${totalLinea ? ` ${totalLinea}` : ""}`);
    const aQuien = cobros.filter((c) => c.quien).slice(0, 3).map((c) => c.quien).join(", ");
    if (aQuien) partes.push(`Cobrar a: ${aQuien}${cobros.length > 3 ? "…" : ""}`);
    pushBody = partes.join("\n");
  }

  return { hoy, agenda, cobros, totalCobrarDOP, totalCobrarUSD, isEmpty, emailText, emailSubject, pushBody };
}

export type SendDigestResult = {
  data: DigestData;
  email: { sent: boolean; to: string | null; skipped?: string; error?: string };
  push: { sent: number; total: number; skipped?: string; error?: string };
};

/**
 * Envía el resumen del día por correo (Resend) y push (Web Push) al OWNER.
 * Best-effort y con diagnóstico detallado para saber exactamente qué pasó.
 */
export async function sendDigest(
  admin: Admin,
  opts: { wantEmail: boolean; wantPush: boolean },
): Promise<SendDigestResult> {
  const hoy = (await import("@/lib/fecha")).rdToday();
  const data = await buildTodayDigest(admin, hoy);
  const res: SendDigestResult = {
    data,
    email: { sent: false, to: null },
    push: { sent: 0, total: 0 },
  };

  // ---- Correo (Resend) ----
  if (!opts.wantEmail) {
    res.email.skipped = "desactivado";
  } else {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || resendKey.startsWith("tu-")) {
      res.email.error = "Falta RESEND_API_KEY en el servidor";
    } else {
      try {
        const { data: owner } = await admin
          .from("users_profiles").select("correo").eq("rol", "owner").not("correo", "is", null).limit(1).maybeSingle();
        const to = (owner as { correo: string | null } | null)?.correo || process.env.OWNER_EMAIL || null;
        res.email.to = to;
        if (!to) {
          res.email.error = "El owner no tiene correo registrado";
        } else {
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: process.env.RESEND_FROM || "JM Control <onboarding@resend.dev>",
            to, subject: data.emailSubject, text: data.emailText,
          });
          res.email.sent = true;
        }
      } catch (e) { res.email.error = e instanceof Error ? e.message : "error"; }
    }
  }

  // ---- Push (Web Push / VAPID) a los dispositivos del owner ----
  if (!opts.wantPush) {
    res.push.skipped = "desactivado";
  } else {
    const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPriv = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPub || !vapidPriv || vapidPub.startsWith("tu-")) {
      res.push.error = "Faltan llaves VAPID en el servidor";
    } else {
      try {
        const { data: owners } = await admin.from("users_profiles").select("id").eq("rol", "owner");
        const ownerIds = (owners ?? []).map((o) => o.id);
        const { data: subs } = ownerIds.length
          ? await admin.from("push_subscriptions").select("subscription_json").in("user_id", ownerIds)
          : { data: [] as { subscription_json: unknown }[] };
        const list = (subs ?? []) as { subscription_json: unknown }[];
        res.push.total = list.length;
        if (list.length === 0) {
          res.push.error = "No hay dispositivos con push activado";
        } else {
          const webpush = (await import("web-push")).default;
          webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${EMPRESA.email}`, vapidPub, vapidPriv);
          const payload = JSON.stringify({ title: `☀️ Tu día — ${data.hoy}`, body: data.pushBody, url: "/calendario" });
          for (const s of list) {
            try { await webpush.sendNotification(s.subscription_json as never, payload); res.push.sent++; } catch { /* vencida */ }
          }
          if (res.push.sent === 0) res.push.error = "Suscripción(es) vencida(s): reactiva push";
        }
      } catch (e) { res.push.error = e instanceof Error ? e.message : "error"; }
    }
  }

  return res;
}
