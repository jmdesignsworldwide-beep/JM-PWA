import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { money, fechaCorta } from "@/lib/format";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const INK = rgb(0.08, 0.08, 0.1);
const MUTED = rgb(0.45, 0.45, 0.5);
const ACCENT = rgb(0.31, 0.55, 1);

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

function header(ctx: Ctx, brand: string, docTitle: string) {
  ctx.page.drawRectangle({ x: 0, y: A4[1] - 8, width: A4[0], height: 8, color: ACCENT });
  text(ctx, brand || "JM Designs Worldwide", 18, { bold: true });
  text(ctx, docTitle, 11, { color: MUTED });
  ctx.y -= 6;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: A4[0] - MARGIN, y: ctx.y }, thickness: 1, color: rgb(0.85, 0.85, 0.88) });
  ctx.y -= 16;
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
  header(ctx, data.brand, "Contrato de servicios");
  text(ctx, `Cliente: ${data.cliente}`, 10, { bold: true });
  text(ctx, `Estado: ${data.estado}${data.fecha ? ` · ${fechaCorta(data.fecha)}` : ""}`, 9, { color: MUTED });
  ctx.y -= 8;
  text(ctx, data.contenido || "—", 10);
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
  header(ctx, data.brand, data.esFiscal ? "Factura con valor fiscal" : "Factura");
  text(ctx, `Cliente: ${data.cliente}`, 10, { bold: true });
  if (data.esFiscal) {
    text(ctx, `RNC: ${data.rnc ?? "—"}   NCF: ${data.ncf ?? "PENDIENTE (modulo fiscal)"}`, 9, { color: MUTED });
  }
  text(ctx, `Fecha: ${fechaCorta(data.fecha)}   Estado: ${data.estadoPago}`, 9, { color: MUTED });
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
  header(ctx, data.brand, "Cotización");
  text(ctx, `Cliente: ${data.cliente}`, 10, { bold: true });
  const meta = [data.industria, data.tipo, data.rama === "designs" ? "Software" : "Imprenta"].filter(Boolean).join(" · ");
  if (meta) text(ctx, meta, 9, { color: MUTED });
  text(ctx, `Fecha: ${fechaCorta(data.fecha)}`, 9, { color: MUTED });
  ctx.y -= 8;

  text(ctx, "Incluye:", 11, { bold: true });
  for (const l of data.lineas) text(ctx, `- ${l}`, 10, { indent: 8 });

  if (data.notas) {
    ctx.y -= 6;
    text(ctx, "Notas:", 11, { bold: true });
    text(ctx, data.notas, 10);
  }

  if (data.precio != null) {
    ctx.y -= 10;
    ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: A4[0] - MARGIN, y: ctx.y }, thickness: 1, color: rgb(0.85, 0.85, 0.88) });
    ctx.y -= 18;
    const val = money(data.precio, data.moneda);
    ctx.page.drawText("Inversión estimada", { x: A4[0] - MARGIN - 240, y: ctx.y, size: 13, font: ctx.bold, color: INK });
    ctx.page.drawText(val, { x: A4[0] - MARGIN - ctx.bold.widthOfTextAtSize(val, 13), y: ctx.y, size: 13, font: ctx.bold, color: INK });
  }
  return ctx.doc.save();
}
