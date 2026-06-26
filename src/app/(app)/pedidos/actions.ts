"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { money, fechaCorta } from "@/lib/format";

export type OrderItemInput = {
  producto?: string | null;
  categoria?: string | null;
  personalizacion?: string | null;
  metodo?: "unidad" | "tamano" | null;
  cantidad?: number;
  ancho?: number | null;
  alto?: number | null;
  precio_unitario?: number;
  subtotal?: number;
  diseno_por_jm?: boolean;
};

export type PlanPagoItem = { label: string; porcentaje: number; offset_dias: number };

export type NewOrderInput = {
  client_id: string;
  rama: "designs" | "distribution";
  moneda: "DOP" | "USD";
  industria?: string | null;
  tipo_solucion?: string | null;
  detalle_json: unknown[];
  items?: OrderItemInput[];
  subtotal: number;
  descuento: number;
  aplica_itbis: boolean;
  itbis: number;
  total: number;
  fecha_entrega?: string | null;
  plan_pago: PlanPagoItem[];
  brand_id?: string | null;
};

export async function createOrder(input: NewOrderInput) {
  const supabase = await createClient();
  const { items, ...orderFields } = input;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      ...orderFields,
      detalle_json: input.detalle_json as never,
      plan_pago: input.plan_pago as never,
      estado: "borrador",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (input.rama === "distribution" && items && items.length > 0) {
    const rows = items.map((it) => ({ ...it, order_id: order.id }));
    const { error: e2 } = await supabase.from("order_print_items").insert(rows);
    if (e2) return { error: e2.message };
  }

  revalidatePath(`/clientes/${input.client_id}`);
  return { id: order.id };
}

export async function addOrderNote(orderId: string, texto: string) {
  const supabase = await createClient();
  const t = texto.trim();
  if (!t) return { error: "Nota vacía" };
  const { error } = await supabase.from("order_notes").insert({ order_id: orderId, texto: t });
  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true };
}

export async function duplicateOrder(orderId: string) {
  const supabase = await createClient();
  const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!o) return { error: "Pedido no encontrado" };

  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    estado: _e,
    ...clone
  } = o as Record<string, unknown>;
  void _id; void _c; void _u; void _e;

  const { data: nuevo, error } = await supabase
    .from("orders")
    .insert({ ...clone, estado: "borrador" } as never)
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { data: items } = await supabase
    .from("order_print_items")
    .select("*")
    .eq("order_id", orderId);
  if (items && items.length) {
    const rows = items.map((it) => {
      const { id, created_at, updated_at, ...rest } = it as Record<string, unknown>;
      void id; void created_at; void updated_at;
      return { ...rest, order_id: nuevo.id };
    });
    await supabase.from("order_print_items").insert(rows as never);
  }

  revalidatePath(`/clientes/${o.client_id}`);
  return { id: nuevo.id };
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export async function generateContract(orderId: string) {
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return { error: "Pedido no encontrado" };

  // ¿Ya existe contrato para este pedido?
  const { data: existing } = await supabase
    .from("contracts")
    .select("id")
    .eq("order_id", orderId)
    .limit(1);
  if (existing && existing.length) return { id: existing[0].id };

  const { data: client } = await supabase.from("clients").select("*").eq("id", order.client_id).single();
  const { data: tpl } = await supabase
    .from("message_templates")
    .select("contenido")
    .eq("tipo", "contrato")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const items = (order.detalle_json as { producto?: string; concepto?: string; cantidad?: number; subtotal?: number }[]) ?? [];
  const detalle = items
    .map((i) => `• ${i.producto ?? i.concepto ?? "Ítem"}${i.cantidad ? ` x${i.cantidad}` : ""} — ${money(i.subtotal ?? 0, order.moneda)}`)
    .join("\n");

  const vars: Record<string, string> = {
    nombre: `${client?.nombre ?? ""} ${client?.apellido ?? ""}`.trim(),
    apellido: client?.apellido ?? "",
    cedula: client?.cedula ?? "—",
    rnc: client?.rnc ?? "—",
    detalle_pedido: detalle || "—",
    proyecto: order.tipo_solucion ?? (order.rama === "designs" ? "Proyecto de software/web" : "Pedido de imprenta"),
    subtotal: money(order.subtotal ?? 0, order.moneda),
    itbis: money(order.itbis ?? 0, order.moneda),
    total: money(order.total ?? 0, order.moneda),
    moneda: order.moneda,
    fecha_entrega: fechaCorta(order.fecha_entrega),
  };

  const base =
    tpl?.contenido ??
    "CONTRATO DE SERVICIOS\n\nCliente: {nombre} (Cédula/RNC: {cedula})\nProyecto: {proyecto}\n\nDetalle:\n{detalle_pedido}\n\nSubtotal: {subtotal}\nITBIS: {itbis}\nTOTAL: {total}\nEntrega estimada: {fecha_entrega}\n\n[Cláusulas editables...]";

  const contenido = renderTemplate(base, vars);

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      order_id: orderId,
      client_id: order.client_id,
      brand_id: order.brand_id,
      estado: "borrador",
      contenido,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/pedidos/${orderId}`);
  return { id: contract.id };
}

export async function updateContractContent(contractId: string, contenido: string, orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contracts").update({ contenido }).eq("id", contractId);
  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true };
}

export async function setContractStatus(
  contractId: string,
  estado: "borrador" | "enviado" | "aprobado_firmado",
  orderId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("contracts").update({ estado }).eq("id", contractId);
  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true };
}

/**
 * Sube un contrato firmado FUERA del sistema (PDF) y lo adjunta al pedido.
 * Si ya hay contrato para el pedido, le pega el PDF y lo marca firmado;
 * si no, crea uno nuevo ya firmado. Al quedar firmado, el trigger de la BD
 * genera la factura, el proyecto y las fechas (igual que el flujo interno).
 */
export async function uploadExternalContract(orderId: string, fileUrl: string) {
  const supabase = await createClient();
  if (!fileUrl) return { error: "Falta el archivo del contrato." };

  const { data: order } = await supabase.from("orders").select("client_id, brand_id").eq("id", orderId).maybeSingle();
  if (!order) return { error: "Pedido no encontrado" };

  const { data: existing } = await supabase
    .from("contracts").select("id").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1);

  if (existing && existing.length) {
    const { error } = await supabase
      .from("contracts")
      .update({ pdf_url: fileUrl, estado: "aprobado_firmado" })
      .eq("id", existing[0].id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("contracts").insert({
      order_id: orderId,
      client_id: order.client_id,
      brand_id: order.brand_id,
      estado: "aprobado_firmado",
      pdf_url: fileUrl,
      contenido: "Contrato firmado fuera del sistema (PDF adjunto).",
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/pedidos/${orderId}`);
  revalidatePath(`/clientes/${order.client_id}`);
  return { ok: true };
}

// ── Pagos / abonos del cliente (control de saldo) ───────────────────────────

export type PaymentInput = {
  order_id: string;
  monto: number;
  moneda: "DOP" | "USD";
  fecha: string;
  tipo: "inicial" | "entrega" | "abono";
  metodo?: string | null;
  nota?: string | null;
};

/** Registra un pago/abono contra un pedido. El saldo se recalcula solo. */
export async function addOrderPayment(input: PaymentInput) {
  const supabase = await createClient();
  if (!input.monto || input.monto <= 0) return { error: "Monto inválido." };

  const { data: order } = await supabase
    .from("orders").select("client_id").eq("id", input.order_id).maybeSingle();
  if (!order) return { error: "Pedido no encontrado" };

  const { error } = await supabase.from("order_payments").insert({
    order_id: input.order_id,
    client_id: order.client_id,
    monto: input.monto,
    moneda: input.moneda,
    fecha: input.fecha,
    tipo: input.tipo,
    metodo: input.metodo?.trim() || null,
    nota: input.nota?.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/pedidos/${input.order_id}`);
  revalidatePath(`/clientes/${order.client_id}`);
  return { ok: true };
}

/** Borra un pago/abono (corrige un error de captura). */
export async function deleteOrderPayment(id: string, orderId: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("order_payments").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${orderId}`);
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
