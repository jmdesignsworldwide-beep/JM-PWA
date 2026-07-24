import { createClient } from "@/lib/supabase/server";
import { rdToday } from "@/lib/fecha";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Un evento del calendario vencido que espera confirmación (¿lo hiciste?). */
export type SeguimientoEvento = {
  id: string;
  titulo: string | null;
  tipo: string | null;
  fecha: string;
  hora: string | null;
  client_id: string | null;
  cliente: string | null;
  /** Días que lleva vencido (para mostrar "vencido hace N días"). */
  diasVencido: number;
};

const COLS = "id, titulo, tipo, fecha, hora, client_id";

function diffDias(desde: string, hasta: string): number {
  const a = new Date(`${desde}T12:00:00Z`).getTime();
  const b = new Date(`${hasta}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Eventos CONCRETOS (no recurrentes) vencidos, sin completar y todavía en
 * seguimiento. El seguimiento es solo para eventos del calendario propios —
 * no toca "Mis pendientes" ni las tareas dentro de pedidos.
 */
export async function fetchSeguimientoVencidos(
  supabase: SupabaseClient,
  hoy: string,
): Promise<SeguimientoEvento[]> {
  const { data } = await supabase
    .from("calendar_events")
    .select(COLS)
    .is("recurrence", null)
    .eq("recurrence_skip", false)
    .eq("completado", false)
    .eq("seguimiento_activo", true)
    .lt("fecha", hoy)
    .order("fecha", { ascending: true });

  const rows = (data ?? []) as {
    id: string; titulo: string | null; tipo: string | null; fecha: string; hora: string | null; client_id: string | null;
  }[];
  if (rows.length === 0) return [];

  // Nombre del cliente (si el evento está ligado a uno).
  const ids = [...new Set(rows.map((r) => r.client_id).filter(Boolean))] as string[];
  const nameMap = new Map<string, string>();
  if (ids.length) {
    const { data: cls } = await supabase.from("clients").select("id, nombre, apellido").in("id", ids);
    for (const c of (cls ?? []) as { id: string; nombre: string; apellido: string | null }[]) {
      nameMap.set(c.id, `${c.nombre} ${c.apellido ?? ""}`.trim());
    }
  }

  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    tipo: r.tipo,
    fecha: r.fecha,
    hora: r.hora,
    client_id: r.client_id,
    cliente: r.client_id ? nameMap.get(r.client_id) ?? null : null,
    diasVencido: Math.max(0, diffDias(r.fecha, hoy)),
  }));
}

/** Seguimientos vencidos del owner para la campana (usa el cliente con sesión). */
export async function getSeguimientosVencidos(): Promise<SeguimientoEvento[]> {
  const supabase = await createClient();
  return fetchSeguimientoVencidos(supabase, rdToday());
}
