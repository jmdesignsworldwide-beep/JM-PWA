import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type Venture = Row<"ventures">;
export type VentureRed = Row<"venture_redes">;

/** Redes de un proyecto. */
export async function getVentureRedes(ventureId: string): Promise<VentureRed[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("venture_redes").select("*").eq("venture_id", ventureId)
    .order("created_at", { ascending: true });
  return (data ?? []) as VentureRed[];
}

/** Proyectos propios (incubadora) del owner. Más recientes primero. */
export async function getVentures(): Promise<Venture[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventures")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Venture[];
}

export async function getVentureById(id: string): Promise<Venture | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("ventures").select("*").eq("id", id).maybeSingle();
  return (data as Venture) ?? null;
}

/** URL firmada (temporal) para un archivo del bucket privado `ventures`. */
export async function getVentureFileUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  // El path guardado es "ventures/<archivo>"; el bucket es la primera parte.
  const clean = path.startsWith("ventures/") ? path.slice("ventures/".length) : path;
  const { data } = await supabase.storage.from("ventures").createSignedUrl(clean, 60 * 60);
  return data?.signedUrl ?? null;
}
