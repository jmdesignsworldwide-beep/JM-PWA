import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rdToday, addDays } from "@/lib/fecha";
import { sendDigest } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hora actual (0-23) en zona horaria de RD. */
function rdHour(): number {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo", hour: "2-digit", hour12: false,
  }).format(new Date()));
}

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
  const resumenHora = ((p.resumen_hora as string) ?? "07:00").slice(0, 2);
  const ultimoEnvio = (p.resumen_ultimo_envio as string | null) ?? null;

  // ¿Toca enviar el resumen? En plan FREE el cron corre 1 vez al día (en la
  // mañana, según vercel.json), así que esa corrida ES el resumen matutino:
  // basta con no haberlo enviado hoy. Si hubiera cron por hora (Pro), respeta
  // además la hora elegida. Así nunca se "salta" el día en plan free.
  const yaEnviadoHoy = ultimoEnvio === hoy;
  const tocaPorHora = rdHour() >= Number(resumenHora);
  const hayCronHorario = process.env.CRON_HOURLY === "1";
  const enviarResumen = !yaEnviadoHoy && (!hayCronHorario || tocaPorHora);

  if (enviarResumen) {
    // Resumen del día (mismo contenido que el botón manual): agenda + cobros.
    const envio = await sendDigest(admin, {
      wantEmail: pref("notif_resumen_email"),
      wantPush: pref("notif_resumen_push"),
    });
    result.email = envio.email.sent ? `enviado a ${envio.email.to}` : (envio.email.error ?? envio.email.skipped ?? "—");
    result.push = `${envio.push.sent}/${envio.push.total}${envio.push.error ? ` (${envio.push.error})` : ""}`;
    result.agenda = envio.data.agenda.length;
    result.cobros = envio.data.cobros.length;

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
