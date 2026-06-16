import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getRecentOrders } from "@/lib/data/orders";
import { Badge } from "@/components/ui/badge";
import { money, fechaCorta } from "@/lib/format";

export const metadata = { title: "Pedidos / Contratos / Facturas" };

export default async function PedidosPage() {
  const orders = await getRecentOrders();

  return (
    <>
      <PageHeader
        title="Pedidos / Contratos / Facturas"
        subtitle="El flujo conectado. Crea pedidos desde la ficha de un cliente; aquí ves todos."
      />

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          Aún no hay pedidos. Entra a la ficha de un cliente → pestaña <strong>Pedidos</strong> → <strong>Nuevo pedido</strong>.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
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
      )}
    </>
  );
}
