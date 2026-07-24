"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NewLeadInput = {
  nombre: string;
  apellido?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  correo?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  direccion?: string | null;
  info_nota?: string | null;
  categoria_servicio?: "web" | "software" | "app" | "distribution" | null;
  industria?: string | null;
  lo_que_quiere?: string | null;
  fuente?: string | null;
  valor_estimado?: number | null;
  valor_estimado_moneda?: "DOP" | "USD";
  brand_id?: string | null;
  /** true = prospecto (por defecto); false = cliente activo directo. */
  es_lead?: boolean;
};

export async function createLead(input: NewLeadInput) {
  const supabase = await createClient();
  const { es_lead = true, ...rest } = input;
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...rest, es_lead, etapa_venta: es_lead ? "nuevo" : "ganado" })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { id: data.id };
}
