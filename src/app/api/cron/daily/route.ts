import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { money } from "@/lib/format";
import { rdToday, addDays } from "@/lib/fecha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hora actual (0-23) en zona horaria de RD. */
function rdHour(): number {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo", hour: "2-digit", hour12: false,
  }).format(new Date()));
}

type Ev = { titulo: string | null; tipo: string; fecha: string; monto: number | null; moneda: string | null; influencer_id: string | null };

/**
 * Cron (Vercel): cada vez que corre, (1) genera facturas recurrentes y refresca
 * follow-ups, y (2) UNA VEZ AL DÍA, a la hora elegida por el owner, envía el
 * resumen del día por correo (Resend) y/o push (Web Push), respetando los
 * toggles por tipo y canal de app_settings. Protegido con CRON_SECRET.
 *
 * Para que la "hora elegida" se respete con exactitud, el cron debe correr cada
 * hora (Vercel Pro). En plan diario igual envía una vez al día.
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
  const result: Record<string, unknown> = { hoy };

  // ---- Preferencias del owner ----
  const { data: settings } = await admin.from("app_settings").select("*").eq("id", "global").maybeSingle();
  const p = (settings ?? {}) as Record<string, unknown>;
  const pref = (k: string) => (p[k] as boolean) ?? true;
  const avisoEntrega = (p.dias_aviso_entrega as number) ?? 1;
  const avisoCobro = (p.dias_aviso_cobro as number) ?? 1;
  const resumenHora = ((p.resumen_hora as string) ?? "07:00").slice(0, 2);
  const ultimoEnvio = (p.resumen_ultimo_envio as string | null) ?? null;

  // ---- ¿Toca enviar el resumen ahora? (una vez al día, a/ tras la hora elegida) ----
  const yaEnviadoHoy = ultimoEnvio === hoy;
  const tocaPorHora = rdHour() >= Number(resumenHora);
  const enviarResumen = !yaEnviadoHoy && tocaPorHora;

  if (enviarResumen) {
    const ventana = Math.max(avisoEntrega, avisoCobro, 3);
    const hasta = addDays(hoy, ventana);

    // Eventos del calendario en la ventana (no completados).
    const { data: evData } = await admin
      .from("calendar_events")
      .select("titulo, tipo, fecha, monto, moneda, influencer_id, completado")
      .eq("completado", false)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true });
    const ev = (evData ?? []) as Ev[];
    const enVentanaCobro = (e: Ev) => e.fecha <= addDays(hoy, avisoCobro);
    const enVentanaEntrega = (e: Ev) => e.fecha <= addDays(hoy, avisoEntrega);

    const eventos = ev.filter((e) => ["inicio", "acuerdo", "personal"].includes(e.tipo));
    const cobros = ev.filter((e) => e.tipo === "cobro" && (e.fecha < hoy || enVentanaCobro(e)));
    const entregas = ev.filter((e) => e.tipo === "entrega" && !e.influencer_id && (e.fecha < hoy || enVentanaEntrega(e)));
    const influencers = ev.filter((e) => e.tipo === "entrega" && e.influencer_id && (e.fecha < hoy || enVentanaEntrega(e)));

    // Tareas con fecha límite.
    const { data: tareasData } = await admin
      .from("tasks")
      .select("descripcion, fecha_limite, estado")
      .neq("estado", "hecha")
      .not("fecha_limite", "is", null)
      .lte("fecha_limite", addDays(hoy, avisoEntrega));
    const tareas = ((tareasData ?? []) as { descripcion: string; fecha_limite: string }[])
      .map((t) => `${t.descripcion} — ${t.fecha_limite}`);

    const fmt = (e: Ev) => `${e.titulo ?? e.tipo} — ${e.fecha}${e.monto != null ? ` (${money(e.monto, e.moneda ?? "DOP")})` : ""}`;

    const sections = [
      { key: "eventos", titulo: "📅 Reuniones / eventos", corto: "Eventos", items: eventos.map(fmt) },
      { key: "cobros", titulo: "💰 Pagos por cobrar", corto: "Cobros", items: cobros.map(fmt) },
      { key: "entregas", titulo: "📦 Entregas pendientes", corto: "Entregas", items: entregas.map(fmt) },
      { key: "tareas", titulo: "✅ Tareas con fecha límite", corto: "Tareas", items: tareas },
      { key: "influencers", titulo: "🤝 Entregas a influencers", corto: "Influencers", items: influencers.map(fmt) },
    ];

    const emailSecs = sections.filter((s) => pref(`notif_${s.key}_email`) && s.items.length);
    const pushSecs = sections.filter((s) => pref(`notif_${s.key}_push`) && s.items.length);

    // ---- Correo (Resend) ----
    const resendKey = process.env.RESEND_API_KEY;
    if (pref("notif_resumen_email") && emailSecs.length && resendKey && !resendKey.startsWith("tu-")) {
      try {
        const { data: owner } = await admin
          .from("users_profiles").select("correo").eq("rol", "owner").not("correo", "is", null).limit(1).maybeSingle();
        const to = (owner as { correo: string | null } | null)?.correo || process.env.OWNER_EMAIL;
        if (to) {
          const body = `Tu resumen de hoy (${hoy}):\n\n` +
            emailSecs.map((s) => `${s.titulo}\n` + s.items.map((i) => `  • ${i}`).join("\n")).join("\n\n");
          const titulo = emailSecs.map((s) => `${s.corto} ${s.items.length}`).join(" · ");
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: process.env.RESEND_FROM || "JM Control <onboarding@resend.dev>",
            to, subject: `Resumen del día — ${titulo}`, text: body,
          });
          result.email = "enviado";
        }
      } catch (e) { result.email = `error: ${e instanceof Error ? e.message : "?"}`; }
    }

    // ---- Push (Web Push / VAPID) — SOLO a los dispositivos del owner ----
    const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPriv = process.env.VAPID_PRIVATE_KEY;
    if (pref("notif_resumen_push") && pushSecs.length && vapidPub && vapidPriv && !vapidPub.startsWith("tu-")) {
      try {
        const { data: owners } = await admin.from("users_profiles").select("id").eq("rol", "owner");
        const ownerIds = (owners ?? []).map((o) => o.id);
        const { data: subs } = ownerIds.length
          ? await admin.from("push_subscriptions").select("subscription_json").in("user_id", ownerIds)
          : { data: [] as { subscription_json: unknown }[] };
        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:jm.designs.worldwide@gmail.com", vapidPub, vapidPriv);
        const body = pushSecs.map((s) => `${s.corto}: ${s.items.length}`).join(" · ");
        const payload = JSON.stringify({ title: "JM Control — Hoy", body, url: "/calendario" });
        let ok = 0;
        for (const s of subs ?? []) {
          try { await webpush.sendNotification(s.subscription_json as never, payload); ok++; } catch { /* vencida */ }
        }
        result.push = `${ok}/${(subs ?? []).length}`;
      } catch (e) { result.push = `error: ${e instanceof Error ? e.message : "?"}`; }
    }

    // Marca que el resumen de hoy ya salió (evita duplicados con cron horario).
    await admin.from("app_settings").update({ resumen_ultimo_envio: hoy }).eq("id", "global");
    result.resumen = "procesado";
  } else {
    result.resumen = yaEnviadoHoy ? "ya enviado hoy" : `espera hasta las ${resumenHora}:00`;
  }

  // ---- Ingresos recurrentes: generar facturas vencidas ----
  try {
    const { data: due } = await admin
      .from("recurring_plans").select("*").eq("activo", true).lte("proxima_factura", hoy);
    let generadas = 0;
    for (const plan of (due ?? []) as { id: string; client_id: string; tipo: string; monto: number; moneda: string; frecuencia: string; proxima_factura: string; brand_id: string | null }[]) {
      const { error } = await admin.from("invoices").insert({
        client_id: plan.client_id, es_fiscal: false,
        items_json: [{ producto: `Plan ${plan.tipo} (${plan.frecuencia})`, cantidad: 1, subtotal: plan.monto }],
        subtotal: plan.monto, itbis: 0, total: plan.monto, moneda: plan.moneda,
        estado_pago: "pendiente", fecha: hoy, brand_id: plan.brand_id,
      });
      if (error) continue;
      await admin.from("calendar_events").insert({
        titulo: `Cobro recurrente (${plan.tipo})`, tipo: "cobro", fecha: plan.proxima_factura,
        client_id: plan.client_id, brand_id: plan.brand_id, auto_generado: true, monto: plan.monto, moneda: plan.moneda,
      });
      const d = new Date(`${plan.proxima_factura}T12:00:00Z`);
      if (plan.frecuencia === "anual") d.setUTCFullYear(d.getUTCFullYear() + 1);
      else if (plan.frecuencia === "trimestral") d.setUTCMonth(d.getUTCMonth() + 3);
      else d.setUTCMonth(d.getUTCMonth() + 1);
      await admin.from("recurring_plans").update({ proxima_factura: d.toISOString().slice(0, 10) }).eq("id", plan.id);
      generadas++;
    }
    result.recurrentes = generadas;
  } catch (e) { result.recurrentes = `error: ${e instanceof Error ? e.message : "?"}`; }

  // ---- Auto-Follow-Up Engine: refresca la tabla followups ----
  try {
    await admin.from("followups").delete().eq("atendido", false);
    const rows: { entidad: string; entidad_id: string; motivo: string; fecha_sugerida: string }[] = [];

    const { data: cobrosV } = await admin.from("calendar_events")
      .select("id, fecha, client_id").eq("tipo", "cobro").eq("completado", false).lt("fecha", hoy);
    for (const c of (cobrosV ?? []) as { id: string }[])
      rows.push({ entidad: "cobro", entidad_id: c.id, motivo: "Cobro vencido", fecha_sugerida: hoy });

    const { data: ctr } = await admin.from("contracts")
      .select("id, fecha_envio").eq("estado", "enviado").lt("fecha_envio", `${addDays(hoy, -3)}T23:59:59`);
    for (const c of (ctr ?? []) as { id: string }[])
      rows.push({ entidad: "lead", entidad_id: c.id, motivo: "Contrato sin firmar", fecha_sugerida: hoy });

    const { data: lead } = await admin.from("clients")
      .select("id").eq("es_lead", true).lt("updated_at", `${addDays(hoy, -5)}T23:59:59`);
    for (const l of (lead ?? []) as { id: string }[])
      rows.push({ entidad: "lead", entidad_id: l.id, motivo: "Prospecto estancado", fecha_sugerida: hoy });

    if (rows.length) await admin.from("followups").insert(rows);
    result.followups = rows.length;
  } catch (e) { result.followups = `error: ${e instanceof Error ? e.message : "?"}`; }

  return NextResponse.json(result);
}
