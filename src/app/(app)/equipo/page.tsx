import { PageHeader } from "@/components/layout/page-header";
import { EquipoView } from "@/components/equipo/equipo-view";
import { getTeamMembers } from "@/lib/data/equipo";
import { getBrands } from "@/lib/data/clients";

export const metadata = { title: "Equipo" };

export default async function EquipoPage() {
  const [members, brands] = await Promise.all([getTeamMembers(), getBrands()]);

  return (
    <>
      <PageHeader title="Equipo" subtitle="Tu gente: información y acceso. Las tareas van en cada pedido; lo que les debes, en Cobros." />
      <EquipoView members={members} brands={brands} />
    </>
  );
}
