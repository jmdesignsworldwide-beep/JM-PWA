import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Redacta (Gemini) un mensaje de WhatsApp de seguimiento, tono Marien RD. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { tipo?: string; nombre?: string; detalle?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith("tu-")) {
    return NextResponse.json({ ok: false, reason: "Sin GEMINI_API_KEY" }, { status: 200 });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: key });
    const resp = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: `Tipo de seguimiento: ${body.tipo}\nCliente: ${body.nombre}\nContexto: ${body.detalle}`,
      config: {
        systemInstruction:
          "Eres Marien, dueña de JM Designs Worldwide (Rep. Dominicana). Escribe UN mensaje breve de WhatsApp (1-3 frases) para dar seguimiento al cliente, en español RD, profesional y cálido, personalizado con su nombre. Devuelve SOLO el mensaje, sin comillas ni explicación. No inventes datos que no estén en el contexto.",
        temperature: 0.7,
        maxOutputTokens: 200,
      },
    });
    const mensaje = (resp.text ?? "").trim();
    if (!mensaje) return NextResponse.json({ ok: false, reason: "Sin respuesta" }, { status: 200 });
    return NextResponse.json({ ok: true, mensaje });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: e instanceof Error ? e.message : "?" }, { status: 200 });
  }
}
