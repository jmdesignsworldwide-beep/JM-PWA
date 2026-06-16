"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MemberInput = {
  nombre: string; telefono?: string | null; whatsapp?: string | null;
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
  if (memberId) revalidatePath(`/equipo/${memberId}`);
  return { ok: true };
}

export type PaymentInput = {
  team_member_id: string; task_id?: string | null; monto: number; moneda: "DOP" | "USD";
  fecha: string; metodo?: string | null; nota?: string | null; brand_id?: string | null;
};
export async function registerTeamPayment(input: PaymentInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_payments").insert(input);
  if (error) return { error: error.message };
  revalidatePath(`/equipo/${input.team_member_id}`); revalidatePath("/equipo");
  return { ok: true };
}
