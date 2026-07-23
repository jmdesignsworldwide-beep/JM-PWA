import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getClientById, getClients, getBrands } from "@/lib/data/clients";
import { getAllCatalog } from "@/lib/data/catalog";
import { NewOrderForm } from "@/components/pedidos/new-order-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Nuevo pedido" };

export default async function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;

  // El pedido puede empezar SIN cliente (se elige/crea dentro del form).
  const [preClient, clients, brands, catalogRows] = await Promise.all([
    cliente ? getClientById(cliente) : Promise.resolve(null),
    getClients(),
    getBrands(),
    getAllCatalog(),
  ]);

  // Agrupa el catálogo por marca para el selector.
  const catalog: Record<string, { id: string; nombre: string; precio_base: number; categoria: string | null; unidad: string | null }[]> = {};
  for (const c of catalogRows) {
    if (!c.brand_id) continue;
    (catalog[c.brand_id] ??= []).push({ id: c.id, nombre: c.nombre, precio_base: c.precio_base, categoria: c.categoria, unidad: c.unidad });
  }

  const clientOpts = clients.map((c) => ({ id: c.id, nombre: `${c.nombre} ${c.apellido ?? ""}`.trim() }));

  return (
    <div className="space-y-5">
      <Link
        href={preClient ? `/clientes/${preClient.id}` : "/pedidos"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {preClient ? `${preClient.nombre} ${preClient.apellido ?? ""}` : "Pedidos"}
      </Link>
      <PageHeader
        title="Nuevo pedido"
        subtitle="El pedido es el corazón: elige cliente y marca, arma los ítems y guarda."
      />
      <NewOrderForm
        client={
          preClient
            ? { id: preClient.id, nombre: preClient.nombre, factura_fiscal: preClient.factura_fiscal, brand_id: preClient.brand_id }
            : null
        }
        clients={clientOpts}
        brands={brands}
        catalog={catalog}
      />
    </div>
  );
}
