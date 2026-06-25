import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { TodosList } from "@/components/pendientes/todos-list";
import { getMyTodos } from "@/lib/data/todos";
import { getMyProfile } from "@/lib/data/profile";

export const metadata = { title: "Mis pendientes" };

export default async function PendientesPage() {
  const profile = await getMyProfile();
  if (profile?.rol !== "owner") redirect("/");
  const todos = await getMyTodos();

  return (
    <>
      <PageHeader title="Mis pendientes" subtitle="Tu lista personal y privada. Solo tú la ves." />
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-5">
        <TodosList initial={todos} />
      </div>
    </>
  );
}
