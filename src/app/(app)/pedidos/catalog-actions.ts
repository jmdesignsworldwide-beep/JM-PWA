"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CatalogItemInput = {
  nombre: string;
  precio_base?: number | null;
  categoria?: string | null;
  unidad?: string | null;
  moneda?: "DOP" | "USD";
};

/** Agrega un ítem al catálogo de una marca (para el flujo Nuevo pedido). */
export async function addCatalogItem(brandId: string, input: CatalogItemInput) {
  if (!brandId) return { error: "Elige primero la marca." };
  if (!input.nombre?.trim()) return { error: "El nombre del ítem es obligatorio." };
  const supabase = await createClient();

  // orden = al final de la lista de esa marca.
  const { data: last } = await supabase
    .from("catalog_items").select("orden").eq("brand_id", brandId)
    .order("orden", { ascending: false }).limit(1).maybeSingle();
  const orden = (((last as { orden: number } | null)?.orden ?? 0)) + 1;

  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      brand_id: brandId,
      nombre: input.nombre.trim(),
      precio_base: input.precio_base ?? 0,
      categoria: input.categoria?.trim() || null,
      unidad: input.unidad?.trim() || null,
      moneda: input.moneda ?? "DOP",
      orden,
    } as never)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/pedidos/nuevo");
  return { id: data.id };
}

/** Borra un ítem del catálogo de una marca. */
export async function deleteCatalogItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/pedidos/nuevo");
  return { ok: true };
}
