import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { money } from "@/lib/format";
import { rdToday, addDays } from "@/lib/fecha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diario (Vercel): envía el resumen del día por correo (Resend) y push
 * (Web Push/VAPID). Lee Supabase con la service_role. Protegido con CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("No autorizado", { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Preferencias
  const { data: settings } = await admin
    .from("app_settings")
    .select("dias_aviso_entrega, dias_aviso_cobro")
    .eq("id", "global")
    .maybeSingle();
  const avisoEntrega = settings?.dias_aviso_entrega ?? 1;
  const avisoCobro = settings?.dias_aviso_cobro ?? 1;

  const hoy = rdToday();
  const hastaCobro = addDays(hoy, avisoCobro);
  const hastaEntrega = addDays(hoy, avisoEntrega);
  const hasta = hastaCobro > hastaEntrega ? hastaCobro : hastaEntrega;

  const { data: eventos } = await admin
    .from("calendar_events")
    .select("id, titulo, tipo, fecha, monto, moneda, client_id, completado")
    .eq("completado", false)
    .in("tipo", ["cobro", "entrega"])
    .lte("fecha", hasta)
    .order("fecha", { ascending: true });

  const ev = (eventos ?? []) as {
    titulo: string | null; tipo: string; fecha: string; monto: number | null; moneda: string | null;
  }[];
  const vencidos = ev.filter((e) => e.fecha < hoy);
  const cobros = ev.filter((e) => e.tipo === "cobro" && e.fecha >= hoy && e.fecha <= hastaCobro);
  const entregas = ev.filter((e) => e.tipo === "entrega" && e.fecha >= hoy && e.fecha <= hastaEntrega);

  const lineas: string[] = [];
  if (vencidos.length) lineas.push(`⚠️ ${vencidos.length} vencido(s)`);
  if (cobros.length) lineas.push(`💰 ${cobros.length} cobro(s) próximos`);
  if (entregas.length) lineas.push(`📦 ${entregas.length} entrega(s) próximas`);
  const resumen = lineas.join(" · ") || "Todo al día ☕";

  const detalle = ev
    .map((e) => `- [${e.tipo}] ${e.titulo ?? ""} (${e.fecha})${e.monto != null ? ` — ${money(e.monto, e.moneda ?? "DOP")}` : ""}`)
    .join("\n");

  const result: Record<string, unknown> = { hoy, resumen, totalEventos: ev.length };

  // --- Correo (Resend) ---
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && !resendKey.startsWith("tu-") && ev.length > 0) {
    try {
      const { data: owner } = await admin
        .from("users_profiles")
        .select("correo")
        .eq("rol", "owner")
        .limit(1)
        .maybeSingle();
      const to = owner?.correo || process.env.OWNER_EMAIL;
      if (to) {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: process.env.RESEND_FROM || "JM Control <onboarding@resend.dev>",
          to,
          subject: `Resumen del día — ${resumen}`,
          text: `Tu briefing de hoy (${hoy}):\n\n${resumen}\n\n${detalle}`,
        });
        result.email = "enviado";
      }
    } catch (e) {
      result.email = `error: ${e instanceof Error ? e.message : "?"}`;
    }
  }

  // --- Push (Web Push / VAPID) ---
  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  if (vapidPub && vapidPriv && !vapidPub.startsWith("tu-") && ev.length > 0) {
    try {
      const webpush = (await import("web-push")).default;
      webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:jm.designs.worldwide@gmail.com", vapidPub, vapidPriv);
      const { data: subs } = await admin.from("push_subscriptions").select("subscription_json");
      const payload = JSON.stringify({ title: "JM Control — Hoy", body: resumen, url: "/cobros" });
      let ok = 0;
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(s.subscription_json as never, payload);
          ok++;
        } catch { /* suscripción vencida */ }
      }
      result.push = `${ok}/${(subs ?? []).length}`;
    } catch (e) {
      result.push = `error: ${e instanceof Error ? e.message : "?"}`;
    }
  }

  return NextResponse.json(result);
}
