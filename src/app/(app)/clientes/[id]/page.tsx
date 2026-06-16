import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  getClientById,
  getBrands,
  getClientStats,
  getClientActivity,
  getClientFiles,
  getClientProjectsFull,
} from "@/lib/data/clients";
import { currentLifecycleStep } from "@/lib/data/lifecycle";
import { LifecycleBar } from "@/components/clientes/lifecycle-bar";
import { ClientDetail } from "@/components/clientes/client-detail";
import { WhatsappButton } from "@/components/clientes/whatsapp-button";
import { ConvertButton } from "@/components/clientes/convert-button";
import { PortalAccessButton } from "@/components/clientes/portal-access-button";
import { Badge } from "@/components/ui/badge";

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const [brands, stats, activity, files, projectsFull] = await Promise.all([
    getBrands(),
    getClientStats(id),
    getClientActivity(id),
    getClientFiles(id),
    getClientProjectsFull(id),
  ]);

  const step = currentLifecycleStep(client, stats);

  return (
    <div className="space-y-5">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Clientes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {client.nombre} {client.apellido ?? ""}
            </h1>
            {client.es_lead ? (
              <Badge dot="var(--warning)">Lead</Badge>
            ) : (
              <Badge dot="var(--success)">Cliente activo</Badge>
            )}
            {client.factura_fiscal && <Badge dot="var(--electric)">Factura fiscal</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[client.industria, client.categoria_servicio, client.fuente].filter(Boolean).join(" · ") || "Sin datos adicionales"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WhatsappButton phone={client.whatsapp ?? client.telefono} text={`Hola ${client.nombre}!`} />
          <PortalAccessButton clientId={client.id} whatsapp={client.whatsapp ?? client.telefono} />
          {client.es_lead && <ConvertButton clientId={client.id} />}
        </div>
      </div>

      {/* Barra de ciclo de vida */}
      <div className="rounded-xl border border-border bg-card p-5">
        <LifecycleBar current={step} />
      </div>

      <ClientDetail client={client} brands={brands} stats={stats} activity={activity} files={files} projectsFull={projectsFull} />
    </div>
  );
}
