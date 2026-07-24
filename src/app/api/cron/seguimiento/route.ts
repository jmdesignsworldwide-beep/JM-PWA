import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rdToday } from "@/lib/fecha";
import { runSeguimiento } from "@/lib/seguimiento-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hora actual (0-23) en zona horaria de RD. */
function rdHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santo_Domingo", hour: "2-digit", hour12: false,
    }).format(new Date()),
  );
}

/**
 * Cron de SEGUIMIENTO de eventos vencidos — franjas de MEDIODÍA y NOCHE.
 *
 * Lo dispara GitHub Actions (el plan free de Vercel solo permite crons 1x/día).
 * La franja de la MAÑANA la cubre `/api/cron/daily`, que ya corre a diario; así
 * las tres preguntas del día (mañana/mediodía/noche) se reparten entre ambos
 * crons sin duplicarse. Toda la lógica vive en runSeguimiento(). Protegido con
 * CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const result = await runSeguimiento(admin, rdToday(), rdHour());
  return NextResponse.json(result);
}
