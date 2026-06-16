import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { NewOrderButton } from "@/components/pedidos/new-order-button";
import { getRecentOrders } from "@/lib/data/orders";
import { getClients } from "@/lib/data/clients";
import { Badge } from "@/components/ui/badge";
import { money, fechaCorta } from "@/lib/format";

export const metadata = { title: "Pedidos / Contratos / Facturas" };

export default async function PedidosPage() {
  const [orders, clients] = await Promise.all([getRecentOrders(), getClients()]);
  const clientOpts = clients.map((c) => ({ id: c.id, nombre: `${c.nombre} ${c.apellido ?? ""}`.trim() }));

  return (
    <>
      <PageHeader
        title="Pedidos / Contratos / Facturas"
        subtitle="El flujo conectado. Crea un pedido y de ahí salen contrato y factura."
      >
        <NewOrderButton clients={clientOpts} />
      </PageHeader>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          Aún no hay pedidos. Entra a la ficha de un cliente → pestaña <strong>Pedidos</strong> → <strong>Nuevo pedido</strong>.
        </div>
      ) : (
        <>
        {/* Móvil: tarjetas */}
        <ul className="space-y-2 sm:hidden">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/pedidos/${o.id}`} className="block rounded-xl border border-border bg-card p-4 active:bg-accent/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium"><FileText className="size-4 text-electric" /> {o.clienteNombre}</span>
                  <span className="font-medium">{money(o.total, o.moneda)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <Badge>{o.estado}</Badge>
                  <span>{o.rama === "designs" ? "JM Designs" : "JM Distribution"} · {fechaCorta(o.fecha)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Escritorio: tabla */}
        <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Rama</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border transition-colors hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <Link href={`/pedidos/${o.id}`} className="flex items-center gap-2 font-medium hover:text-electric">
                      <FileText className="size-4 text-electric" /> {o.clienteNombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.rama === "designs" ? "JM Designs" : "JM Distribution"}</td>
                  <td className="px-4 py-3"><Badge>{o.estado}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{fechaCorta(o.fecha)}</td>
                  <td className="px-4 py-3 text-right font-medium">{money(o.total, o.moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </>
  );
}
