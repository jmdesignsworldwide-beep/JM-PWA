import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type Todo = Row<"personal_todos">;

/** Mis pendientes PERSONALES (sin proyecto). Pendientes primero. */
export async function getMyTodos(): Promise<Todo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("personal_todos")
    .select("*")
    .is("venture_id", null)
    .order("hecho", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as Todo[];
}

/** Pendientes de un proyecto (incubadora). Pendientes primero. */
export async function getVentureTodos(ventureId: string): Promise<Todo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("personal_todos")
    .select("*")
    .eq("venture_id", ventureId)
    .order("hecho", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as Todo[];
}
