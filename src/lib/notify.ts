import { EMPRESA } from "@/lib/empresa";
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notifica a UN cliente (correo + push) sobre un avance de su proyecto.
 * Best-effort: nunca lanza; devuelve qué se envió. Usa la service_role para
 * poder leer el correo del cliente y sus suscripciones push (la RLS las acota
 * a cada usuario, así que solo desde el servidor con admin).
 */
export async function notifyClient(opts: {
  clientId: string;
  title: string;
  body: string;
  url?: string;
}): Promise<{ email: boolean; push: number }> {
  const result = { email: false, push: 0 };
  const admin = createAdminClient();

  // --- Correo (Resend) ---
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && !resendKey.startsWith("tu-")) {
      const { data: cli } = await admin
        .from("clients").select("correo, nombre").eq("id", opts.clientId).maybeSingle();
      if (cli?.correo) {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: process.env.RESEND_FROM || `${EMPRESA.nombre} <onboarding@resend.dev>`,
          to: cli.correo,
          subject: opts.title,
          text: `Hola ${cli.nombre ?? ""} 👋\n\n${opts.body}\n\nEntra a tu portal para ver el avance: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/portal\n\n— ${EMPRESA.nombre}`,
        });
        result.email = true;
      }
    }
  } catch {
    /* el correo es best-effort */
  }

  // --- Push (Web Push / VAPID) a los usuarios de ese cliente ---
  try {
    const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPriv = process.env.VAPID_PRIVATE_KEY;
    if (vapidPub && vapidPriv && !vapidPub.startsWith("tu-")) {
      const { data: profiles } = await admin
        .from("users_profiles").select("id").eq("client_id", opts.clientId);
      const ids = (profiles ?? []).map((p) => p.id);
      if (ids.length) {
        const { data: subs } = await admin
          .from("push_subscriptions").select("subscription_json").in("user_id", ids);
        if (subs?.length) {
          const webpush = (await import("web-push")).default;
          webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || `mailto:${EMPRESA.email}`,
            vapidPub, vapidPriv,
          );
          const payload = JSON.stringify({ title: opts.title, body: opts.body, url: opts.url ?? "/portal" });
          for (const s of subs) {
            try {
              await webpush.sendNotification(s.subscription_json as never, payload);
              result.push++;
            } catch { /* suscripción vencida */ }
          }
        }
      }
    }
  } catch {
    /* el push es best-effort */
  }

  return result;
}
