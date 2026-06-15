import { redirect } from "next/navigation";
import {
  CircleDollarSign, FileText, Flag, ListChecks, FolderDown, AlertCircle,
} from "lucide-react";
import { getMyProfile } from "@/lib/data/profile";
import { getPortalData } from "@/lib/data/portal";
import { PortalHeader } from "@/components/portal/portal-header";
import { ContractSignCard } from "@/components/portal/contract-sign-card";
import { LifecycleBar } from "@/components/clientes/lifecycle-bar";
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
    <div className="min-h-dvh">
      <PortalHeader brandName={d.brandName} />

      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <BlurInText as="h1" text={`Hola, ${d.client?.nombre ?? ""} 👋`} className="block text-2xl font-semibold tracking-tight sm:text-3xl" />
          <p className="mt-1 text-sm text-muted-foreground">Este es el estado de tu proyecto con nosotros.</p>
        </div>

        {/* Progreso */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Progreso de tu proyecto</h2>
          <LifecycleBar current={d.step} />
        </section>

        {/* Contrato por firmar */}
        {porFirmar.map((c) => <ContractSignCard key={c.id} contract={{ id: c.id, contenido: c.contenido }} />)}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pendientes */}
          <Card icon={<ListChecks className="size-4 text-electric" />} title="Pendiente de tu parte">
            {pendientes.length === 0 ? (
              <Empty text="Nada pendiente de tu parte ahora. 🎉" />
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
          <Card icon={<CircleDollarSign className="size-4 text-success" />} title="Tus facturas y saldo">
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

          {/* Hitos */}
          <Card icon={<Flag className="size-4 text-brand-purple" />} title="Hitos del proyecto">
            {d.milestones.length === 0 ? <Empty text="Aún no hay hitos publicados." /> : (
              <ul className="space-y-2">
                {d.milestones.map((m) => (
                  <li key={m.id} className="rounded-lg border border-border px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{m.nombre}</span>
                      {m.porcentaje != null && <Badge>{m.porcentaje}%</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{fechaCorta(m.fecha)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Documentos */}
          <Card icon={<FolderDown className="size-4 text-electric" />} title="Tus documentos">
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
      </main>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card">
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
