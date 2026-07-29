"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

/**
 * Agrega un pendiente (created_by = auth.uid() por defecto). Si se pasa
 * ventureId, queda ligado a ese proyecto; si no, es un pendiente Personal.
 */
export async function addTodo(texto: string, ventureId?: string | null) {
  const t = texto.trim();
  if (!t) return { error: "Escribe algo." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personal_todos")
    .insert({ texto: t, venture_id: ventureId || null } as never)
    .select("*").single();
  if (error) return { error: error.message };
  revalidatePath("/pendientes");
  if (ventureId) revalidatePath(`/proyectos/${ventureId}`);
  revalidatePath("/");
  return { todo: data as Row<"personal_todos"> };
}

export async function toggleTodo(id: string, hecho: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("personal_todos").update({ hecho }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/pendientes");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTodo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("personal_todos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/pendientes");
  revalidatePath("/");
  return { ok: true };
}
