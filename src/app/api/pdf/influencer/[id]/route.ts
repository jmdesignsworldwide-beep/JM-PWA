import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCollabPdf } from "@/lib/pdf";
import { ESTADO_TRATO_LABEL, type EstadoTrato } from "@/lib/influencers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { data: inf } = await supabase.from("influencers").select("*").eq("id", id).maybeSingle();
  if (!inf) return new NextResponse("No encontrado", { status: 404 });

  const { data: brand } = inf.brand_id
    ? await supabase.from("brands").select("nombre").eq("id", inf.brand_id).maybeSingle()
    : { data: null };

  const contacto = [
    inf.tiene_whatsapp && inf.whatsapp ? `WhatsApp ${inf.whatsapp}` : null,
    inf.tiene_correo && inf.correo ? inf.correo : null,
    inf.tiene_manager && inf.empresa ? `Agencia: ${inf.empresa}` : "Independiente",
  ].filter(Boolean).join("  -  ");

  const plataformas = (Array.isArray(inf.plataformas) ? inf.plataformas : []) as { red: string; handle: string; seguidores: string; engagement: string }[];
  const promos = (Array.isArray(inf.promos) ? inf.promos : []) as { tipo: string; cantidad: number; plataforma: string; valor: number; moneda: string; fecha: string }[];

  const bytes = await buildCollabPdf({
    brand: brand?.nombre ?? "JM Designs Worldwide",
    influencer: inf.nombre,
    nicho: inf.nicho,
    contacto,
    plataformas,
    doyTipo: inf.doy_tipo,
    doyDesc: inf.doy_desc,
    doyValor: inf.doy_valor,
    doyMoneda: inf.doy_moneda ?? "DOP",
    doyEntrega: inf.doy_fecha_entrega,
    promos,
    estado: ESTADO_TRATO_LABEL[(inf.estado_trato as EstadoTrato) ?? "propuesto"] ?? "Propuesto",
    notas: inf.notas,
    fecha: inf.fecha_acuerdo ?? inf.created_at,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="acuerdo-${inf.nombre.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
