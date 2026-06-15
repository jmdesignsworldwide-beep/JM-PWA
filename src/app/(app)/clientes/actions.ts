"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClientUpdate = {
  nombre?: string;
  apellido?: string | null;
  cedula?: string | null;
  factura_fiscal?: boolean;
  rnc?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  correo?: string | null;
  direccion?: string | null;
  info_nota?: string | null;
  categoria_servicio?: "web" | "software" | "ambos" | null;
  industria?: string | null;
  lo_que_quiere?: string | null;
  fuente?: string | null;
  valor_estimado?: number | null;
  valor_estimado_moneda?: "DOP" | "USD";
  brand_id?: string | null;
};

export async function updateClient(id: string, input: ClientUpdate) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/leads");
  return { ok: true };
}

/** Conversión manual Lead -> Cliente activo. */
export async function convertToActive(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ es_lead: false, etapa_venta: "ganado" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/leads");
  return { ok: true };
}
