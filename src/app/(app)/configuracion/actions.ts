"use server";

import { EMPRESA } from "@/lib/empresa";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUsername, slugUsername } from "@/lib/username";
import { NOTIF_KEYS, type NotifPrefs } from "@/lib/notificaciones";

/** Solo el owner actual puede gestionar owners. Devuelve el admin client o error. */
async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };
  const { data: me } = await supabase.from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "owner") return { error: "Solo un owner puede gestionar owners." as const };
  return { admin: createAdminClient(), meId: user.id };
}

/** Username libre a partir de una base: base, base2, base3… (excluye un id). */
async function uniqueUsername(admin: ReturnType<typeof createAdminClient>, base: string, exceptId?: string) {
  const { data } = await admin.from("users_profiles").select("id, username").ilike("username", `${base}%`);
  const taken = new Set((data ?? []).filter((r) => r.id !== exceptId && r.username).map((r) => r.username!.toLowerCase()));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

/**
 * Crea otro usuario OWNER (acceso total). Solo un owner puede hacerlo.
 * Los múltiples owners conviven: la RLS da acceso por rol, no por id.
 * Asigna un username (editable) para que pueda entrar por usuario o correo.
 */
export async function createOwner(input: { email: string; password?: string; nombre?: string; username?: string }) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { admin } = auth;

  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Correo inválido." };
  const password = input.password?.trim() || `JM-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`;
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const nombre = input.nombre?.trim() || email;
  const wanted = slugUsername(input.username ?? "") || baseUsername(input.nombre ?? null) || slugUsername(email.split("@")[0]);
  const username = await uniqueUsername(admin, wanted || "owner");

  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { rol: "owner" },
  });
  if (error || !created.user) {
    const msg = error?.message ?? "No se pudo crear el usuario";
    if (/already|registered|exists/i.test(msg)) return { error: "Ese correo ya tiene una cuenta." };
    return { error: msg };
  }
  const { error: pErr } = await admin.from("users_profiles").upsert({
    id: created.user.id, rol: "owner", nombre, correo: email, username,
  });
  if (pErr) return { error: pErr.message };

  revalidatePath("/configuracion");
  return { ok: true, email, username, password };
}

/** Edita un owner: nombre, correo, username y (opcional) restablece su clave. */
export async function updateOwner(id: string, input: {
  nombre?: string; correo?: string; username?: string; password?: string;
}) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { admin } = auth;

  // Auth: correo y/o contraseña.
  const authPatch: { email?: string; password?: string } = {};
  if (input.correo) {
    const email = input.correo.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Correo inválido." };
    authPatch.email = email;
  }
  if (input.password) {
    if (input.password.trim().length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
    authPatch.password = input.password.trim();
  }
  if (Object.keys(authPatch).length) {
    const { error } = await admin.auth.admin.updateUserById(id, { ...authPatch, email_confirm: true });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return { error: "Ese correo ya tiene una cuenta." };
      return { error: error.message };
    }
  }

  // Perfil: nombre, correo, username (único).
  const patch: { nombre?: string; correo?: string; username?: string } = {};
  if (input.nombre !== undefined) patch.nombre = input.nombre.trim();
  if (authPatch.email) patch.correo = authPatch.email;
  if (input.username !== undefined) {
    const wanted = slugUsername(input.username);
    patch.username = wanted ? await uniqueUsername(admin, wanted, id) : undefined;
  }
  if (Object.keys(patch).length) {
    const { error } = await admin.from("users_profiles").update(patch).eq("id", id);
    if (error) return { error: error.message };
  }

  revalidatePath("/configuracion");
  return { ok: true, username: patch.username };
}

/** Elimina un owner. Protección: nunca borrar el último owner que queda. */
export async function deleteOwner(id: string) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { admin } = auth;

  const { count } = await admin.from("users_profiles").select("id", { count: "exact", head: true }).eq("rol", "owner");
  if ((count ?? 0) <= 1) return { error: "No puedes eliminar el último owner: te quedarías sin acceso." };

  const { error } = await admin.auth.admin.deleteUser(id); // el perfil cae por ON DELETE CASCADE
  if (error) return { error: error.message };

  revalidatePath("/configuracion");
  return { ok: true };
}

// ---------- Visibilidad de módulos del menú ----------
/** Guarda qué módulos del menú se ocultan (solo owner). No afecta los datos. */
export async function updateHiddenModules(hrefs: string[]) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  // Nunca permitir ocultar Dashboard ni Configuración.
  const limpio = [...new Set(hrefs)].filter((h) => h !== "/" && h !== "/configuracion");
  const { error } = await auth.admin.from("app_settings").update({ modulos_ocultos: limpio }).eq("id", "global");
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Marcas ----------
export async function createBrand(nombre: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("brands").insert({ nombre: nombre.trim() });
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}
export async function updateBrand(id: string, input: {
  nombre?: string; rnc?: string | null; telefono?: string | null; direccion?: string | null; logo_url?: string | null; activo?: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("brands").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}

// ---------- Categorías ----------
export async function createCategory(nombre: string, tipo: "ingreso" | "gasto", esPersonal = false) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ nombre: nombre.trim(), tipo, es_personal: esPersonal });
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}
export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}

// ---------- Plantillas ----------
export async function createTemplate(input: { tipo: "contrato" | "dm" | "whatsapp"; nombre: string; contenido: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").insert({ tipo: input.tipo, nombre: input.nombre.trim(), contenido: input.contenido });
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}
export async function updateTemplate(id: string, input: { nombre?: string; contenido?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}
export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}

// ============================================================================
// NOTIFICACIONES — preferencias del owner + pruebas de canal
// ============================================================================

/** Guarda las preferencias de notificaciones (solo owner). */
export async function updateNotificationSettings(input: NotifPrefs) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { admin } = auth;
  const patch: Record<string, unknown> = {
    resumen_hora: input.resumen_hora,
    dias_aviso_entrega: input.dias_aviso_entrega,
    dias_aviso_cobro: input.dias_aviso_cobro,
  };
  for (const k of NOTIF_KEYS) patch[k] = !!input[k];
  const { error } = await admin.from("app_settings").update(patch).eq("id", "global");
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { ok: true };
}

/**
 * Envía AHORA el resumen real del día (agenda + cobros) por correo Y push, para
 * confirmar que llega completo. Devuelve un diagnóstico detallado de cada canal.
 */
export async function sendDailyDigestNow() {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { admin } = auth;
  const { sendDigest } = await import("@/lib/digest");
  const r = await sendDigest(admin, { wantEmail: true, wantPush: true });
  return {
    ok: true,
    agenda: r.data.agenda.length,
    cobros: r.data.cobros.length,
    vacio: r.data.isEmpty,
    asunto: r.data.emailSubject,
    email: r.email,
    push: r.push,
  };
}

/**
 * Estado de las notificaciones para diagnóstico: hora del resumen, último
 * envío, dispositivos push de este owner y qué llaves están configuradas en el
 * servidor (sin exponer valores). Para responder "¿por qué no me llega?".
 */
export async function getNotifStatus() {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { admin, meId } = auth;
  const { data: settings } = await admin.from("app_settings").select("resumen_hora, resumen_ultimo_envio").eq("id", "global").maybeSingle();
  const { count } = await admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", meId);
  const { data: me } = await admin.from("users_profiles").select("correo").eq("id", meId).maybeSingle();
  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  return {
    ok: true,
    resumenHora: (settings as { resumen_hora?: string } | null)?.resumen_hora ?? "07:00",
    ultimoEnvio: (settings as { resumen_ultimo_envio?: string | null } | null)?.resumen_ultimo_envio ?? null,
    pushDevices: count ?? 0,
    ownerEmail: (me as { correo: string | null } | null)?.correo ?? null,
    cronSecret: !!process.env.CRON_SECRET,
    resendOk: !!resendKey && !resendKey.startsWith("tu-"),
    vapidOk: !!vapidPub && !vapidPub.startsWith("tu-") && !!process.env.VAPID_PRIVATE_KEY,
  };
}

/**
 * Envía una notificación de PRUEBA al owner por el canal elegido, para confirmar
 * que push (en este dispositivo) y/o correo realmente llegan.
 */
export async function sendTestNotification(channel: "push" | "email") {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { admin, meId } = auth;

  if (channel === "email") {
    const key = process.env.RESEND_API_KEY;
    if (!key || key.startsWith("tu-")) return { error: "Falta RESEND_API_KEY en el servidor." };
    const { data: me } = await admin.from("users_profiles").select("correo").eq("id", meId).maybeSingle();
    const to = (me as { correo: string | null } | null)?.correo || process.env.OWNER_EMAIL;
    if (!to) return { error: "No tienes un correo registrado en tu perfil." };
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(key);
      await resend.emails.send({
        from: process.env.RESEND_FROM || "JM Control <onboarding@resend.dev>",
        to,
        subject: "✅ Prueba de notificaciones — JM Control Center",
        text: "Si recibiste este correo, las notificaciones por correo funcionan. Así te llegará tu resumen diario y los avisos que dejes activados.",
      });
      return { ok: true, mensaje: `Correo de prueba enviado a ${to}.` };
    } catch (e) {
      return { error: `No se pudo enviar el correo: ${e instanceof Error ? e.message : "?"}` };
    }
  }

  // Push
  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPub || !vapidPriv || vapidPub.startsWith("tu-")) {
    return { error: "Faltan las llaves VAPID en el servidor (push no configurado)." };
  }
  const { data: subs } = await admin.from("push_subscriptions").select("subscription_json").eq("user_id", meId);
  const list = (subs ?? []) as { subscription_json: unknown }[];
  if (list.length === 0) return { error: "No hay dispositivos con push activado. Activa push en este teléfono primero." };
  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${EMPRESA.email}`, vapidPub, vapidPriv);
    const payload = JSON.stringify({ title: "✅ Prueba — JM Control", body: "¡Push funciona! Así te llegarán tus avisos.", url: "/configuracion" });
    let ok = 0;
    for (const s of list) {
      try { await webpush.sendNotification(s.subscription_json as never, payload); ok++; } catch { /* vencida */ }
    }
    if (ok === 0) return { error: "No se pudo entregar a ningún dispositivo (suscripción vencida). Reactiva push." };
    return { ok: true, mensaje: `Push de prueba enviado a ${ok} dispositivo(s). Revisa tu teléfono.` };
  } catch (e) {
    return { error: `No se pudo enviar push: ${e instanceof Error ? e.message : "?"}` };
  }
}
