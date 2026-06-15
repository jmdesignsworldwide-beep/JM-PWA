import { PageHeader } from "@/components/layout/page-header";
import { ClientsTable } from "@/components/clientes/clients-table";
import { getClients, getBrands } from "@/lib/data/clients";

export const metadata = { title: "Clientes y Proyectos" };

export default async function ClientesPage() {
  const [clients, brands] = await Promise.all([getClients(), getBrands()]);

  return (
    <>
      <PageHeader
        title="Clientes y Proyectos"
        subtitle="Leads y clientes activos. Todo fluye desde aquí."
      />
      <ClientsTable clients={clients} brands={brands} />
    </>
  );
}
