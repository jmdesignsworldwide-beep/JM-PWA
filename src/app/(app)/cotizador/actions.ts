"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/app/(app)/pedidos/actions";
import { MODULO_LABEL } from "@/lib/cotizador";

export type SaveQuoteInput = {
  client_id: string | null;
  rama: "designs" | "distribution";
  tipo_solucion?: string | null;
  industria?: string | null;
  modulos_json?: unknown[];
  items_json?: unknown[];
  notas?: string | null;
  precio_manual?: number | null;
  ai_generado?: boolean;
  brand_id?: string | null;
};

export async function saveQuote(input: SaveQuoteInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      ...input,
      modulos_json: (input.modulos_json ?? []) as never,
      items_json: (input.items_json ?? []) as never,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  if (input.client_id) revalidatePath(`/clientes/${input.client_id}`);
  revalidatePath("/cotizador");
  return { id: data.id };
}

/** Cero callejones: convierte una cotización guardada en un pedido real (Fase 4). */
export async function convertQuoteToOrder(quoteId: string) {
  const supabase = await createClient();
  const { data: q } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!q) return { error: "Cotización no encontrada" };
  if (!q.client_id) return { error: "La cotización no tiene cliente asignado" };

  let detalle: { producto: string; cantidad: number; precio_unitario: number; subtotal: number }[] = [];
  let subtotal = 0;

  if (q.rama === "distribution") {
    const items = (q.items_json as { producto?: string; cantidad?: number; precio_unitario?: number; subtotal?: number }[]) ?? [];
    detalle = items.map((it) => ({
      producto: it.producto ?? "Ítem",
      cantidad: it.cantidad ?? 1,
      precio_unitario: it.precio_unitario ?? 0,
      subtotal: it.subtotal ?? 0,
    }));
    subtotal = detalle.reduce((s, it) => s + it.subtotal, 0);
  } else {
    const mods = (q.modulos_json as string[]) ?? [];
    detalle = mods.map((id) => ({
      producto: MODULO_LABEL[id] ?? id,
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0,
    }));
    subtotal = q.precio_manual ?? 0;
  }

  const total = q.precio_manual ?? subtotal;

  const res = await createOrder({
    client_id: q.client_id,
    rama: (q.rama as "designs" | "distribution") ?? "designs",
    moneda: "DOP",
    industria: q.industria,
    tipo_solucion: q.tipo_solucion,
    detalle_json: detalle,
    items: q.rama === "distribution" ? detalle : undefined,
    subtotal,
    descuento: 0,
    aplica_itbis: false,
    itbis: 0,
    total,
    fecha_entrega: null,
    plan_pago: [],
    brand_id: q.brand_id,
  });

  return res;
}
