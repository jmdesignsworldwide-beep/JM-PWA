import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PendientesTabs } from "@/components/pendientes/pendientes-tabs";
import { getMyTodos, getVentureTodos } from "@/lib/data/todos";
import { getVentures, getVentureFileUrl } from "@/lib/data/ventures";
import { getMyProfile } from "@/lib/data/profile";

export const metadata = { title: "Mis pendientes" };

export default async function PendientesPage() {
  const profile = await getMyProfile();
  if (profile?.rol !== "owner") redirect("/");

  const [todos, ventures] = await Promise.all([getMyTodos(), getVentures()]);

  // Enriquecer cada proyecto con su logo firmado + cuántos pendientes tiene.
  const cards = await Promise.all(
    ventures.map(async (v) => {
      const [logoUrl, vt] = await Promise.all([
        getVentureFileUrl(v.logo_path),
        getVentureTodos(v.id),
      ]);
      const abiertos = vt.filter((t) => !t.hecho);
      return { ...v, logoUrl, pendientes: abiertos.length, todosAbiertos: abiertos };
    }),
  );

  return (
    <>
      <PageHeader title="Mis pendientes" subtitle="Tu lista personal y tus proyectos en incubación. Solo tú los ves." />
      <PendientesTabs todos={todos} ventures={cards} />
    </>
  );
}
