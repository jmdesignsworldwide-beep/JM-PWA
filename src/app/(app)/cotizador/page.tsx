import { PageHeader } from "@/components/layout/page-header";
import { CotizadorView } from "@/components/cotizador/cotizador-view";
import { getClients } from "@/lib/data/clients";
import { getPrintProducts } from "@/lib/data/quotes";

export const metadata = { title: "Cotizador" };

export default async function CotizadorPage() {
  const [clients, printProducts] = await Promise.all([getClients(), getPrintProducts()]);

  return (
    <>
      <PageHeader
        title="Cotizador"
        subtitle="Software (JM Designs) o Imprenta (JM Distribution) — con asistente de IA."
      />
      <CotizadorView
        clients={clients.map((c) => ({
          id: c.id, nombre: c.nombre, apellido: c.apellido,
          whatsapp: c.whatsapp, telefono: c.telefono, brand_id: c.brand_id,
          industria: c.industria, correo: c.correo,
        }))}
        printProducts={printProducts.map((p) => ({
          id: p.id, nombre: p.nombre, categoria: p.categoria, precio_base: p.precio_base, moneda: p.moneda,
        }))}
      />
    </>
  );
}
