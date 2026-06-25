import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { WelcomeOverlay } from "@/components/brand/welcome-overlay";
import { getAlerts } from "@/lib/data/agenda";
import { getMyProfile } from "@/lib/data/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensa en profundidad (además del middleware).
  if (!user) redirect("/login");

  // Los clientes y colaboradores NO entran al back-office.
  const profile = await getMyProfile();
  if (profile?.rol === "cliente") redirect("/portal");
  if (profile?.rol === "equipo") redirect("/trabajo");

  const alerts = await getAlerts();
  const nombre = (profile?.nombre?.trim() || user.email?.split("@")[0] || "de nuevo").split(" ")[0];
  const { data: settings } = await supabase
    .from("app_settings").select("modulos_ocultos").eq("id", "global").maybeSingle();
  const hiddenModules = (settings?.modulos_ocultos as string[] | null) ?? [];

  return (
    <>
      <WelcomeOverlay greeting="Bienvenido de nuevo," name={nombre} sub="Tu centro de mando está listo." />
      <AppShell email={user.email ?? "usuario"} alerts={alerts} hiddenModules={hiddenModules} isOwner={profile?.rol === "owner"}>
        {children}
      </AppShell>
    </>
  );
}
