import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — fotos de recibo caben de sobra
const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

/**
 * Escáner de recibos con Google Gemini Vision. La GEMINI_API_KEY SOLO vive
 * aquí (servidor), nunca en el navegador. Recibe la foto de un recibo y
 * devuelve los campos que SE LEEN CLARO para pre-llenar el formulario de gasto.
 *
 * Regla dura: NO inventar. Si un dato no se lee con seguridad, va en null y el
 * owner lo llena a mano. Si la IA falla, el front cae a captura manual.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "No autenticado" }, { status: 401 });

  if (!rateLimit(`ai-receipt:${user.id}`, 15, 60_000)) {
    return NextResponse.json({ ok: false, reason: "Demasiados escaneos seguidos. Espera un momento." }, { status: 429 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith("tu-")) {
    return NextResponse.json(
      { ok: false, reason: "Falta GEMINI_API_KEY. Configúrala para escanear; mientras, registra el gasto a mano." },
      { status: 200 },
    );
  }

  // Lee la imagen + las categorías de gasto disponibles (para que la IA elija una).
  let file: File | null = null;
  let categorias: string[] = [];
  try {
    const fd = await req.formData();
    const f = fd.get("imagen");
    if (f instanceof File) file = f;
    const cats = fd.get("categorias");
    if (typeof cats === "string" && cats) categorias = JSON.parse(cats);
  } catch { /* ignore */ }

  if (!file || file.size === 0) {
    return NextResponse.json({ ok: false, reason: "No llegó la imagen del recibo." }, { status: 200 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: "La imagen es muy grande (máx. 8 MB)." }, { status: 200 });
  }
  const mime = file.type || "image/jpeg";
  if (!OK_TYPES.has(mime)) {
    return NextResponse.json({ ok: false, reason: "Formato no soportado. Usa una foto (JPG/PNG)." }, { status: 200 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const listaCats = Array.isArray(categorias) && categorias.length
    ? categorias.join(", ")
    : "(sin lista; usa una categoría corta y razonable en español)";

  const system = `Eres el lector de recibos de JM Designs Worldwide (Rep. Dominicana).
Recibes la FOTO de un recibo/factura y extraes SOLO lo que se lee con seguridad.
Responde SIEMPRE en español y SOLO con un objeto JSON válido (sin texto extra ni markdown).

Esquema JSON requerido (usa null en cualquier campo que NO se lea claro):
{
  "monto": número con el TOTAL pagado (el gran total, no un subtotal), o null,
  "moneda": "DOP" o "USD" (RD$ / pesos = DOP; US$ / dólares = USD), o null,
  "fecha": fecha del recibo en formato "YYYY-MM-DD", o null,
  "comercio": nombre del comercio/proveedor tal como aparece, o null,
  "itbis": monto del ITBIS/impuesto si aparece desglosado, o null,
  "metodo_pago": "efectivo" | "tarjeta" | "transferencia" | "otro", o null,
  "categoria": una de [${listaCats}] si alguna encaja claramente; si ninguna encaja, propón una categoría corta; si no hay forma de saber, null,
  "lineas": arreglo con cada renglón/artículo que se lea claro, en el orden del recibo. Cada elemento: { "descripcion": texto del artículo, "monto": precio de ESE renglón o null }. Si el recibo no tiene renglones legibles, devuelve [] (arreglo vacío),
  "confianza": "alta" | "media" | "baja" según qué tan legible está el recibo
}

Reglas estrictas:
- NO INVENTES. Si dudas de un número o dato, ponlo en null. Es mejor null que un valor equivocado.
- "monto" es el TOTAL final pagado. No sumes ni calcules: usa el total impreso.
- En "lineas" copia SOLO renglones que se lean claro; no completes ni adivines precios. Un renglón sin precio legible lleva "monto": null.
- Si la moneda no se ve, déjala en null (no asumas).
- Devuelve SOLO el JSON.`;

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: key });
    const resp = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: "Lee este recibo y devuelve el JSON pedido." },
      ],
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const text = resp.text ?? "";
    const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const p = JSON.parse(jsonStr);

    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const fecha = typeof p.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ? p.fecha : null;
    const metodo = ["efectivo", "tarjeta", "transferencia", "otro"].includes(p.metodo_pago) ? p.metodo_pago : null;
    // Renglones legibles del recibo (para confirmar, nunca para sumar solos).
    const lineas = Array.isArray(p.lineas)
      ? p.lineas
          .map((l: unknown) => {
            const o = (l ?? {}) as { descripcion?: unknown; monto?: unknown };
            return { descripcion: str(o.descripcion), monto: num(o.monto) };
          })
          .filter((l: { descripcion: string | null; monto: number | null }) => l.descripcion)
          .slice(0, 40)
      : [];

    return NextResponse.json({
      ok: true,
      data: {
        monto: num(p.monto),
        moneda: p.moneda === "USD" ? "USD" : p.moneda === "DOP" ? "DOP" : null,
        fecha,
        comercio: str(p.comercio),
        itbis: num(p.itbis),
        metodo_pago: metodo,
        categoria: str(p.categoria),
        lineas,
        confianza: ["alta", "media", "baja"].includes(p.confianza) ? p.confianza : "media",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: `No se pudo leer el recibo (${e instanceof Error ? e.message : "?"}). Regístralo a mano.` },
      { status: 200 },
    );
  }
}
