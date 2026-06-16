import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type TeamMember = Row<"team_members">;
export type Task = Row<"tasks">;
export type TeamPayment = Row<"team_payments">;

export type MemberSaldo = TeamMember & {
  acordado: number; // suma de tareas HECHAS
  pagado: number;
  saldo: number; // acordado - pagado (lo que Marien le debe)
};

/** Calcula saldos por miembro (acordado de tareas hechas, pagado, saldo). */
async function computeSaldos(): Promise<Map<string, { acordado: number; pagado: number }>> {
  const supabase = await createClient();
  const [tasks, pays] = await Promise.all([
    supabase.from("tasks").select("team_member_id, monto, estado").eq("estado", "hecha"),
    supabase.from("team_payments").select("team_member_id, monto"),
  ]);
  const map = new Map<string, { acordado: number; pagado: number }>();
  for (const t of (tasks.data ?? []) as { team_member_id: string | null; monto: number }[]) {
    if (!t.team_member_id) continue;
    const e = map.get(t.team_member_id) ?? { acordado: 0, pagado: 0 };
    e.acordado += Number(t.monto); map.set(t.team_member_id, e);
  }
  for (const p of (pays.data ?? []) as { team_member_id: string; monto: number }[]) {
    const e = map.get(p.team_member_id) ?? { acordado: 0, pagado: 0 };
    e.pagado += Number(p.monto); map.set(p.team_member_id, e);
  }
  return map;
}

export async function getTeamMembers(): Promise<MemberSaldo[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("team_members").select("*").order("nombre");
  const saldos = await computeSaldos();
  return ((data ?? []) as TeamMember[]).map((m) => {
    const s = saldos.get(m.id) ?? { acordado: 0, pagado: 0 };
    return { ...m, acordado: s.acordado, pagado: s.pagado, saldo: s.acordado - s.pagado };
  });
}

/** Personas con saldo pendiente (lo más urgente arriba). */
export async function getDebts(): Promise<MemberSaldo[]> {
  return (await getTeamMembers()).filter((m) => m.saldo > 0).sort((a, b) => b.saldo - a.saldo);
}

export async function getMemberFull(id: string) {
  const supabase = await createClient();
  const { data: member } = await supabase.from("team_members").select("*").eq("id", id).maybeSingle();
  if (!member) return null;

  const [tasksR, paysR] = await Promise.all([
    supabase.from("tasks").select("*").eq("team_member_id", id).order("created_at", { ascending: false }),
    supabase.from("team_payments").select("*").eq("team_member_id", id).order("fecha", { ascending: false }),
  ]);
  const tasks = (tasksR.data ?? []) as Task[];
  const pays = (paysR.data ?? []) as TeamPayment[];
  const acordado = tasks.filter((t) => t.estado === "hecha").reduce((s, t) => s + Number(t.monto), 0);
  const pagado = pays.reduce((s, p) => s + Number(p.monto), 0);

  return {
    member: member as TeamMember,
    tasks,
    payments: pays,
    totals: { acordado, pagado, saldo: acordado - pagado, acordadoTotal: tasks.reduce((s, t) => s + Number(t.monto), 0) },
  };
}

/** Todas las tareas con nombre de persona y de proyecto (para el tablero). */
export async function getTasksBoard() {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
  const tasks = (data ?? []) as Task[];

  const memberIds = [...new Set(tasks.map((t) => t.team_member_id).filter(Boolean))] as string[];
  const projIds = [...new Set(tasks.map((t) => t.project_id).filter(Boolean))] as string[];
  const [mem, proj] = await Promise.all([
    memberIds.length ? supabase.from("team_members").select("id, nombre, whatsapp").in("id", memberIds) : Promise.resolve({ data: [] }),
    projIds.length ? supabase.from("projects").select("id, nombre").in("id", projIds) : Promise.resolve({ data: [] }),
  ]);
  const mMap = new Map((mem.data ?? []).map((m) => [m.id, m]));
  const pMap = new Map((proj.data ?? []).map((p) => [p.id, p]));
  return tasks.map((t) => ({
    ...t,
    miembro: t.team_member_id ? mMap.get(t.team_member_id) ?? null : null,
    proyectoNombre: t.project_id ? pMap.get(t.project_id)?.nombre ?? null : null,
  }));
}

export async function getTeamOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("team_members").select("id, nombre").eq("activo", true).order("nombre");
  return (data ?? []) as { id: string; nombre: string }[];
}
