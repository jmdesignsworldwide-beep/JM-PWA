import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type SystemAccount = Row<"system_accounts">;
export type SystemProject = Row<"system_projects">;

/** Proyecto para la vista (sin exponer la nota protegida: solo si existe). */
export type ProjectView = {
  id: string; account_id: string | null; nombre: string;
  tipo: SystemProject["tipo"]; referencia: string | null; estado: SystemProject["estado"];
  notas: string | null; tieneProtegida: boolean;
};

export type AccountView = {
  id: string; correo: string; etiqueta: string | null; capacidad: number;
  notas: string | null; tieneProtegida: boolean;
  proyectos: ProjectView[];
  usados: number;   // proyectos NO archivados
  libres: number;   // capacidad − usados
};

const A_COLS = "id, correo, etiqueta, capacidad, notas, notas_protegidas, created_at";
const P_COLS = "id, account_id, nombre, tipo, referencia, estado, notas, notas_protegidas, created_at";

/** La nota protegida NUNCA sale al cliente: se mapea a un booleano de presencia. */
function toProjectView(p: SystemProject): ProjectView {
  return { id: p.id, account_id: p.account_id, nombre: p.nombre, tipo: p.tipo, referencia: p.referencia, estado: p.estado, notas: p.notas, tieneProtegida: !!p.notas_protegidas };
}

/** Mapa completo: cuentas con sus proyectos, slots calculados, + sin asignar. */
export async function getSystemMap(): Promise<{ accounts: AccountView[]; sinAsignar: ProjectView[]; resumen: { correos: number; usados: number; libres: number } }> {
  const supabase = await createClient();
  const [accRes, projRes] = await Promise.all([
    supabase.from("system_accounts").select(A_COLS).order("etiqueta", { ascending: true }),
    supabase.from("system_projects").select(P_COLS).order("created_at", { ascending: true }),
  ]);
  const accounts = (accRes.data ?? []) as SystemAccount[];
  const projects = (projRes.data ?? []) as SystemProject[];

  const byAccount = new Map<string, ProjectView[]>();
  const sinAsignar: ProjectView[] = [];
  for (const p of projects) {
    const view = toProjectView(p);
    if (p.account_id) (byAccount.get(p.account_id) ?? byAccount.set(p.account_id, []).get(p.account_id)!).push(view);
    else sinAsignar.push(view);
  }

  const views: AccountView[] = accounts.map((a) => {
    const proyectos = byAccount.get(a.id) ?? [];
    const usados = proyectos.filter((p) => p.estado !== "archivado").length;
    return {
      id: a.id, correo: a.correo, etiqueta: a.etiqueta, capacidad: a.capacidad,
      notas: a.notas, tieneProtegida: !!a.notas_protegidas,
      proyectos, usados, libres: Math.max(0, a.capacidad - usados),
    };
  });

  const resumen = {
    correos: views.length,
    usados: views.reduce((s, a) => s + a.usados, 0),
    libres: views.reduce((s, a) => s + a.libres, 0),
  };
  return { accounts: views, sinAsignar, resumen };
}

/** Detalle de una cuenta (con sus proyectos). */
export async function getSystemAccount(id: string): Promise<AccountView | null> {
  const supabase = await createClient();
  const [{ data: acc }, { data: projs }] = await Promise.all([
    supabase.from("system_accounts").select(A_COLS).eq("id", id).maybeSingle(),
    supabase.from("system_projects").select(P_COLS).eq("account_id", id).order("created_at", { ascending: true }),
  ]);
  if (!acc) return null;
  const a = acc as SystemAccount;
  const proyectos = ((projs ?? []) as SystemProject[]).map(toProjectView);
  const usados = proyectos.filter((p) => p.estado !== "archivado").length;
  return { id: a.id, correo: a.correo, etiqueta: a.etiqueta, capacidad: a.capacidad, notas: a.notas, tieneProtegida: !!a.notas_protegidas, proyectos, usados, libres: Math.max(0, a.capacidad - usados) };
}

/** Cuentas con al menos un slot libre (para el aviso al bloquear). */
export async function getCuentasConEspacio(): Promise<{ etiqueta: string; libres: number }[]> {
  const { accounts } = await getSystemMap();
  return accounts.filter((a) => a.libres > 0).map((a) => ({ etiqueta: a.etiqueta ?? a.correo, libres: a.libres }));
}
