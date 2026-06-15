import { PageHeader } from "@/components/layout/page-header";
import { LeadsView } from "@/components/leads/leads-view";
import { getLeads, getBrands } from "@/lib/data/clients";

export const metadata = { title: "Leads / Ventas" };

export default async function LeadsPage() {
  const [leads, brands] = await Promise.all([getLeads(), getBrands()]);

  return (
    <>
      <PageHeader
        title="Leads / Ventas"
        subtitle="Pipeline inbound. Arrastra las tarjetas para mover de etapa."
      />
      <LeadsView leads={leads} brands={brands} />
    </>
  );
}
