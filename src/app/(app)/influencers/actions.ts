"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InfluencerEstado } from "@/lib/influencers";

export type InfluencerInput = {
  nombre: string;
  ig_url?: string | null; ig_handle?: string | null;
  tiene_whatsapp?: boolean; whatsapp?: string | null;
  tiene_correo?: boolean; correo?: string | null;
  tiene_manager?: boolean; empresa?: string | null; manager_nombre?: string | null;
  empresa_whatsapp?: string | null; empresa_correo?: string | null;
  estado?: InfluencerEstado; notas?: string | null; brand_id?: string | null;
};

export async function createInfluencer(input: InfluencerInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("influencers").insert({ ...input, estado: input.estado ?? "nuevo" });
  if (error) return { error: error.message };
  revalidatePath("/influencers");
  return { ok: true };
}

export async function updateInfluencer(id: string, input: Partial<InfluencerInput>) {
  const supabase = await createClient();
  const { error } = await supabase.from("influencers").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/influencers");
  return { ok: true };
}

export async function updateInfluencerStage(id: string, estado: InfluencerEstado) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { estado };
  // Sella fechas según el avance.
  const hoy = new Date().toISOString().slice(0, 10);
  if (estado === "escrito") patch.fecha_escrito = hoy;
  if (["respondio", "negociando", "acuerdo"].includes(estado)) patch.fecha_respondio = hoy;
  if (estado === "acuerdo") patch.fecha_acuerdo = hoy;
  const { error } = await supabase.from("influencers").update(patch as never).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/influencers");
  return { ok: true };
}

/** Campaña por correo a influencers seleccionados (Resend). */
export async function sendEmailCampaign(input: { asunto: string; mensaje: string; influencerIds: string[] }) {
  const supabase = await createClient();
  const { data: infs } = await supabase
    .from("influencers")
    .select("nombre, correo")
    .in("id", input.influencerIds)
    .eq("tiene_correo", true);
  const destinatarios = ((infs ?? []) as { nombre: string; correo: string | null }[])
    .filter((i) => i.correo)
    .map((i) => ({ nombre: i.nombre, correo: i.correo as string }));

  if (destinatarios.length === 0) return { error: "Ninguno de los seleccionados tiene correo." };

  // Registrar la campaña siempre.
  await supabase.from("email_campaigns").insert({
    asunto: input.asunto, mensaje: input.mensaje,
    destinatarios_json: destinatarios as never, fecha: new Date().toISOString().slice(0, 10),
  });

  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("tu-")) {
    revalidatePath("/influencers");
    return { ok: true, enviados: 0, registrados: destinatarios.length, aviso: "Campaña registrada. Configura RESEND_API_KEY para enviar de verdad." };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const from = process.env.RESEND_FROM || "JM Designs <onboarding@resend.dev>";
    let enviados = 0;
    for (const d of destinatarios) {
      const cuerpo = input.mensaje.replace(/\{nombre\}/g, d.nombre);
      const { error } = await resend.emails.send({ from, to: d.correo, subject: input.asunto, text: cuerpo });
      if (!error) enviados++;
    }
    revalidatePath("/influencers");
    return { ok: true, enviados, registrados: destinatarios.length };
  } catch (e) {
    return { error: `Error enviando: ${e instanceof Error ? e.message : "?"}` };
  }
}
