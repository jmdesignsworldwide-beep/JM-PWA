import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getKpis, getRuleInsights } from "@/lib/data/insights";
import { getSuggestedActions } from "@/lib/data/acciones";
import { money } from "@/lib/format";

export const runtime = "nodejs";

/** Resumen ejecutivo del día redactado por Gemini, con datos REALES como contexto. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const [kpis, insights, acciones] = await Promise.all([getKpis(), getRuleInsights(), getSuggestedActions()]);

  const datos = [
    `Ingresado: ${money(kpis.ingresado.DOP, "DOP")}${kpis.ingresado.USD ? " + " + money(kpis.ingresado.USD, "USD") : ""}`,
    `Gastado: ${money(kpis.gastado.DOP, "DOP")}`,
    `Por cobrar: ${money(kpis.porCobrar, "DOP")}`,
    `Leads activos: ${kpis.leadsActivos}`,
    `Proyectos activos: ${kpis.proyectosActivos}`,
    `Conversión de leads: ${kpis.conversion}%`,
    `MRR: ${money(kpis.mrr, "DOP")}`,
    `Acciones sugeridas hoy: ${acciones.length}`,
    ...insights.map((i) => i.texto),
  ].join("\n");

  // Fallback sin IA: resumen basado en reglas (nunca inventa).
  const fallback = `Hoy tienes ${acciones.length} acción(es) sugerida(s), ${kpis.leadsActivos} lead(s) activo(s) y ${kpis.proyectosActivos} proyecto(s) en curso. Por cobrar: ${money(kpis.porCobrar, "DOP")}.`;

  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith("tu-")) {
    return NextResponse.json({ ok: true, resumen: fallback, ia: false });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: key });
    const resp = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: `Datos reales del negocio hoy:\n${datos}`,
      config: {
        systemInstruction:
          "Eres el asistente de negocio de JM Designs Worldwide (Rep. Dominicana). Escribe en español RD un resumen ejecutivo de UN párrafo corto (máx 3 frases) del estado del negocio hoy. Usa SOLO los datos provistos; nunca inventes cifras ni hechos. Tono claro y motivador.",
        temperature: 0.5,
        maxOutputTokens: 300,
      },
    });
    const resumen = (resp.text ?? "").trim() || fallback;
    return NextResponse.json({ ok: true, resumen, ia: true });
  } catch {
    return NextResponse.json({ ok: true, resumen: fallback, ia: false });
  }
}
