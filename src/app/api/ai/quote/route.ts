import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotesContext } from "@/lib/data/quotes";
import { MODULOS, INDUSTRIAS_COT, TIPOS_SOLUCION_COT } from "@/lib/cotizador";

export const runtime = "nodejs";

/**
 * AI Quote Assistant. La key de Anthropic SOLO vive aquí (servidor).
 * Recibe texto natural y devuelve una cotización pre-armada para que el owner
 * la revise y apruebe. Si la IA falla, el front cae a cotización manual.
 */
export async function POST(req: Request) {
  // Requiere sesión (no exponer la IA a anónimos).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "No autenticado" }, { status: 401 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.startsWith("tu-")) {
    return NextResponse.json(
      { ok: false, reason: "Falta ANTHROPIC_API_KEY. Configúrala para usar la IA; mientras, cotiza manual." },
      { status: 200 },
    );
  }

  let prompt = "";
  try {
    const body = await req.json();
    prompt = (body?.prompt ?? "").toString().trim();
  } catch {
    /* ignore */
  }
  if (!prompt) return NextResponse.json({ ok: false, reason: "Escribe qué necesita el cliente." }, { status: 200 });

  const contexto = await getQuotesContext();
  const moduloIds = MODULOS.map((m) => `${m.id} (${m.label})`).join(", ");

  const system = `Eres el asistente de cotización de JM Designs Worldwide (Rep. Dominicana).
Ayudas a Marien (dueña) a armar cotizaciones de software/sistemas.
Responde SIEMPRE en español y SOLO con un objeto JSON válido, sin texto extra.

Esquema JSON requerido:
{
  "industria": una de [${INDUSTRIAS_COT.join(", ")}],
  "tipo_solucion": una de [${TIPOS_SOLUCION_COT.join(", ")}],
  "modulos": array de ids válidos elegidos de: ${moduloIds},
  "precio_min": número en DOP (entero),
  "precio_max": número en DOP (entero),
  "notas": string breve explicando el alcance propuesto
}

Reglas:
- Elige módulos relevantes a la industria y a lo que pide el cliente.
- El rango de precio debe ser coherente con estas cotizaciones pasadas de Marien:
${contexto}
- Si no hay datos previos suficientes, estima un rango razonable para RD y dilo en notas.`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);

    // Filtra a ids de módulo válidos.
    const validIds = new Set(MODULOS.map((m) => m.id));
    const modulos = Array.isArray(parsed.modulos)
      ? parsed.modulos.filter((id: string) => validIds.has(id))
      : [];

    return NextResponse.json({
      ok: true,
      data: {
        industria: parsed.industria ?? null,
        tipo_solucion: parsed.tipo_solucion ?? null,
        modulos,
        precio_min: Number(parsed.precio_min) || null,
        precio_max: Number(parsed.precio_max) || null,
        notas: parsed.notas ?? "",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: `La IA no respondió bien (${e instanceof Error ? e.message : "?"}). Cotiza manual.` },
      { status: 200 },
    );
  }
}
