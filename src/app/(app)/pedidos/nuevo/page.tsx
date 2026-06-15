import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getClientById } from "@/lib/data/clients";
import { NewOrderForm } from "@/components/pedidos/new-order-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Nuevo pedido" };

export default async function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  if (!cliente) notFound();
  const client = await getClientById(cliente);
  if (!client) notFound();

  return (
    <div className="space-y-5">
      <Link
        href={`/clientes/${client.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {client.nombre} {client.apellido ?? ""}
      </Link>
      <PageHeader
        title="Nuevo pedido"
        subtitle="La espina dorsal del flujo: el contrato y la factura leerán de aquí."
      />
      <NewOrderForm
        client={{
          id: client.id,
          nombre: client.nombre,
          factura_fiscal: client.factura_fiscal,
          brand_id: client.brand_id,
        }}
      />
    </div>
  );
}
