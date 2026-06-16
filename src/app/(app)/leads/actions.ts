"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EtapaVenta } from "@/lib/ventas";

export type NewLeadInput = {
  nombre: string;
  apellido?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  correo?: string | null;
  direccion?: string | null;
  info_nota?: string | null;
  categoria_servicio?: "web" | "software" | "app" | "distribution" | null;
  industria?: string | null;
  lo_que_quiere?: string | null;
  fuente?: string | null;
  valor_estimado?: number | null;
  valor_estimado_moneda?: "DOP" | "USD";
  brand_id?: string | null;
};

export async function createLead(input: NewLeadInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...input, es_lead: true, etapa_venta: "nuevo" })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/leads");
  revalidatePath("/clientes");
  return { id: data.id };
}

export async function updateLeadStage(id: string, etapa: EtapaVenta) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ etapa_venta: etapa })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/leads");
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}
