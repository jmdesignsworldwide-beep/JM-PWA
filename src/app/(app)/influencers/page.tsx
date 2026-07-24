import { PageHeader } from "@/components/layout/page-header";
import { InfluencersView } from "@/components/influencers/influencers-view";
import { getInfluencers } from "@/lib/data/influencers";
import { getBrands } from "@/lib/data/clients";

export const metadata = { title: "Influencers" };

export default async function InfluencersPage() {
  const [influencers, brands] = await Promise.all([getInfluencers(), getBrands()]);

  return (
    <>
      <PageHeader
        title="Influencers"
        subtitle="Registra influencers y sus colaboraciones. Cambia el estado desde la lista o su ficha."
      />
      <InfluencersView influencers={influencers} brands={brands} />
    </>
  );
}
