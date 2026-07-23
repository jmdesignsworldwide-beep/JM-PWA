"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";

/** Solo el owner. Devuelve el client de sesión (RLS), el admin y el userId. */
async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };
  const { data: me } = await supabase.from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "owner") return { error: "Solo el owner puede acceder a Sistemas." as const };
  return { supabase, admin: createAdminClient(), userId: user.id };
}

// ── Validación mínima (sin dependencias): saneo de texto. ──
const clean = (v: unknown, max = 300): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};
const TIPOS = ["demo", "cliente", "colaboracion", "interno"] as const;
const ESTADOS = ["activo", "pausado", "archivado"] as const;

// ── Cuentas ─────────────────────────────────────────────────────────────────
export async function createAccount(input: { correo: string; etiqueta?: string; capacidad?: number; notas?: string; notas_protegidas?: string }) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const correo = clean(input.correo, 200);
  if (!correo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return { error: "Correo inválido." };
  const capacidad = Number.isFinite(input.capacidad) ? Math.max(0, Math.min(50, Math.trunc(input.capacidad!))) : 2;
  const { error } = await auth.supabase.from("system_accounts").insert({
    correo, etiqueta: clean(input.etiqueta, 80), capacidad,
    notas: clean(input.notas, 2000), notas_protegidas: clean(input.notas_protegidas, 2000),
  } as never);
  if (error) return { error: error.message.includes("uidx") ? "Ese correo ya está registrado." : error.message };
  revalidatePath("/sistemas");
  return { ok: true };
}

export async function updateAccount(id: string, input: { etiqueta?: string; capacidad?: number; notas?: string; notas_protegidas?: string }) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const patch: Record<string, unknown> = {};
  if (input.etiqueta !== undefined) patch.etiqueta = clean(input.etiqueta, 80);
  if (input.capacidad !== undefined) patch.capacidad = Math.max(0, Math.min(50, Math.trunc(Number(input.capacidad) || 0)));
  if (input.notas !== undefined) patch.notas = clean(input.notas, 2000);
  if (input.notas_protegidas !== undefined) patch.notas_protegidas = clean(input.notas_protegidas, 2000);
  const { error } = await auth.supabase.from("system_accounts").update(patch as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sistemas"); revalidatePath(`/sistemas/${id}`);
  return { ok: true };
}

export async function deleteAccount(id: string) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("system_accounts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sistemas");
  return { ok: true };
}

// ── Slots ─────────────────────────────────────────────────────────────────
/** ¿La cuenta tiene un slot libre? Devuelve error con sugerencias si está llena. */
async function verificarSlot(auth: { supabase: Awaited<ReturnType<typeof createClient>> }, accountId: string): Promise<string | null> {
  const [{ data: acc }, { data: projs }] = await Promise.all([
    auth.supabase.from("system_accounts").select("capacidad, etiqueta, correo").eq("id", accountId).maybeSingle(),
    auth.supabase.from("system_projects").select("estado").eq("account_id", accountId).neq("estado", "archivado"),
  ]);
  if (!acc) return "Cuenta no encontrada.";
  const usados = (projs ?? []).length;
  if (usados < (acc as { capacidad: number }).capacidad) return null;
  const { data: libres } = await auth.supabase.from("system_accounts").select("id, etiqueta, correo, capacidad");
  const conEspacio: string[] = [];
  for (const a of (libres ?? []) as { id: string; etiqueta: string | null; correo: string; capacidad: number }[]) {
    const { count } = await auth.supabase.from("system_projects").select("id", { count: "exact", head: true }).eq("account_id", a.id).neq("estado", "archivado");
    if ((count ?? 0) < a.capacidad) conEspacio.push(a.etiqueta ?? a.correo);
  }
  const sug = conEspacio.length ? ` Cuentas con espacio: ${conEspacio.join(", ")}.` : " No hay cuentas con espacio.";
  return `Esta cuenta está llena (${usados}/${(acc as { capacidad: number }).capacidad}).${sug}`;
}

// ── Proyectos ────────────────────────────────────────────────────────────────
export async function createProject(input: { account_id?: string | null; nombre: string; tipo?: string; referencia?: string; estado?: string; notas?: string; notas_protegidas?: string }) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const nombre = clean(input.nombre, 160);
  if (!nombre) return { error: "El nombre del proyecto es obligatorio." };
  const tipo = TIPOS.includes(input.tipo as never) ? input.tipo : "demo";
  const estado = ESTADOS.includes(input.estado as never) ? input.estado : "activo";
  const accountId = input.account_id || null;
  if (accountId && estado !== "archivado") {
    const bloqueo = await verificarSlot(auth, accountId);
    if (bloqueo) return { error: bloqueo };
  }
  const { error } = await auth.supabase.from("system_projects").insert({
    account_id: accountId, nombre, tipo, estado,
    referencia: clean(input.referencia, 300), notas: clean(input.notas, 2000), notas_protegidas: clean(input.notas_protegidas, 2000),
  } as never);
  if (error) return { error: error.message };
  revalidatePath("/sistemas"); if (accountId) revalidatePath(`/sistemas/${accountId}`);
  return { ok: true };
}

export async function updateProject(id: string, input: { nombre?: string; tipo?: string; referencia?: string; estado?: string; notas?: string; notas_protegidas?: string }) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const patch: Record<string, unknown> = {};
  if (input.nombre !== undefined) { const n = clean(input.nombre, 160); if (!n) return { error: "El nombre no puede quedar vacío." }; patch.nombre = n; }
  if (input.tipo !== undefined && TIPOS.includes(input.tipo as never)) patch.tipo = input.tipo;
  if (input.estado !== undefined && ESTADOS.includes(input.estado as never)) patch.estado = input.estado;
  if (input.referencia !== undefined) patch.referencia = clean(input.referencia, 300);
  if (input.notas !== undefined) patch.notas = clean(input.notas, 2000);
  if (input.notas_protegidas !== undefined) patch.notas_protegidas = clean(input.notas_protegidas, 2000);
  const { error } = await auth.supabase.from("system_projects").update(patch as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sistemas");
  return { ok: true };
}

/** Asigna un proyecto a una cuenta (bloquea si la cuenta está llena). */
export async function assignProject(id: string, accountId: string) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  if (!accountId) return { error: "Elige una cuenta." };
  const bloqueo = await verificarSlot(auth, accountId);
  if (bloqueo) return { error: bloqueo };
  const { error } = await auth.supabase.from("system_projects").update({ account_id: accountId } as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sistemas"); revalidatePath(`/sistemas/${accountId}`);
  return { ok: true };
}

/** Quita el proyecto de su cuenta (libera el slot). */
export async function unassignProject(id: string) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("system_projects").update({ account_id: null } as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sistemas");
  return { ok: true };
}

export async function deleteProject(id: string) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("system_projects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sistemas");
  return { ok: true };
}

// ── PIN + revelación (vía admin/service_role; el hash nunca sale) ────────────
export async function getPinStatus() {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  const { data, error } = await auth.admin.rpc("system_pin_status", { p_actor: auth.userId });
  if (error) return { error: error.message };
  return { hasPin: !!data };
}

export async function setPin(pin: string) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  if (!/^\d{4,10}$/.test((pin ?? "").trim())) return { error: "El PIN debe ser de 4 a 10 dígitos." };
  const { error } = await auth.admin.rpc("set_system_pin", { p_actor: auth.userId, p_pin: pin.trim() });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function revealNote(kind: "account" | "project", id: string, pin: string) {
  const auth = await requireOwner();
  if ("error" in auth) return { error: auth.error };
  // Rate-limit extra en el server (además del de la BD).
  if (!rateLimit(`reveal:${auth.userId}`, 5, 60_000)) return { error: "Demasiados intentos. Espera un momento." };
  if (!/^\d{4,10}$/.test((pin ?? "").trim())) return { error: "PIN inválido." };
  const { data, error } = await auth.admin.rpc("reveal_protected", { p_actor: auth.userId, p_kind: kind, p_id: id, p_pin: pin.trim() });
  if (error) return { error: error.message };
  if (data == null) return { error: "PIN incorrecto." };
  return { ok: true, nota: data as string };
}
