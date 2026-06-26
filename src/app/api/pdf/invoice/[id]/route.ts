import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInvoicePdf } from "@/lib/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { data: inv } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!inv) return new NextResponse("No encontrado", { status: 404 });

  const [{ data: cliente }, { data: brand }] = await Promise.all([
    supabase.from("clients").select("nombre, apellido").eq("id", inv.client_id).maybeSingle(),
    inv.brand_id
      ? supabase.from("brands").select("nombre").eq("id", inv.brand_id).maybeSingle()
      : Promise.resolve({ data: null as { nombre: string } | null }),
  ]);

  const items = (inv.items_json as { producto?: string; cantidad?: number; subtotal?: number }[]) ?? [];

  const bytes = await buildInvoicePdf({
    brand: brand?.nombre ?? "JM Designs Worldwide",
    cliente: `${cliente?.nombre ?? ""} ${cliente?.apellido ?? ""}`.trim(),
    rnc: inv.rnc,
    ncf: inv.ncf,
    esFiscal: inv.es_fiscal,
    items,
    subtotal: inv.subtotal,
    itbis: inv.itbis,
    total: inv.total,
    moneda: inv.moneda,
    estadoPago: inv.estado_pago,
    fecha: inv.fecha,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.es_fiscal ? "factura" : "recibo"}-${id.slice(0, 8)}.pdf"`,
    },
  });
}
