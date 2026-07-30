"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { IdeaCampo } from "@/lib/ventures";

export async function addIdea(ventureId: string, titulo: string, tipo: string | null, campos: IdeaCampo[]) {
  if (!titulo.trim()) return { error: "Ponle un título a la idea." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("venture_ideas").insert({
    venture_id: ventureId, titulo: titulo.trim(), tipo: tipo || null, campos_json: campos as never,
  } as never).select("id").single();
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${ventureId}`);
  return { id: (data as { id: string }).id };
}

export async function updateIdea(id: string, ventureId: string, titulo: string, campos: IdeaCampo[]) {
  if (!titulo.trim()) return { error: "El título es obligatorio." };
  const supabase = await createClient();
  const { error } = await supabase.from("venture_ideas")
    .update({ titulo: titulo.trim(), campos_json: campos as never } as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${ventureId}`);
  return { ok: true };
}

export async function deleteIdea(id: string, ventureId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("venture_ideas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${ventureId}`);
  return { ok: true };
}

export async function addReferencia(ventureId: string, imagePath: string, nota: string | null) {
  if (!imagePath) return { error: "Falta la imagen." };
  const supabase = await createClient();
  const { error } = await supabase.from("venture_referencias").insert({
    venture_id: ventureId, image_path: imagePath, nota: nota?.trim() || null,
  } as never);
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${ventureId}`);
  return { ok: true };
}

export async function updateReferenciaNota(id: string, ventureId: string, nota: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("venture_referencias").update({ nota: nota?.trim() || null } as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${ventureId}`);
  return { ok: true };
}

export async function deleteReferencia(id: string, ventureId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("venture_referencias").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${ventureId}`);
  return { ok: true };
}
