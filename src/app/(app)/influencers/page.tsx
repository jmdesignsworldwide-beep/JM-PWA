import { PageHeader } from "@/components/layout/page-header";
import { InfluencersView } from "@/components/influencers/influencers-view";
import { getInfluencers, getDMTemplates, getResponseRateByAgency } from "@/lib/data/influencers";
import { getBrands } from "@/lib/data/clients";

export const metadata = { title: "Influencers" };

export default async function InfluencersPage() {
  const [influencers, brands, responseRate, dmTemplates] = await Promise.all([
    getInfluencers(), getBrands(), getResponseRateByAgency(), getDMTemplates(),
  ]);

  return (
    <>
      <PageHeader
        title="Influencers"
        subtitle="CRM outbound (separado de Leads): pipeline, plantillas, campañas y tasa de respuesta."
      />
      <InfluencersView
        influencers={influencers}
        brands={brands}
        responseRate={responseRate}
        dmTemplates={dmTemplates.map((t) => ({ id: t.id, nombre: t.nombre, contenido: t.contenido }))}
      />
    </>
  );
}
