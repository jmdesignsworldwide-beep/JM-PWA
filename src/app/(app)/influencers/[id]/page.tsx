import { notFound } from "next/navigation";
import { getInfluencerById, getCollaborationsByInfluencer } from "@/lib/data/influencers";
import { getBrands } from "@/lib/data/clients";
import { InfluencerDetail } from "@/components/influencers/influencer-detail";

export const metadata = { title: "Influencer" };

export default async function InfluencerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [influencer, brands] = await Promise.all([getInfluencerById(id), getBrands()]);
  if (!influencer) notFound();
  const collaborations = await getCollaborationsByInfluencer(id);

  return <InfluencerDetail influencer={influencer} brands={brands} collaborations={collaborations} />;
}
