import { redirect, notFound } from "next/navigation";
import { getMyProfile } from "@/lib/data/profile";
import { getSystemAccount, getSystemMap } from "@/lib/data/sistemas";
import { AccountDetail } from "@/components/sistemas/account-detail";

export const metadata = { title: "Cuenta · Sistemas" };

export default async function SistemaAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getMyProfile();
  if (profile?.rol !== "owner") redirect("/");

  const { id } = await params;
  const [account, map] = await Promise.all([getSystemAccount(id), getSystemMap()]);
  if (!account) notFound();

  const cuentasConEspacio = map.accounts.filter((a) => a.libres > 0).map((a) => ({ id: a.id, nombre: a.etiqueta ?? a.correo, libres: a.libres }));
  return <AccountDetail account={account} cuentasConEspacio={cuentasConEspacio} />;
}
