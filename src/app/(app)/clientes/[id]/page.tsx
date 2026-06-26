import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  getClientById,
  getBrands,
  getClientStats,
  getClientActivity,
  getClientFiles,
} from "@/lib/data/clients";
import { getLifecycle } from "@/lib/data/lifecycle";
import { LifecycleBar } from "@/components/clientes/lifecycle-bar";
import { ClientDetail } from "@/components/clientes/client-detail";
import { ProspectoDetail } from "@/components/clientes/prospecto-detail";
import { ConvertToClientButton } from "@/components/clientes/convert-to-client-button";
import { WhatsappButton } from "@/components/clientes/whatsapp-button";
import { PortalAccessButton } from "@/components/clientes/portal-access-button";
import { EstadoSelect } from "@/components/clientes/estado-select";
import { DeleteClientButton } from "@/components/clientes/delete-client-button";
import { SocialLinks } from "@/components/ui/social-links";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isOwner = false;
  if (user) {
    const { data: me } = await supabase.from("users_profiles").select("rol").eq("id", user.id).maybeSingle();
    isOwner = me?.rol === "owner";
  }
  const brands = await getBrands();
  const nombreCompleto = `${client.nombre} ${client.apellido ?? ""}`.trim();

  // ── PROSPECTO: ficha ligera. Aún no compra → sin pedidos/contratos/facturas/pagos. ──
  if (client.es_lead) {
    return (
      <div className="space-y-5">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Prospectos
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{nombreCompleto}</h1>
              <Badge dot="var(--warning)">Prospecto</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[client.industria, client.categoria_servicio, client.fuente].filter(Boolean).join(" · ") || "Sin datos adicionales"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EstadoSelect clientId={client.id} esLead={client.es_lead} etapa={client.etapa_venta} />
            <SocialLinks instagram={client.instagram} facebook={client.facebook} />
            <WhatsappButton phone={client.whatsapp ?? client.telefono} text={`Hola ${client.nombre}!`} />
            <ConvertToClientButton clientId={client.id} clientName={nombreCompleto} />
            <DeleteClientButton
              clientId={client.id} clientName={nombreCompleto} isOwner={isOwner} esLead={client.es_lead}
              impacto={{ pedidos: 0, contratos: 0, facturas: 0, proyectos: 0 }}
            />
          </div>
        </div>

        <ProspectoDetail client={client} brands={brands} />
      </div>
    );
  }

  // ── CLIENTE ACTIVO: ficha completa con todo el flujo de dinero. ──
  const [stats, activity, files] = await Promise.all([
    getClientStats(id),
    getClientActivity(id),
    getClientFiles(id),
  ]);

  const lifecycle = getLifecycle(client, stats);

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
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{nombreCompleto}</h1>
            <Badge dot="var(--success)">Cliente activo</Badge>
            {client.factura_fiscal && <Badge dot="var(--electric)">Factura fiscal</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[client.industria, client.categoria_servicio, client.fuente].filter(Boolean).join(" · ") || "Sin datos adicionales"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EstadoSelect clientId={client.id} esLead={client.es_lead} etapa={client.etapa_venta} />
          <SocialLinks instagram={client.instagram} facebook={client.facebook} />
          <WhatsappButton phone={client.whatsapp ?? client.telefono} text={`Hola ${client.nombre}!`} />
          <PortalAccessButton clientId={client.id} clientName={client.nombre} whatsapp={client.whatsapp ?? client.telefono} />
          <DeleteClientButton
            clientId={client.id} clientName={nombreCompleto} isOwner={isOwner} esLead={client.es_lead}
            impacto={{ pedidos: stats.orders.length, contratos: stats.contracts.length, facturas: stats.invoices.length, proyectos: stats.projects.length }}
          />
        </div>
      </div>

      {/* Barra de ciclo de vida */}
      <div className="rounded-xl border border-border bg-card p-5">
        <LifecycleBar current={lifecycle.current} steps={lifecycle.steps} />
      </div>

      <ClientDetail client={client} brands={brands} stats={stats} activity={activity} files={files} />
    </div>
  );
}
