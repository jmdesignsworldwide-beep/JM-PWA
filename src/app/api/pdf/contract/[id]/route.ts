import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildContractPdf } from "@/lib/pdf";

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

  const { data: c } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!c) return new NextResponse("No encontrado", { status: 404 });

  const [{ data: cliente }, { data: brand }] = await Promise.all([
    supabase.from("clients").select("nombre, apellido").eq("id", c.client_id).maybeSingle(),
    c.brand_id
      ? supabase.from("brands").select("nombre").eq("id", c.brand_id).maybeSingle()
      : Promise.resolve({ data: null as { nombre: string } | null }),
  ]);

  const bytes = await buildContractPdf({
    brand: brand?.nombre ?? "JM Designs Worldwide",
    cliente: `${cliente?.nombre ?? ""} ${cliente?.apellido ?? ""}`.trim(),
    contenido: c.contenido ?? "",
    estado: c.estado,
    fecha: c.fecha_aprobacion ?? c.created_at,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contrato-${id.slice(0, 8)}.pdf"`,
    },
  });
}
