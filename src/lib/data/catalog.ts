import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type CatalogItem = Row<"catalog_items">;

/** Catálogo activo de una marca (para el flujo Nuevo pedido). */
export async function getCatalogByBrand(brandId: string): Promise<CatalogItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("brand_id", brandId)
    .eq("activo", true)
    .order("orden", { ascending: true });
  return (data ?? []) as CatalogItem[];
}

/** Todo el catálogo (todas las marcas), para el flujo y el gestor. */
export async function getAllCatalog(): Promise<CatalogItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_items")
    .select("*")
    .order("brand_id", { ascending: true })
    .order("orden", { ascending: true });
  return (data ?? []) as CatalogItem[];
}
