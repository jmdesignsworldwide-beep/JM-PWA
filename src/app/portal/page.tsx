import { redirect } from "next/navigation";
import {
  CircleDollarSign, FileText, FolderDown, AlertCircle, ListChecks, CheckCircle2,
} from "lucide-react";
import { getMyProfile } from "@/lib/data/profile";
import { getPortalData } from "@/lib/data/portal";
import { PortalHeader } from "@/components/portal/portal-header";
import { ContractSignCard } from "@/components/portal/contract-sign-card";
import { ProjectJourney } from "@/components/portal/project-journey";
import { UpdateFeed } from "@/components/portal/update-feed";
import { PortalPush } from "@/components/portal/portal-push";
import { PortalBottomNav } from "@/components/portal/portal-bottom-nav";
import { AuroraBackground } from "@/components/animations/aurora-background";
import { BlurInText } from "@/components/animations/blur-in-text";
import { Badge } from "@/components/ui/badge";
import { money, fechaCorta } from "@/lib/format";

export const metadata = { title: "Mi proyecto" };

export default async function PortalPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/portal/login");
  if (profile.rol !== "cliente") redirect("/"); // staff no usa el portal
  if (!profile.client_id) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-muted-foreground">
        Tu cuenta aún no está ligada a un proyecto. Contacta a JM Designs.
      </div>
    );
  }

  const d = await getPortalData(profile.client_id);
  const porFirmar = d.contracts.filter((c) => c.estado === "enviado");

  const pendientes: string[] = [];
  if (porFirmar.length > 0) pendientes.push("Aprobar y firmar tu contrato");
  if (d.totals.saldo > 0) pendientes.push(`Pago pendiente de ${money(d.totals.saldo, d.invoices[0]?.moneda ?? "DOP")}`);

  return (
    <div className="relative min-h-dvh">
      <AuroraBackground className="opacity-60" />
      <PortalHeader brandName={d.brandName} />

      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 pb-bottomnav sm:px-6 sm:pb-8">
        {/* Bienvenida personal */}
        <div>
          <BlurInText as="h1" text={`Bienvenido, ${d.client?.nombre ?? ""} 👋`} className="block text-2xl font-semibold tracking-tight sm:text-3xl" />
          <p className="mt-1 text-sm text-muted-foreground">
            Así va tu proyecto con <span className="text-gradient font-medium">{d.brandName ?? "JM Designs"}</span>. Bienvenido a tu espacio.
          </p>
        </div>

        {/* Journey visual — el corazón del portal */}
        <div id="journey" className="scroll-mt-20">
          <ProjectJourney milestones={d.milestones} progreso={d.progreso} step={d.step} celebrateId={d.celebrateId} />
        </div>

        {/* Aprobaciones (un toque) */}
        {porFirmar.map((c) => (
          <ContractSignCard
            key={c.id}
            contract={{ id: c.id, contenido: c.contenido }}
            clientName={`${d.client?.nombre ?? ""} ${d.client?.apellido ?? ""}`.trim()}
          />
        ))}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Feed de avances */}
          <UpdateFeed updates={d.updates} />

          {/* Pendiente de tu parte */}
          <Card icon={<ListChecks className="size-4 text-electric" />} title="Pendiente de tu parte">
            {pendientes.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-sm text-success">
                <CheckCircle2 className="size-5" /> Nada pendiente de tu parte. 🎉
              </div>
            ) : (
              <ul className="space-y-2">
                {pendientes.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm">
                    <AlertCircle className="size-4 text-warning" /> {p}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Facturas y saldo */}
          <Card id="facturas" icon={<CircleDollarSign className="size-4 text-success" />} title="Tus facturas y saldo">
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Facturado" value={money(d.totals.facturado, "DOP")} />
              <Stat label="Pagado" value={money(d.totals.pagado, "DOP")} />
              <Stat label="Saldo" value={money(d.totals.saldo, "DOP")} highlight />
            </div>
            {d.invoices.length === 0 ? <Empty text="Aún no hay facturas." /> : (
              <ul className="space-y-2">
                {d.invoices.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <span>{fechaCorta(i.fecha)}</span>
                    <Badge dot={i.estado_pago === "pagado" ? "var(--success)" : "var(--warning)"}>{i.estado_pago}</Badge>
                    <span className="font-medium">{money(i.total, i.moneda)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Documentos / entregables */}
          <Card id="documentos" icon={<FolderDown className="size-4 text-electric" />} title="Tus documentos">
            {d.files.length === 0 ? <Empty text="Aún no hay documentos compartidos." /> : (
              <ul className="space-y-2">
                {d.files.map((f) => (
                  <li key={f.id}>
                    <a href={f.file_url ?? "#"} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-accent">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{f.tipo ?? "Documento"}</span>
                      <FolderDown className="size-4 text-electric" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Activar notificaciones */}
        <PortalPush />
      </main>

      <PortalBottomNav />
    </div>
  );
}

function Card({ id, icon, title, children }: { id?: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        {icon}<h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border border-border p-2.5 ${highlight ? "bg-accent/40" : ""}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "text-gradient" : ""}`}>{value}</p>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{text}</p>;
}
