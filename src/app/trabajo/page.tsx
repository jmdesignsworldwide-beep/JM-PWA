import { EMPRESA } from "@/lib/empresa";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/profile";
import { getMemberFull } from "@/lib/data/equipo";
import { WorkerWorkspace } from "@/components/equipo/worker-workspace";

export const metadata = { title: "Mi trabajo" };

export default async function TrabajoPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  if (profile.rol === "owner" || profile.rol === "colaborador") redirect("/");
  if (profile.rol === "cliente") redirect("/portal");
  if (!profile.team_member_id) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-muted-foreground">
        Tu cuenta aún no está ligada a un perfil de equipo. Contacta a {EMPRESA.nombre}.
      </div>
    );
  }

  const data = await getMemberFull(profile.team_member_id);
  if (!data) {
    return <div className="flex min-h-dvh items-center justify-center p-6 text-muted-foreground">No se encontró tu perfil.</div>;
  }

  return (
    <WorkerWorkspace
      nombre={data.member.nombre}
      tasks={data.tasks}
      payments={data.payments}
      totals={{ acordado: data.totals.acordado, pagado: data.totals.pagado, saldo: data.totals.saldo }}
    />
  );
}
