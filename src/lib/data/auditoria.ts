import { createClient } from "@/lib/supabase/server";

export type AuditRow = {
  id: string;
  accion: string;
  tabla: string;
  registro_id: string | null;
  contenido_json: unknown;
  usuario_id: string | null;
  fecha: string;
  usuarioNombre?: string | null;
};

export type AuditFilters = {
  accion?: string;
  tabla?: string;
  desde?: string;
  hasta?: string;
  q?: string;
};

export async function getAuditLog(filters: AuditFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, accion, tabla, registro_id, contenido_json, usuario_id, fecha")
    .order("fecha", { ascending: false })
    .limit(300);

  if (filters.accion) query = query.eq("accion", filters.accion);
  if (filters.tabla) query = query.eq("tabla", filters.tabla);
  if (filters.desde) query = query.gte("fecha", `${filters.desde}T00:00:00`);
  if (filters.hasta) query = query.lte("fecha", `${filters.hasta}T23:59:59`);
  if (filters.q) query = query.ilike("registro_id", `%${filters.q}%`);

  const { data } = await query;
  const rows = (data ?? []) as AuditRow[];

  // Nombres de usuario (owner puede leer users_profiles).
  const ids = [...new Set(rows.map((r) => r.usuario_id).filter(Boolean))] as string[];
  let nameMap = new Map<string, string>();
  if (ids.length) {
    const { data: us } = await supabase.from("users_profiles").select("id, nombre, correo").in("id", ids);
    nameMap = new Map((us ?? []).map((u) => [u.id, u.nombre || u.correo || u.id.slice(0, 8)]));
  }
  return rows.map((r) => ({ ...r, usuarioNombre: r.usuario_id ? nameMap.get(r.usuario_id) ?? "—" : "Sistema" }));
}

/** Lista de tablas presentes en el log (para el filtro). */
export async function getAuditTablas(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_log").select("tabla").limit(1000);
  return [...new Set(((data ?? []) as { tabla: string }[]).map((r) => r.tabla))].sort();
}
