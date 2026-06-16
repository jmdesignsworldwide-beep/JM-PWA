"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Login del portal por USERNAME o CORREO. Resuelve el correo de auth con la
 * service_role (sin exponerlo al navegador) y firma la sesión en el servidor.
 * Devuelve un error genérico para no filtrar qué cuentas existen.
 */
export async function portalLogin(identifier: string, password: string) {
  const id = identifier.trim().toLowerCase();
  if (!id || !password) return { error: "Escribe tu usuario/correo y tu clave." };

  const admin = createAdminClient();
  // Por correo si trae "@", si no por username. .eq() va parametrizado (sin inyección).
  const col = id.includes("@") ? "correo" : "username";
  const { data: prof } = await admin
    .from("users_profiles")
    .select("correo")
    .eq("rol", "cliente")
    .eq(col, id)
    .limit(1)
    .maybeSingle();

  const email = prof?.correo;
  if (!email) return { error: "Usuario o clave incorrectos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Usuario o clave incorrectos." };
  return { ok: true };
}

/**
 * Firma del contrato DESDE el portal del cliente. La RLS (client_sign_contract)
 * solo permite actualizar el contrato propio; el trigger dispara la
 * automatización (factura + calendario + conversión). Avisa al owner.
 */
export async function signContractPortal(contractId: string, firma: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // El perfil debe ser cliente y dueño de ese contrato (lo valida RLS también).
  const { data: profile } = await supabase
    .from("users_profiles").select("rol, client_id").eq("id", user.id).maybeSingle();
  if (!profile || profile.rol !== "cliente" || !profile.client_id) {
    return { error: "Solo el cliente puede firmar." };
  }

  const nombre = firma.trim();
  if (nombre.length < 3) return { error: "Escribe tu nombre completo como firma." };

  // Update acotado por RLS a su propio contrato.
  const { data: updated, error } = await supabase
    .from("contracts")
    .update({ estado: "aprobado_firmado", firma_cliente: nombre })
    .eq("id", contractId)
    .eq("client_id", profile.client_id)
    .eq("estado", "enviado")
    .select("id, client_id, brand_id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) return { error: "Este contrato no está disponible para firmar." };

  // Aviso al owner (calendar_events tipo 'acuerdo' hoy). Vía admin: el cliente
  // no puede escribir en calendar_events por RLS.
  try {
    const admin = createAdminClient();
    const { data: cli } = await admin.from("clients").select("nombre, apellido").eq("id", updated.client_id).maybeSingle();
    const nombreCli = cli ? `${cli.nombre} ${cli.apellido ?? ""}`.trim() : "Cliente";
    await admin.from("calendar_events").insert({
      titulo: `✍️ ${nombreCli} firmó el contrato`,
      tipo: "acuerdo",
      fecha: new Date().toISOString().slice(0, 10),
      client_id: updated.client_id,
      brand_id: updated.brand_id,
      auto_generado: true,
    });
  } catch {
    /* el aviso es best-effort; la firma ya quedó */
  }

  revalidatePath("/portal");
  return { ok: true };
}
