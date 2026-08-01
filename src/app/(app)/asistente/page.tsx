import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { AsistenteChat } from "@/components/asistente/asistente-chat";
import { getMyProfile } from "@/lib/data/profile";

export const metadata = { title: "Asistente" };

export default async function AsistentePage() {
  const profile = await getMyProfile();
  if (profile?.rol !== "owner") redirect("/");

  return (
    <>
      <PageHeader title="Asistente" subtitle="Pregúntame lo que sea de tu negocio — respondo con tus datos reales." />
      <div className="mx-auto flex h-[70dvh] max-w-2xl flex-col rounded-2xl border border-border bg-card/60 p-4">
        <AsistenteChat />
      </div>
    </>
  );
}
