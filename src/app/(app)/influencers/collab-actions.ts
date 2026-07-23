"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ColabEstado } from "@/lib/influencers";

export type PromoSimple = { tipo: string; cantidad: number; plataforma: string };

export type CollaborationInput = {
  brand_id?: string | null;
  estado?: ColabEstado;
  doy_tipo?: string | null;
  doy_desc?: string | null;
  promos?: PromoSimple[];
  notas?: string | null;
};

export async function createCollaboration(influencerId: string, input: CollaborationInput) {
  const supabase = await createClient();
  const { error, data } = await supabase
    .from("collaborations")
    .insert({ ...input, influencer_id: influencerId, estado: input.estado ?? "acordado" } as never)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/influencers/${influencerId}`);
  revalidatePath("/influencers");
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateCollaboration(id: string, influencerId: string, input: CollaborationInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("collaborations").update(input as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/influencers/${influencerId}`);
  revalidatePath("/influencers");
  return { ok: true };
}

export async function updateCollaborationEstado(id: string, influencerId: string, estado: ColabEstado) {
  const supabase = await createClient();
  const { error } = await supabase.from("collaborations").update({ estado } as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/influencers/${influencerId}`);
  revalidatePath("/influencers");
  return { ok: true };
}

export async function deleteCollaboration(id: string, influencerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("collaborations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/influencers/${influencerId}`);
  revalidatePath("/influencers");
  return { ok: true };
}
