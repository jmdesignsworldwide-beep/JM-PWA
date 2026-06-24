"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUsername, slugUsername } from "@/lib/username";

/** Email de auth interno cuando el cliente no tiene correo real. */
const PORTAL_EMAIL_DOMAIN = "portal.jmdesigns.app";

/** Busca un username libre a partir de una base: base, base2, base3… */
async function uniqueUsername(
  admin: ReturnType<typeof createAdminClient>,
  base: string,
  exceptUserId?: string,
): Promise<string> {
  const { data } = await admin
    .from("users_profiles").select("id, username").ilike("username", `${base}%`);
  const taken = new Set(
    (data ?? [])
      .filter((r) => r.id !== exceptUserId && r.username)
      .map((r) => r.username!.toLowerCase()),
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

export type ClientUpdate = {
  nombre?: string;
  apellido?: string | null;
  cedula?: string | null;
  factura_fiscal?: boolean;
  rnc?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  correo?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  direccion?: string | null;
  info_nota?: string | null;
  categoria_servicio?: "web" | "software" | "app" | "distribution" | null;
  industria?: string | null;
  lo_que_quiere?: string | null;
  fuente?: string | null;
  valor_estimado?: number | null;
  valor_estimado_moneda?: "DOP" | "USD";
  brand_id?: string | null;
};

export async function updateClient(id: string, input: ClientUpdate) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/leads");
  return { ok: true };
}

/**
 * Genera acceso al Portal para un cliente: crea su usuario de auth (rol cliente)
 * ligado a su client_id y devuelve una contraseña temporal para compartir.
 * Solo el owner puede hacerlo.
 */
/**
 * Sugiere un username único para el cliente (sin crear nada todavía), para que
 * el owner lo vea y lo ajuste antes de enviar el acceso.
 */
export async function suggestPortalUsername(clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: me } = await supabase
    .from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "owner") return { error: "Solo el owner puede dar acceso." };

  const { data: client } = await supabase
    .from("clients").select("id, nombre, apellido").eq("id", clientId).maybeSingle();
  if (!client) return { error: "Cliente no encontrado" };

  const admin = createAdminClient();
  // Si ya tiene acceso, devuelve su username actual para editarlo.
  const { data: existing } = await admin
    .from("users_profiles").select("id, username").eq("client_id", clientId).eq("rol", "cliente").maybeSingle();
  if (existing?.username) return { ok: true, username: existing.username, yaExiste: true };

  const username = await uniqueUsername(admin, baseUsername(client.nombre, client.apellido), existing?.id);
  return { ok: true, username, yaExiste: !!existing };
}

/**
 * Crea (o actualiza) el acceso al portal con el username elegido y una clave
 * temporal. El cliente entrará con su username o su correo. Solo el owner.
 * Mantiene el aislamiento: la cuenta queda ligada solo a este client_id.
 */
export async function grantPortalAccess(clientId: string, desiredUsername?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: me } = await supabase
    .from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "owner") return { error: "Solo el owner puede dar acceso." };

  const { data: client } = await supabase
    .from("clients").select("id, nombre, apellido, correo").eq("id", clientId).maybeSingle();
  if (!client) return { error: "Cliente no encontrado" };

  const admin = createAdminClient();
  const nombreCompleto = `${client.nombre} ${client.apellido ?? ""}`.trim();

  // ¿Ya tiene cuenta de cliente? Entonces actualizamos (username + clave).
  const { data: existing } = await admin
    .from("users_profiles").select("id, correo, username").eq("client_id", clientId).eq("rol", "cliente").maybeSingle();

  // Username elegido (saneado) o autogenerado, garantizado único.
  const wanted = slugUsername(desiredUsername ?? "") || baseUsername(client.nombre, client.apellido);
  const username = await uniqueUsername(admin, wanted, existing?.id);

  // Clave temporal legible.
  const temp = `JM-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`;
  const loginPath = "/portal/login";

  if (existing) {
    // Restablece clave y actualiza username (no recreamos la cuenta).
    const { error: uErr } = await admin.auth.admin.updateUserById(existing.id, { password: temp });
    if (uErr) return { error: uErr.message };
    const { error: pErr } = await admin
      .from("users_profiles").update({ username, nombre: nombreCompleto }).eq("id", existing.id);
    if (pErr) return { error: pErr.message };
    revalidatePath(`/clientes/${clientId}`);
    return { ok: true, username, password: temp, loginPath, actualizado: true };
  }

  // Email de auth: el correo real si existe; si no, uno interno basado en el username.
  const authEmail = client.correo?.trim().toLowerCase() || `${username}@${PORTAL_EMAIL_DOMAIN}`;

  const { data: created, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password: temp,
    email_confirm: true,
    user_metadata: { client_id: clientId, rol: "cliente" },
  });
  if (error || !created.user) {
    const msg = error?.message ?? "No se pudo crear el usuario";
    if (/already|registered|exists/i.test(msg)) {
      return { error: "Ese correo ya tiene una cuenta. Usa 'recuperar contraseña' en el portal." };
    }
    return { error: msg };
  }

  const { error: pErr } = await admin.from("users_profiles").upsert({
    id: created.user.id,
    rol: "cliente",
    client_id: clientId,
    nombre: nombreCompleto,
    correo: authEmail,
    username,
  });
  if (pErr) return { error: pErr.message };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, username, password: temp, loginPath };
}

/** Bóveda de documentos: registra un archivo subido al Storage. */
export async function addClientDocument(input: {
  client_id: string; file_url: string; tipo: string | null; visible_cliente: boolean;
}) {
  const supabase = await createClient();
  // Versionado simple: cuenta archivos previos del mismo tipo para este cliente.
  const { count } = await supabase
    .from("project_files").select("id", { count: "exact", head: true })
    .eq("client_id", input.client_id).eq("tipo", input.tipo ?? "Documento");
  const { error } = await supabase.from("project_files").insert({
    client_id: input.client_id, file_url: input.file_url,
    tipo: input.tipo ?? "Documento", visible_cliente: input.visible_cliente,
    version: (count ?? 0) + 1,
  });
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${input.client_id}`);
  return { ok: true };
}

export async function toggleDocumentVisible(id: string, visible: boolean, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_files").update({ visible_cliente: visible }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

export async function deleteDocument(id: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_files").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/** URL firmada temporal para descargar un documento privado. */
export async function getSignedDocUrl(fileUrl: string) {
  const supabase = await createClient();
  const slash = fileUrl.indexOf("/");
  if (slash < 0) return { error: "Ruta inválida" };
  const bucket = fileUrl.slice(0, slash);
  const path = fileUrl.slice(slash + 1);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

/** Conversión manual Lead -> Cliente activo. */
export async function convertToActive(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ es_lead: false, etapa_venta: "ganado" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/leads");
  return { ok: true };
}
