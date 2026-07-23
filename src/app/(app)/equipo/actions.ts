"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MemberInput = {
  nombre: string; telefono?: string | null; whatsapp?: string | null; correo?: string | null;
  rol_especialidad?: string | null; notas?: string | null; activo?: boolean; brand_id?: string | null;
};
export async function createMember(input: MemberInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").insert(input).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/equipo");
  return { id: data.id };
}
export async function updateMember(id: string, input: Partial<MemberInput>) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/equipo/${id}`); revalidatePath("/equipo");
  return { ok: true };
}

export type TaskInput = {
  descripcion: string; team_member_id?: string | null; project_id?: string | null; order_id?: string | null;
  monto: number; moneda: "DOP" | "USD"; fecha_limite?: string | null; brand_id?: string | null;
};
export async function createTask(input: TaskInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({ ...input, estado: "pendiente" });
  if (error) return { error: error.message };
  revalidatePath("/equipo");
  if (input.team_member_id) revalidatePath(`/equipo/${input.team_member_id}`);
  return { ok: true };
}
export async function updateTaskStage(id: string, estado: "pendiente" | "en_progreso" | "hecha", memberId?: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ estado }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/equipo");
  revalidatePath("/cobros");
  if (memberId) revalidatePath(`/equipo/${memberId}`);
  return { ok: true };
}

/** Colaborador cambia el estado de SU tarea (vía RPC SECURITY DEFINER). */
export async function workerUpdateTaskEstado(taskId: string, estado: "pendiente" | "en_progreso" | "hecha") {
  const supabase = await createClient();
  const { error } = await supabase.rpc("worker_update_task_estado", { p_task: taskId, p_estado: estado });
  if (error) return { error: error.message };
  revalidatePath("/trabajo");
  return { ok: true };
}

/**
 * Genera acceso de colaborador (rol 'equipo') desde su ficha. Solo owner.
 * Crea el usuario de auth ligado al team_member y devuelve contraseña temporal.
 */
export async function grantTeamAccess(memberId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { data: me } = await supabase.from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "owner") return { error: "Solo el owner puede dar acceso." };

  const { data: m } = await supabase.from("team_members").select("id, nombre, correo").eq("id", memberId).maybeSingle();
  if (!m) return { error: "Persona no encontrada" };
  if (!m.correo) return { error: "Agrega el correo del colaborador en su ficha primero." };

  const admin = createAdminClient();
  const temp = `JM-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: m.correo, password: temp, email_confirm: true,
    user_metadata: { team_member_id: memberId, rol: "equipo" },
  });
  if (error || !created.user) {
    const msg = error?.message ?? "No se pudo crear el usuario";
    if (/already|registered|exists/i.test(msg)) return { error: "Ese correo ya tiene una cuenta." };
    return { error: msg };
  }
  const { error: pErr } = await admin.from("users_profiles").upsert({
    id: created.user.id, rol: "equipo", team_member_id: memberId, nombre: m.nombre, correo: m.correo,
  });
  if (pErr) return { error: pErr.message };

  revalidatePath(`/equipo/${memberId}`);
  return { ok: true, email: m.correo, password: temp };
}

export type PaymentInput = {
  team_member_id: string; task_id?: string | null; monto: number; moneda: "DOP" | "USD";
  fecha: string; metodo?: string | null; nota?: string | null; brand_id?: string | null;
};
export async function registerTeamPayment(input: PaymentInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_payments").insert(input);
  if (error) return { error: error.message };
  revalidatePath(`/equipo/${input.team_member_id}`); revalidatePath("/equipo"); revalidatePath("/cobros");
  return { ok: true };
}
