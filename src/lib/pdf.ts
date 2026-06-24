import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { money, fechaCorta } from "@/lib/format";
import { EMPRESA } from "@/lib/empresa";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const INK = rgb(0.08, 0.08, 0.1);
const MUTED = rgb(0.45, 0.45, 0.5);
const ACCENT = rgb(0.31, 0.55, 1);
const BRAND_DARK = rgb(0.06, 0.07, 0.1);
const ACCENT_SOFT = rgb(0.93, 0.95, 1);

/** Quita caracteres que la fuente WinAnsi no puede codificar. */
function clean(s: string): string {
  return (s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/[^\x00-\xFF]/g, "");
}

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
};

function ensureSpace(ctx: Ctx, needed = 16) {
  if (ctx.y - needed < MARGIN) {
    ctx.page = ctx.doc.addPage(A4);
    ctx.y = A4[1] - MARGIN;
  }
}

function text(ctx: Ctx, str: string, size = 10, opts: { bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number } = {}) {
  const font = opts.bold ? ctx.bold : ctx.font;
  const maxW = A4[0] - MARGIN * 2 - (opts.indent ?? 0);
  for (const para of clean(str).split("\n")) {
    const words = para.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        ensureSpace(ctx, size + 4);
        ctx.page.drawText(line, { x: MARGIN + (opts.indent ?? 0), y: ctx.y, size, font, color: opts.color ?? INK });
        ctx.y -= size + 4;
        line = w;
      } else line = test;
    }
    ensureSpace(ctx, size + 4);
    ctx.page.drawText(line, { x: MARGIN + (opts.indent ?? 0), y: ctx.y, size, font, color: opts.color ?? INK });
    ctx.y -= size + 5;
  }
}

/** Encabezado premium branded: barra de acento, monograma JM, marca y título. */
function header(ctx: Ctx, brand: string, docTitle: string, dateStr?: string | null) {
  const top = A4[1];
  // Barra de acento superior.
  ctx.page.drawRectangle({ x: 0, y: top - 6, width: A4[0], height: 6, color: ACCENT });

  // Monograma "JM".
  const mx = MARGIN;
  const my = top - 72;
  ctx.page.drawRectangle({ x: mx, y: my, width: 44, height: 44, color: BRAND_DARK });
  const jmSize = 18;
  ctx.page.drawText("JM", {
    x: mx + 22 - ctx.bold.widthOfTextAtSize("JM", jmSize) / 2,
    y: my + 22 - jmSize / 2 + 2, size: jmSize, font: ctx.bold, color: rgb(1, 1, 1),
  });

  // Marca + tagline.
  ctx.page.drawText(clean(brand || "JM Designs Worldwide"), { x: mx + 58, y: my + 26, size: 16, font: ctx.bold, color: INK });
  ctx.page.drawText("Diseno - Software - Distribucion", { x: mx + 58, y: my + 11, size: 8.5, font: ctx.font, color: MUTED });

  // Título del documento (derecha) + fecha.
  const tw = ctx.bold.widthOfTextAtSize(docTitle, 13);
  ctx.page.drawText(docTitle, { x: A4[0] - MARGIN - tw, y: my + 26, size: 13, font: ctx.bold, color: ACCENT });
  if (dateStr) {
    const ds = clean(dateStr);
    const dw = ctx.font.widthOfTextAtSize(ds, 9);
    ctx.page.drawText(ds, { x: A4[0] - MARGIN - dw, y: my + 11, size: 9, font: ctx.font, color: MUTED });
  }

  ctx.y = my - 16;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: A4[0] - MARGIN, y: ctx.y }, thickness: 1, color: rgb(0.85, 0.85, 0.88) });
  ctx.y -= 20;
}

/** Pie de página con datos de contacto de la empresa. */
function footer(ctx: Ctx) {
  const y = 38;
  ctx.page.drawLine({ start: { x: MARGIN, y: y + 14 }, end: { x: A4[0] - MARGIN, y: y + 14 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.88) });
  const line = clean(`${EMPRESA.nombre}  -  WhatsApp +${EMPRESA.whatsapp}`);
  const w = ctx.font.widthOfTextAtSize(line, 8.5);
  ctx.page.drawText(line, { x: A4[0] / 2 - w / 2, y, size: 8.5, font: ctx.font, color: MUTED });
}

async function newCtx(): Promise<Ctx> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(A4);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, page, font, bold, y: A4[1] - MARGIN };
}

export async function buildContractPdf(data: {
  brand: string;
  cliente: string;
  contenido: string;
  estado: string;
  fecha: string | null;
}): Promise<Uint8Array> {
  const ctx = await newCtx();
  header(ctx, data.brand, "Contrato de servicios", data.fecha ? fechaCorta(data.fecha) : null);
  text(ctx, `Cliente: ${data.cliente}`, 10, { bold: true });
  text(ctx, `Estado: ${data.estado}`, 9, { color: MUTED });
  ctx.y -= 8;
  text(ctx, data.contenido || "—", 10);
  footer(ctx);
  return ctx.doc.save();
}

export async function buildInvoicePdf(data: {
  brand: string;
  cliente: string;
  rnc: string | null;
  ncf: string | null;
  esFiscal: boolean;
  items: { producto?: string; cantidad?: number; subtotal?: number }[];
  subtotal: number;
  itbis: number;
  total: number;
  moneda: string;
  estadoPago: string;
  fecha: string | null;
}): Promise<Uint8Array> {
  const ctx = await newCtx();
  header(ctx, data.brand, data.esFiscal ? "Factura con valor fiscal" : "Factura", fechaCorta(data.fecha));
  text(ctx, `Cliente: ${data.cliente}`, 10, { bold: true });
  if (data.esFiscal) {
    text(ctx, `RNC: ${data.rnc ?? "—"}   NCF: ${data.ncf ?? "PENDIENTE (modulo fiscal)"}`, 9, { color: MUTED });
  }
  text(ctx, `Estado: ${data.estadoPago}`, 9, { color: MUTED });
  ctx.y -= 10;

  for (const it of data.items) {
    text(ctx, `- ${it.producto ?? "Item"}  x${it.cantidad ?? 1}`, 10, { indent: 0 });
    ctx.y += 15;
    ctx.page.drawText(money(it.subtotal ?? 0, data.moneda), {
      x: A4[0] - MARGIN - ctx.font.widthOfTextAtSize(money(it.subtotal ?? 0, data.moneda), 10),
      y: ctx.y, size: 10, font: ctx.font, color: INK,
    });
    ctx.y -= 15;
  }

  ctx.y -= 6;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: A4[0] - MARGIN, y: ctx.y }, thickness: 1, color: rgb(0.85, 0.85, 0.88) });
  ctx.y -= 16;

  const totals: [string, string, boolean][] = [
    ["Subtotal", money(data.subtotal, data.moneda), false],
    ["ITBIS", money(data.itbis, data.moneda), false],
    ["TOTAL", money(data.total, data.moneda), true],
  ];
  for (const [label, val, isBold] of totals) {
    const font = isBold ? ctx.bold : ctx.font;
    const size = isBold ? 13 : 10;
    ctx.page.drawText(label, { x: A4[0] - MARGIN - 200, y: ctx.y, size, font, color: isBold ? INK : MUTED });
    ctx.page.drawText(val, { x: A4[0] - MARGIN - font.widthOfTextAtSize(val, size), y: ctx.y, size, font, color: INK });
    ctx.y -= size + 6;
  }
  footer(ctx);
  return ctx.doc.save();
}

export async function buildQuotePdf(data: {
  brand: string;
  cliente: string;
  rama: string;
  tipo: string | null;
  industria: string | null;
  lineas: string[];
  notas: string | null;
  precio: number | null;
  moneda: string;
  fecha: string | null;
}): Promise<Uint8Array> {
  const ctx = await newCtx();
  header(ctx, data.brand, "Cotización", fechaCorta(data.fecha));
  text(ctx, `Preparada para: ${data.cliente}`, 11, { bold: true });
  const meta = [data.industria, data.tipo, data.rama === "designs" ? "Software" : "Imprenta"].filter(Boolean).join(" · ");
  if (meta) text(ctx, meta, 9, { color: MUTED });
  ctx.y -= 10;

  text(ctx, "Tu solución incluye", 11, { bold: true, color: ACCENT });
  ctx.y -= 2;
  for (const l of data.lineas) text(ctx, `-  ${l}`, 10, { indent: 8 });

  if (data.notas) {
    ctx.y -= 8;
    text(ctx, "Notas", 11, { bold: true, color: ACCENT });
    text(ctx, data.notas, 10);
  }

  if (data.precio != null) {
    ctx.y -= 16;
    ensureSpace(ctx, 64);
    // Caja destacada de inversión.
    const boxH = 52;
    const boxY = ctx.y - boxH + 14;
    ctx.page.drawRectangle({ x: MARGIN, y: boxY, width: A4[0] - MARGIN * 2, height: boxH, color: ACCENT_SOFT });
    ctx.page.drawRectangle({ x: MARGIN, y: boxY, width: 4, height: boxH, color: ACCENT });
    ctx.page.drawText("Inversion estimada", { x: MARGIN + 18, y: boxY + boxH - 22, size: 11, font: ctx.bold, color: INK });
    ctx.page.drawText("Validez: 15 dias - impuestos segun aplique", { x: MARGIN + 18, y: boxY + 12, size: 8, font: ctx.font, color: MUTED });
    const val = money(data.precio, data.moneda);
    ctx.page.drawText(val, { x: A4[0] - MARGIN - 18 - ctx.bold.widthOfTextAtSize(val, 20), y: boxY + boxH / 2 - 8, size: 20, font: ctx.bold, color: INK });
    ctx.y = boxY - 16;
  }

  ctx.y -= 4;
  text(ctx, "Gracias por considerar a JM Designs Worldwide. Sera un gusto construir esto contigo.", 9, { color: MUTED });
  footer(ctx);
  return ctx.doc.save();
}

type CollabPlatform = { red: string; handle: string; seguidores: string; engagement: string };
type CollabPromo = { tipo: string; cantidad: number; plataforma: string; valor: number; moneda: string; fecha: string };

export async function buildCollabPdf(data: {
  brand: string;
  influencer: string;
  nicho: string | null;
  contacto: string | null;
  plataformas: CollabPlatform[];
  doyTipo: string | null;
  doyDesc: string | null;
  doyValor: number | null;
  doyMoneda: string;
  doyEntrega: string | null;
  promos: CollabPromo[];
  estado: string;
  notas: string | null;
  fecha: string | null;
}): Promise<Uint8Array> {
  const ctx = await newCtx();
  header(ctx, data.brand || "JM Designs Worldwide", "Acuerdo de colaboración", fechaCorta(data.fecha));

  text(ctx, `Influencer: ${data.influencer}`, 11, { bold: true });
  const meta = [data.nicho, data.contacto].filter(Boolean).join("  -  ");
  if (meta) text(ctx, meta, 9, { color: MUTED });
  for (const p of data.plataformas) {
    const segs = [p.handle, p.seguidores ? `${p.seguidores} seg.` : "", p.engagement ? `${p.engagement} eng.` : ""].filter(Boolean).join(" - ");
    text(ctx, `- ${p.red}: ${segs}`, 9, { color: MUTED, indent: 8 });
  }
  ctx.y -= 8;

  text(ctx, "Mi aporte (JM Designs)", 11, { bold: true, color: ACCENT });
  text(ctx, `${data.doyTipo ?? "Proyecto"}${data.doyValor != null ? `  -  valor estimado ${money(data.doyValor, data.doyMoneda)}` : ""}`, 10);
  if (data.doyDesc) text(ctx, data.doyDesc, 9, { color: MUTED });
  if (data.doyEntrega) text(ctx, `Fecha de entrega: ${fechaCorta(data.doyEntrega)}`, 9, { color: MUTED });
  ctx.y -= 8;

  text(ctx, "Aporte del influencer", 11, { bold: true, color: ACCENT });
  if (data.promos.length === 0) text(ctx, "- (sin promociones especificadas)", 9, { color: MUTED, indent: 8 });
  for (const p of data.promos) {
    const linea = `- ${p.cantidad}x ${p.tipo} en ${p.plataforma}${p.valor ? ` - ${money(p.valor, p.moneda)}` : ""}${p.fecha ? ` - publica ${fechaCorta(p.fecha)}` : ""}`;
    text(ctx, linea, 10, { indent: 8 });
  }
  ctx.y -= 8;

  text(ctx, `Estado del acuerdo: ${data.estado}`, 10, { bold: true });
  if (data.notas) {
    ctx.y -= 4;
    text(ctx, "Notas", 11, { bold: true, color: ACCENT });
    text(ctx, data.notas, 9, { color: MUTED });
  }

  ctx.y -= 10;
  text(ctx, "Este documento resume un intercambio de colaboracion entre ambas partes.", 8, { color: MUTED });
  footer(ctx);
  return ctx.doc.save();
}
