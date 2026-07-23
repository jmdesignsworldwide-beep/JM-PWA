import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SistemasView } from "@/components/sistemas/sistemas-view";
import { getMyProfile } from "@/lib/data/profile";
import { getSystemMap } from "@/lib/data/sistemas";

export const metadata = { title: "Sistemas" };

export default async function SistemasPage() {
  const profile = await getMyProfile();
  if (profile?.rol !== "owner") redirect("/");

  const { accounts, sinAsignar, resumen } = await getSystemMap();

  return (
    <>
      <PageHeader title="Control de Sistemas" subtitle="Mapa de tus cuentas de Supabase: qué correo tiene qué proyecto y cuántos slots quedan. No guarda contraseñas." />
      <SistemasView accounts={accounts} sinAsignar={sinAsignar} resumen={resumen} />
    </>
  );
}
