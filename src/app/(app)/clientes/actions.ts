"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClientUpdate = {
  nombre?: string;
  apellido?: string | null;
  cedula?: string | null;
  factura_fiscal?: boolean;
  rnc?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  correo?: string | null;
  direccion?: string | null;
  info_nota?: string | null;
  categoria_servicio?: "web" | "software" | "ambos" | null;
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
export async function grantPortalAccess(clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: me } = await supabase
    .from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "owner") return { error: "Solo el owner puede dar acceso." };

  const { data: client } = await supabase
    .from("clients").select("id, nombre, apellido, correo").eq("id", clientId).maybeSingle();
  if (!client) return { error: "Cliente no encontrado" };
  if (!client.correo) return { error: "El cliente no tiene correo. Agrégalo primero en su ficha." };

  const admin = createAdminClient();

  // Contraseña temporal legible.
  const temp = `JM-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: created, error } = await admin.auth.admin.createUser({
    email: client.correo,
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
    nombre: `${client.nombre} ${client.apellido ?? ""}`.trim(),
    correo: client.correo,
  });
  if (pErr) return { error: pErr.message };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, email: client.correo, password: temp };
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
