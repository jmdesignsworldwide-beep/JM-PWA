import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCollabPdf } from "@/lib/pdf";
import { COLAB_ESTADO_LABEL, type ColabEstado } from "@/lib/influencers";

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

  // La colaboración más reciente es la fuente del acuerdo. Si aún no hay
  // ninguna (influencer solo registrado), se cae a las columnas legado.
  const { data: colabRows } = await supabase
    .from("collaborations").select("*").eq("influencer_id", id)
    .order("created_at", { ascending: false }).limit(1);
  const colab = (colabRows?.[0] ?? null) as {
    brand_id: string | null; estado: string; doy_tipo: string | null; doy_desc: string | null; promos: unknown; notas: string | null; created_at: string;
  } | null;

  const brandId = colab?.brand_id ?? inf.brand_id;
  const { data: brand } = brandId
    ? await supabase.from("brands").select("nombre").eq("id", brandId).maybeSingle()
    : { data: null };

  const contacto = [
    inf.tiene_whatsapp && inf.whatsapp ? `WhatsApp ${inf.whatsapp}` : null,
    inf.tiene_correo && inf.correo ? inf.correo : null,
    inf.tiene_manager && inf.empresa ? `Agencia: ${inf.empresa}` : "Independiente",
  ].filter(Boolean).join("  -  ");

  const plataformas = (Array.isArray(inf.plataformas) ? inf.plataformas : []) as { red: string; handle: string; seguidores: string; engagement: string }[];
  // Promos de la colaboración (sin valor/moneda/fecha) o legado como respaldo.
  const promosSrc = colab
    ? (Array.isArray(colab.promos) ? colab.promos : []) as { tipo: string; cantidad: number; plataforma: string }[]
    : (Array.isArray(inf.promos) ? inf.promos : []) as { tipo: string; cantidad: number; plataforma: string }[];
  const promos = promosSrc.map((p) => ({ tipo: p.tipo, cantidad: p.cantidad, plataforma: p.plataforma, valor: 0, moneda: "DOP", fecha: "" }));

  const estadoLabel = colab
    ? (COLAB_ESTADO_LABEL[colab.estado as ColabEstado] ?? colab.estado)
    : "Registrado";

  const bytes = await buildCollabPdf({
    brand: brand?.nombre ?? "JM Designs Worldwide",
    influencer: inf.nombre,
    nicho: inf.nicho,
    contacto,
    plataformas,
    doyTipo: colab?.doy_tipo ?? inf.doy_tipo,
    doyDesc: colab?.doy_desc ?? inf.doy_desc,
    doyValor: null,
    doyMoneda: "DOP",
    doyEntrega: null,
    promos,
    estado: estadoLabel,
    notas: colab?.notas ?? inf.notas,
    fecha: colab?.created_at ?? inf.fecha_acuerdo ?? inf.created_at,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="acuerdo-${inf.nombre.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
