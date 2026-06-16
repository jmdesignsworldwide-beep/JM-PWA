"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Crea otro usuario OWNER (acceso total). Solo un owner puede hacerlo.
 * Los múltiples owners conviven: la RLS da acceso por rol, no por id, así que
 * todos ven y manejan todo sin pisarse.
 */
export async function createOwner(input: { email: string; password?: string; nombre?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: me } = await supabase.from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "owner") return { error: "Solo un owner puede crear otro owner." };

  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Correo inválido." };
  const password = input.password?.trim() || `JM-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`;
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { rol: "owner" },
  });
  if (error || !created.user) {
    const msg = error?.message ?? "No se pudo crear el usuario";
    if (/already|registered|exists/i.test(msg)) return { error: "Ese correo ya tiene una cuenta." };
    return { error: msg };
  }
  const { error: pErr } = await admin.from("users_profiles").upsert({
    id: created.user.id, rol: "owner", nombre: input.nombre?.trim() || email, correo: email,
  });
  if (pErr) return { error: pErr.message };

  revalidatePath("/configuracion");
  return { ok: true, email, password };
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
