import { NextResponse } from "next/server";
import { EMPRESA } from "@/lib/empresa";
import { createClient } from "@/lib/supabase/server";
import { getInfluencers } from "@/lib/data/influencers";
import { buildInfluencersPdf } from "@/lib/pdf-report";
import { igHandle, INFLUENCER_ESTADO_LABEL, type InfluencerEstado } from "@/lib/influencers";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const infs = await getInfluencers();
  const bytes = await buildInfluencersPdf({
    brand: EMPRESA.nombre,
    filas: infs.map((i) => ({
      nombre: i.nombre,
      handle: igHandle(i.ig_url) ?? "",
      estado: INFLUENCER_ESTADO_LABEL[i.estado as InfluencerEstado] ?? i.estado,
      manager: i.tiene_manager ? (i.empresa ?? "Si") : "Independiente",
      contacto: (i.tiene_whatsapp && i.whatsapp) || (i.tiene_correo && i.correo) || "-",
    })),
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="influencers.pdf"` },
  });
}
