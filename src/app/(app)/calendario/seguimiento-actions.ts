"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function reval() {
  revalidatePath("/calendario");
  revalidatePath("/pendientes");
  revalidatePath("/");
}

/**
 * "Sí, ya lo hice": marca el evento como completado y lo saca del ciclo de
 * reproches. La notificación desaparece de la campana.
 */
export async function confirmarEventoHecho(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .update({ completado: true, seguimiento_activo: false } as never)
    .eq("id", id)
    .is("recurrence", null); // solo eventos concretos entran al seguimiento
  if (error) return { error: error.message };
  reval();
  return { ok: true };
}

/**
 * "No, muévelo": reprograma el evento a otra fecha (hoy u otra) y REINICIA el
 * ciclo desde esa fecha nueva (se vuelve a preguntar 3x ese día, luego +15).
 */
export async function moverEventoVencido(id: string, fecha: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha inválida." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .update({
      fecha,
      completado: false,
      seguimiento_activo: true,
      seguimiento_prox: null, // se vuelve a sembrar cuando la fecha nueva venza
      seguimiento_ultimo_aviso: null,
    } as never)
    .eq("id", id)
    .is("recurrence", null);
  if (error) return { error: error.message };
  reval();
  return { ok: true };
}
