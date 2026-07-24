import { PageHeader } from "@/components/layout/page-header";
import { ClientsTable } from "@/components/clientes/clients-table";
import { getClients, getBrands } from "@/lib/data/clients";

export const metadata = { title: "Clientes y Prospectos" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const initialEstado = estado === "lead" || estado === "activo" ? estado : "";
  const [clients, brands] = await Promise.all([getClients(), getBrands()]);

  return (
    <>
      <PageHeader
        title="Clientes y Prospectos"
        subtitle="Prospectos y clientes activos en un solo lugar. Filtra por estado; convierte un prospecto desde su ficha."
      />
      <ClientsTable clients={clients} brands={brands} initialEstado={initialEstado} />
    </>
  );
}
