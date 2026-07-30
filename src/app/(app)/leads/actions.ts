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
  /** true = contacto Personal (no cliente/prospecto de negocio). */
  es_personal?: boolean;
  ocupacion?: string | null;
};

export async function createLead(input: NewLeadInput) {
  const supabase = await createClient();
  const { es_lead = true, es_personal = false, ...rest } = input;
  // Un Personal no es lead ni cliente de negocio.
  const esLeadFinal = es_personal ? false : es_lead;
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...rest, es_lead: esLeadFinal, es_personal, etapa_venta: esLeadFinal ? "nuevo" : "ganado" } as never)
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { id: data.id };
}
