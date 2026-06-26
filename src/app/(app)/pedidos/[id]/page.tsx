import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOrderFull } from "@/lib/data/orders";
import { OrderDetail } from "@/components/pedidos/order-detail";
import { PageHeader } from "@/components/layout/page-header";
import { diasDesde } from "@/lib/pedidos";

export const metadata = { title: "Pedido" };

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getOrderFull(id);
  if (!data) notFound();

  const { order, client } = data;
  const contractDias = diasDesde(data.contract?.fecha_envio);

  return (
    <div className="space-y-5">
      {client && (
        <Link
          href={`/clientes/${client.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {client.nombre} {client.apellido ?? ""}
        </Link>
      )}
      <PageHeader
        title={`Pedido · ${client?.nombre ?? ""}`}
        subtitle="Pedido → Contrato → Factura. Todo conectado desde aquí."
      />
      <OrderDetail
        order={order}
        client={
          client
            ? {
                id: client.id,
                nombre: client.nombre,
                apellido: client.apellido,
                whatsapp: client.whatsapp,
                telefono: client.telefono,
                factura_fiscal: client.factura_fiscal,
                rnc: client.rnc,
              }
            : null
        }
        items={data.items}
        notes={data.notes}
        contract={data.contract}
        invoice={data.invoice}
        brandName={data.brandName}
        contractDias={contractDias}
        payments={data.payments}
        hasProject={data.hasProject}
      />
    </div>
  );
}
