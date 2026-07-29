import { notFound, redirect } from "next/navigation";
import { VentureDetail } from "@/components/ventures/venture-detail";
import { getVentureById, getVentureFileUrl, getVentureRedes } from "@/lib/data/ventures";
import { getVentureTodos } from "@/lib/data/todos";
import { getMyProfile } from "@/lib/data/profile";

export const metadata = { title: "Proyecto" };

export default async function VenturePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getMyProfile();
  if (profile?.rol !== "owner") redirect("/");
  const { id } = await params;

  const venture = await getVentureById(id);
  if (!venture) notFound();

  const [logoUrl, todos, redes] = await Promise.all([
    getVentureFileUrl(venture.logo_path),
    getVentureTodos(id),
    getVentureRedes(id),
  ]);

  return <VentureDetail venture={venture} logoUrl={logoUrl} todos={todos} redes={redes} />;
}
