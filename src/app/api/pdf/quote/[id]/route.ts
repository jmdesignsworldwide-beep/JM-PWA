import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildQuotePdf } from "@/lib/pdf";
import { MODULO_LABEL } from "@/lib/cotizador";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { data: q } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!q) return new NextResponse("No encontrado", { status: 404 });

  const [{ data: cliente }, { data: brand }] = await Promise.all([
    q.client_id ? supabase.from("clients").select("nombre, apellido").eq("id", q.client_id).maybeSingle() : Promise.resolve({ data: null }),
    q.brand_id ? supabase.from("brands").select("nombre").eq("id", q.brand_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  let lineas: string[] = [];
  if (q.rama === "distribution") {
    const items = (q.items_json as { producto?: string; cantidad?: number; subtotal?: number }[]) ?? [];
    lineas = items.map((it) => `${it.producto ?? "Ítem"} x${it.cantidad ?? 1}`);
  } else {
    const mods = (q.modulos_json as string[]) ?? [];
    lineas = mods.map((m) => MODULO_LABEL[m] ?? m);
  }

  const bytes = await buildQuotePdf({
    brand: brand?.nombre ?? "JM Designs Worldwide",
    cliente: cliente ? `${cliente.nombre} ${cliente.apellido ?? ""}`.trim() : "Cliente",
    rama: q.rama ?? "designs",
    tipo: q.tipo_solucion,
    industria: q.industria,
    lineas,
    notas: q.notas,
    precio: q.precio_manual,
    moneda: "DOP",
    fecha: q.fecha,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cotizacion-${id.slice(0, 8)}.pdf"`,
    },
  });
}
