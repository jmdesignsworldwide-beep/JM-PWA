import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type Influencer = Row<"influencers">;
export type DMTemplate = Row<"message_templates">;

export async function getInfluencers(): Promise<Influencer[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("influencers").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Influencer[];
}

export async function getInfluencerById(id: string): Promise<Influencer | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("influencers").select("*").eq("id", id).maybeSingle();
  return (data as Influencer) ?? null;
}

export async function getDMTemplates(): Promise<DMTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("message_templates").select("*").eq("tipo", "dm").order("nombre");
  return (data ?? []) as DMTemplate[];
}

export async function getEmailCampaigns() {
  const supabase = await createClient();
  const { data } = await supabase.from("email_campaigns").select("*").order("fecha", { ascending: false }).limit(20);
  return data ?? [];
}

/** Tasa de respuesta por agencia/empresa (manager). */
export async function getResponseRateByAgency() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("influencers")
    .select("empresa, tiene_manager, estado, fecha_escrito, fecha_respondio");
  const rows = (data ?? []) as {
    empresa: string | null; tiene_manager: boolean; estado: string;
    fecha_escrito: string | null; fecha_respondio: string | null;
  }[];

  const map: Record<string, { escritos: number; respondieron: number }> = {};
  for (const r of rows) {
    const agencia = r.tiene_manager && r.empresa ? r.empresa : "Independientes";
    map[agencia] ??= { escritos: 0, respondieron: 0 };
    if (r.fecha_escrito || r.estado !== "nuevo") map[agencia].escritos++;
    if (r.fecha_respondio || ["respondio", "negociando", "acuerdo"].includes(r.estado)) map[agencia].respondieron++;
  }
  return Object.entries(map)
    .map(([agencia, v]) => ({
      agencia,
      escritos: v.escritos,
      respondieron: v.respondieron,
      tasa: v.escritos > 0 ? Math.round((v.respondieron / v.escritos) * 100) : 0,
    }))
    .sort((a, b) => b.tasa - a.tasa);
}
