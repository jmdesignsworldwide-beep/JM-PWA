import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type Todo = Row<"personal_todos">;

/** Mis pendientes (privados, RLS por usuario). Pendientes primero. */
export async function getMyTodos(): Promise<Todo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("personal_todos")
    .select("*")
    .order("hecho", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as Todo[];
}
