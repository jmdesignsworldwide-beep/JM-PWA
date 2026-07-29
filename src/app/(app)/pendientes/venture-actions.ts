"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type VentureInput = {
  nombre: string;
  registrado?: boolean;
  logo_path?: string | null;
  descripcion?: string | null;
  correo?: string | null;
};

/** Pendiente automático "Subir/crear logo" mientras el proyecto no tenga logo. */
async function syncLogoTodo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ventureId: string, nombre: string, tieneLogo: boolean,
) {
  if (tieneLogo) {
    // Ya hay logo: quita el auto-pendiente si existía.
    await supabase.from("personal_todos").delete().eq("venture_id", ventureId).eq("auto_key", "logo");
    return;
  }
  // Falta logo: crea el pendiente solo si no existe ya (evita duplicados).
  const { data: existe } = await supabase
    .from("personal_todos").select("id").eq("venture_id", ventureId).eq("auto_key", "logo").maybeSingle();
  if (!existe) {
    await supabase.from("personal_todos").insert(
      { texto: `Subir/crear logo de ${nombre}`, venture_id: ventureId, origen: "auto", auto_key: "logo" } as never,
    );
  }
}

export async function createVenture(input: VentureInput) {
  if (!input.nombre?.trim()) return { error: "El nombre del proyecto es obligatorio." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ventures")
    .insert({
      nombre: input.nombre.trim(),
      registrado: !!input.registrado,
      logo_path: input.logo_path || null,
      descripcion: input.descripcion?.trim() || null,
      correo: input.correo?.trim() || null,
    } as never)
    .select("id")
    .single();
  if (error) return { error: error.message };
  const id = (data as { id: string }).id;
  await syncLogoTodo(supabase, id, input.nombre.trim(), !!input.logo_path);
  revalidatePath("/pendientes");
  return { id };
}

export async function updateVenture(id: string, input: VentureInput) {
  if (!input.nombre?.trim()) return { error: "El nombre del proyecto es obligatorio." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("ventures")
    .update({
      nombre: input.nombre.trim(),
      registrado: !!input.registrado,
      logo_path: input.logo_path || null,
      descripcion: input.descripcion?.trim() || null,
      correo: input.correo?.trim() || null,
    } as never)
    .eq("id", id);
  if (error) return { error: error.message };
  await syncLogoTodo(supabase, id, input.nombre.trim(), !!input.logo_path);
  revalidatePath("/pendientes");
  revalidatePath(`/proyectos/${id}`);
  return { ok: true };
}

export async function deleteVenture(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ventures").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/pendientes");
  return { ok: true };
}
