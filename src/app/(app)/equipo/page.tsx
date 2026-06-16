import { PageHeader } from "@/components/layout/page-header";
import { EquipoView } from "@/components/equipo/equipo-view";
import { getTeamMembers, getDebts, getTasksBoard } from "@/lib/data/equipo";
import { getBrands } from "@/lib/data/clients";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Equipo / Tareas" };

export default async function EquipoPage() {
  const supabase = await createClient();
  const [members, debts, tasks, brands, projs] = await Promise.all([
    getTeamMembers(), getDebts(), getTasksBoard(), getBrands(),
    supabase.from("projects").select("id, nombre").order("created_at", { ascending: false }).limit(100),
  ]);
  const projects = ((projs.data ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Proyecto" }));

  return (
    <>
      <PageHeader title="Equipo / Tareas" subtitle="Asigna tareas con su pago, registra lo que pagas y mira a quién le debes." />
      <EquipoView members={members} tasks={tasks} debts={debts} projects={projects} brands={brands} />
    </>
  );
}
