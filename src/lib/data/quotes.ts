import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type Quote = Row<"quotes">;
export type PrintProduct = Row<"print_products">;

export async function getPrintProducts(): Promise<PrintProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("print_products")
    .select("*")
    .eq("activo", true)
    .order("nombre");
  return (data ?? []) as PrintProduct[];
}

export async function getQuotes(): Promise<Quote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as Quote[];
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  return data as Quote | null;
}

/**
 * Resumen compacto de cotizaciones pasadas para dar contexto a la IA
 * (para que sugiera precios "como Marien"). Solo datos no sensibles.
 */
export async function getQuotesContext(limit = 25): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("rama, tipo_solucion, industria, modulos_json, precio_manual")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as {
    rama: string | null; tipo_solucion: string | null; industria: string | null;
    modulos_json: unknown; precio_manual: number | null;
  }[];

  if (rows.length === 0) return "No hay cotizaciones previas registradas.";

  return rows
    .filter((r) => r.precio_manual != null)
    .map((r) => {
      const mods = Array.isArray(r.modulos_json) ? (r.modulos_json as unknown[]).length : 0;
      return `- ${r.industria ?? "?"} / ${r.tipo_solucion ?? r.rama ?? "?"} · ${mods} módulos · RD$${r.precio_manual}`;
    })
    .join("\n");
}
