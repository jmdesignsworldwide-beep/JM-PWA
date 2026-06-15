import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { getAlerts } from "@/lib/data/agenda";

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

  const alerts = await getAlerts();

  return (
    <AppShell email={user.email ?? "usuario"} alerts={alerts}>
      {children}
    </AppShell>
  );
}
