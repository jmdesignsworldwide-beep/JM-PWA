"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUsername, slugUsername } from "@/lib/username";

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
export async function createCategory(nombre: string, tipo: "ingreso" | "gasto") {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ nombre: nombre.trim(), tipo });
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
