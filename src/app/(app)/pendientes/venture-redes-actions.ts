"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { VenturePerfil } from "@/lib/ventures";

type RedTipo = "instagram" | "facebook" | "tiktok" | "whatsapp" | "web";

const RED_LABEL: Record<RedTipo, string> = {
  instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", whatsapp: "WhatsApp", web: "Página web",
};

/**
 * Auto-pendiente "Crear [red] de [proyecto]" mientras la red no esté hecha.
 * Se borra en cuanto se marca hecha. auto_key = red:<tipo> (único por proyecto).
 */
async function syncRedTodo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ventureId: string, tipo: RedTipo, hecha: boolean,
) {
  const key = `red:${tipo}`;
  if (hecha) {
    await supabase.from("personal_todos").delete().eq("venture_id", ventureId).eq("auto_key", key);
    return;
  }
  const { data: v } = await supabase.from("ventures").select("nombre").eq("id", ventureId).maybeSingle();
  const nombre = (v as { nombre: string } | null)?.nombre ?? "proyecto";
  const { data: existe } = await supabase
    .from("personal_todos").select("id").eq("venture_id", ventureId).eq("auto_key", key).maybeSingle();
  if (!existe) {
    await supabase.from("personal_todos").insert(
      { texto: `Crear ${RED_LABEL[tipo]} de ${nombre}`, venture_id: ventureId, origen: "auto", auto_key: key } as never,
    );
  }
}

export async function addVentureRed(ventureId: string, tipo: RedTipo, hecha: boolean, url: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("venture_redes").insert(
    { venture_id: ventureId, tipo, hecha, url: url?.trim() || null } as never,
  );
  if (error) return { error: error.message };
  await syncRedTodo(supabase, ventureId, tipo, hecha);
  revalidatePath(`/proyectos/${ventureId}`);
  revalidatePath("/pendientes");
  return { ok: true };
}

export async function updateVentureRed(id: string, ventureId: string, tipo: RedTipo, hecha: boolean, url: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("venture_redes")
    .update({ hecha, url: url?.trim() || null } as never).eq("id", id);
  if (error) return { error: error.message };
  await syncRedTodo(supabase, ventureId, tipo, hecha);
  revalidatePath(`/proyectos/${ventureId}`);
  revalidatePath("/pendientes");
  return { ok: true };
}

export async function deleteVentureRed(id: string, ventureId: string, tipo: RedTipo) {
  const supabase = await createClient();
  const { error } = await supabase.from("venture_redes").delete().eq("id", id);
  if (error) return { error: error.message };
  // Al quitar la red, también se retira su auto-pendiente.
  await supabase.from("personal_todos").delete().eq("venture_id", ventureId).eq("auto_key", `red:${tipo}`);
  revalidatePath(`/proyectos/${ventureId}`);
  revalidatePath("/pendientes");
  return { ok: true };
}

/** Guarda tipo (online/físico) + la encuesta que aplica (en perfil_json). */
export async function saveVenturePerfil(ventureId: string, tipo: "online" | "fisico" | null, perfil: VenturePerfil) {
  const supabase = await createClient();
  const { error } = await supabase.from("ventures")
    .update({ tipo, perfil_json: perfil as never } as never).eq("id", ventureId);
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${ventureId}`);
  return { ok: true };
}
