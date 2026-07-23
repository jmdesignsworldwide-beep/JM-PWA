import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { money, fechaCorta } from "@/lib/format";
import { EMPRESA, whatsappBonito, instagramArroba } from "@/lib/empresa";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const CONTENT_W = A4[0] - MARGIN * 2;

// Paleta de marca JM (consistente con el tema de la app).
const INK = rgb(0.1, 0.11, 0.14);
const MUTED = rgb(0.46, 0.48, 0.54);
const ACCENT = rgb(0.18, 0.42, 0.96); // electric
const ACCENT_DEEP = rgb(0.36, 0.3, 0.92); // brand-purple
const BRAND_DARK = rgb(0.05, 0.06, 0.09);
const ON_DARK = rgb(1, 1, 1);
const ON_DARK_MUTED = rgb(0.72, 0.74, 0.8);
const HAIRLINE = rgb(0.88, 0.88, 0.91);
const TABLE_HEAD = rgb(0.95, 0.96, 0.99);
const ZEBRA = rgb(0.975, 0.978, 0.99);

const BAND_H = 98;

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
  logo: PDFImage | null;
  y: number;
};

// ── Carga del logo real (con caché en memoria) ──────────────────────────────
const assetCache: Record<string, Uint8Array | null> = {};
async function loadAsset(rel: string): Promise<Uint8Array | null> {
  if (rel in assetCache) return assetCache[rel];
  try {
    const buf = await readFile(path.join(process.cwd(), "public", rel));
    assetCache[rel] = new Uint8Array(buf);
  } catch {
    assetCache[rel] = null;
  }
  return assetCache[rel];
}

function ensureSpace(ctx: Ctx, needed = 16) {
  if (ctx.y - needed < MARGIN + 24) {
    ctx.page = ctx.doc.addPage(A4);
    ctx.y = A4[1] - MARGIN;
  }
}

function rightText(page: PDFPage, str: string, xRight: number, y: number, size: number, font: PDFFont, color = INK) {
  const s = clean(str);
  page.drawText(s, { x: xRight - font.widthOfTextAtSize(s, size), y, size, font, color });
}

function text(ctx: Ctx, str: string, size = 10, opts: { bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number } = {}) {
  const font = opts.bold ? ctx.bold : ctx.font;
  const maxW = CONTENT_W - (opts.indent ?? 0);
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

/** Encabezado premium: banda oscura de marca, logo real, marca y título. */
function header(ctx: Ctx, brand: string, docTitle: string, dateStr?: string | null) {
  const top = A4[1];
  const bandTop = top;
  const bandBottom = top - BAND_H;
  const midY = bandBottom + BAND_H / 2;

  // Banda oscura de marca + filo de acento arriba.
  ctx.page.drawRectangle({ x: 0, y: bandBottom, width: A4[0], height: BAND_H, color: BRAND_DARK });
  ctx.page.drawRectangle({ x: 0, y: bandTop - 5, width: A4[0], height: 5, color: ACCENT });

  // Logo real (mark blanco sobre la banda oscura). Fallback: monograma dibujado.
  let textX = MARGIN;
  const logoH = 48;
  if (ctx.logo) {
    const dims = ctx.logo.scale(logoH / ctx.logo.height);
    ctx.page.drawImage(ctx.logo, { x: MARGIN, y: midY - dims.height / 2, width: dims.width, height: dims.height });
    textX = MARGIN + dims.width + 16;
  } else {
    ctx.page.drawRectangle({ x: MARGIN, y: midY - 22, width: 44, height: 44, color: rgb(1, 1, 1) });
    ctx.page.drawText("JM", { x: MARGIN + 22 - ctx.bold.widthOfTextAtSize("JM", 18) / 2, y: midY - 7, size: 18, font: ctx.bold, color: BRAND_DARK });
    textX = MARGIN + 60;
  }

  // Marca + tagline (blanco).
  ctx.page.drawText(clean(brand || EMPRESA.nombre), { x: textX, y: midY + 4, size: 17, font: ctx.bold, color: ON_DARK });
  ctx.page.drawText(clean(EMPRESA.tagline), { x: textX, y: midY - 13, size: 8.5, font: ctx.font, color: ON_DARK_MUTED });

  // Título del documento + fecha (derecha, blanco/acento claro).
  rightText(ctx.page, docTitle, A4[0] - MARGIN, midY + 5, 14, ctx.bold, ON_DARK);
  if (dateStr) rightText(ctx.page, dateStr, A4[0] - MARGIN, midY - 12, 9.5, ctx.font, ON_DARK_MUTED);

  ctx.y = bandBottom - 34;
}

/** Pie premium: filo + identidad de la empresa (toma todo de EMPRESA). */
function footer(ctx: Ctx) {
  const y = 40;
  ctx.page.drawRectangle({ x: MARGIN, y: y + 18, width: CONTENT_W, height: 1.4, color: ACCENT });
  const parts = [EMPRESA.nombre, `WhatsApp ${whatsappBonito()}`, EMPRESA.email, instagramArroba()].filter(Boolean);
  const line = clean(parts.join("    ·    "));
  const w = ctx.font.widthOfTextAtSize(line, 8.5);
  ctx.page.drawText(line, { x: A4[0] / 2 - w / 2, y, size: 8.5, font: ctx.font, color: MUTED });
}

/** Etiqueta de sección con punto de acento. */
function sectionLabel(ctx: Ctx, label: string) {
  ensureSpace(ctx, 22);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 1, width: 3, height: 11, color: ACCENT });
  ctx.page.drawText(clean(label.toUpperCase()), { x: MARGIN + 9, y: ctx.y, size: 9, font: ctx.bold, color: ACCENT });
  ctx.y -= 18;
}

async function newCtx(): Promise<Ctx> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(A4);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  const bytes = await loadAsset(EMPRESA.logoClaro);
  if (bytes) {
    try { logo = await doc.embedPng(bytes); } catch { logo = null; }
  }
  return { doc, page, font, bold, logo, y: A4[1] - MARGIN };
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
  sectionLabel(ctx, "Partes");
  text(ctx, `Cliente: ${data.cliente}`, 10.5, { bold: true });
  text(ctx, `Estado: ${data.estado}`, 9, { color: MUTED });
  ctx.y -= 10;
  sectionLabel(ctx, "Términos del acuerdo");
  text(ctx, data.contenido || "-", 10);
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
  const titulo = data.esFiscal ? "Factura" : "Recibo";
  header(ctx, data.brand, titulo, fechaCorta(data.fecha));

  // ── Bloque cliente (izq) + meta (der) ──
  const blockTop = ctx.y;
  ctx.page.drawText("FACTURADO A", { x: MARGIN, y: blockTop, size: 8, font: ctx.bold, color: MUTED });
  ctx.page.drawText(clean(data.cliente || "Cliente"), { x: MARGIN, y: blockTop - 17, size: 13, font: ctx.bold, color: INK });
  let leftY = blockTop - 33;
  if (data.esFiscal) {
    ctx.page.drawText(clean(`RNC: ${data.rnc ?? "-"}    NCF: ${data.ncf ?? "PENDIENTE (modulo fiscal)"}`), { x: MARGIN, y: leftY, size: 9, font: ctx.font, color: MUTED });
    leftY -= 14;
  }

  // Meta derecha: documento, fecha y chip de estado.
  rightText(ctx.page, data.esFiscal ? "Factura con valor fiscal" : "Recibo de pago", A4[0] - MARGIN, blockTop, 9, ctx.font, MUTED);
  rightText(ctx.page, `Fecha: ${fechaCorta(data.fecha)}`, A4[0] - MARGIN, blockTop - 16, 9.5, ctx.font, INK);
  // Chip de estado.
  const estado = clean(data.estadoPago);
  const chipW = ctx.bold.widthOfTextAtSize(estado, 8.5) + 18;
  const pagado = /pagad/i.test(estado);
  const chipColor = pagado ? rgb(0.13, 0.6, 0.33) : ACCENT;
  const chipBg = pagado ? rgb(0.9, 0.97, 0.92) : rgb(0.92, 0.95, 1);
  ctx.page.drawRectangle({ x: A4[0] - MARGIN - chipW, y: blockTop - 36, width: chipW, height: 16, color: chipBg });
  rightText(ctx.page, estado, A4[0] - MARGIN - 9, blockTop - 32, 8.5, ctx.bold, chipColor);

  ctx.y = Math.min(leftY, blockTop - 44) - 16;

  // ── Tabla de items ──
  const cDesc = MARGIN + 12;
  const cCant = 330;            // centro
  const cPrecioR = 452;        // derecha
  const cImporteR = A4[0] - MARGIN - 12;
  const rowH = 24;

  // Cabecera de tabla.
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 8, width: CONTENT_W, height: 24, color: TABLE_HEAD });
  const headY = ctx.y - 2;
  ctx.page.drawText("DESCRIPCION", { x: cDesc, y: headY, size: 8.5, font: ctx.bold, color: MUTED });
  const cantLbl = "CANT.";
  ctx.page.drawText(cantLbl, { x: cCant - ctx.bold.widthOfTextAtSize(cantLbl, 8.5) / 2, y: headY, size: 8.5, font: ctx.bold, color: MUTED });
  rightText(ctx.page, "PRECIO", cPrecioR, headY, 8.5, ctx.bold, MUTED);
  rightText(ctx.page, "IMPORTE", cImporteR, headY, 8.5, ctx.bold, MUTED);
  ctx.y -= 24;

  const items = data.items.length ? data.items : [{ producto: "Servicio", cantidad: 1, subtotal: data.subtotal }];
  items.forEach((it, i) => {
    ensureSpace(ctx, rowH + 4);
    const cant = it.cantidad ?? 1;
    const imp = it.subtotal ?? 0;
    const unit = cant ? imp / cant : imp;
    if (i % 2 === 1) ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 8, width: CONTENT_W, height: rowH, color: ZEBRA });
    const ty = ctx.y;
    // Descripción (truncada al ancho de su columna).
    let desc = clean(it.producto ?? "Item");
    const descMax = cCant - 36 - cDesc;
    while (desc && ctx.font.widthOfTextAtSize(desc, 10) > descMax) desc = desc.slice(0, -2);
    ctx.page.drawText(desc, { x: cDesc, y: ty, size: 10, font: ctx.font, color: INK });
    const cs = String(cant);
    ctx.page.drawText(cs, { x: cCant - ctx.font.widthOfTextAtSize(cs, 10) / 2, y: ty, size: 10, font: ctx.font, color: INK });
    rightText(ctx.page, money(unit, data.moneda), cPrecioR, ty, 10, ctx.font, MUTED);
    rightText(ctx.page, money(imp, data.moneda), cImporteR, ty, 10, ctx.bold, INK);
    ctx.y -= rowH;
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y + 8, width: CONTENT_W, height: 0.5, color: HAIRLINE });
  });

  // ── Totales (bloque derecho) ──
  ctx.y -= 14;
  ensureSpace(ctx, 90);
  const blockW = 250;
  const bx = A4[0] - MARGIN - blockW;
  const labelX = bx + 4;
  const valR = A4[0] - MARGIN - 8;
  ctx.page.drawText("Subtotal", { x: labelX, y: ctx.y, size: 10, font: ctx.font, color: MUTED });
  rightText(ctx.page, money(data.subtotal, data.moneda), valR, ctx.y, 10, ctx.font, INK);
  ctx.y -= 18;
  ctx.page.drawText(data.esFiscal ? "ITBIS (18%)" : "ITBIS", { x: labelX, y: ctx.y, size: 10, font: ctx.font, color: MUTED });
  rightText(ctx.page, money(data.itbis, data.moneda), valR, ctx.y, 10, ctx.font, INK);
  ctx.y -= 24;
  // Caja TOTAL con acento.
  const boxH = 34;
  ctx.page.drawRectangle({ x: bx, y: ctx.y - boxH + 18, width: blockW, height: boxH, color: ACCENT });
  ctx.page.drawText("TOTAL", { x: labelX + 6, y: ctx.y - 2, size: 12, font: ctx.bold, color: ON_DARK });
  rightText(ctx.page, money(data.total, data.moneda), valR, ctx.y - 3, 15, ctx.bold, ON_DARK);
  ctx.y -= boxH + 10;

  // Nota cálida.
  ctx.y -= 6;
  text(ctx, "Gracias por confiar en nosotros. Cualquier duda, escríbenos por WhatsApp.", 9, { color: MUTED });

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
  ctx.page.drawText("PREPARADA PARA", { x: MARGIN, y: ctx.y, size: 8, font: ctx.bold, color: MUTED });
  ctx.page.drawText(clean(data.cliente || "Cliente"), { x: MARGIN, y: ctx.y - 17, size: 13, font: ctx.bold, color: INK });
  ctx.y -= 33;
  const meta = [data.industria, data.tipo, data.rama === "designs" ? "Software" : "Imprenta"].filter(Boolean).join("  -  ");
  if (meta) { text(ctx, meta, 9, { color: MUTED }); }
  ctx.y -= 10;

  sectionLabel(ctx, "Tu solución incluye");
  for (const l of data.lineas) text(ctx, `-  ${l}`, 10, { indent: 8 });

  if (data.notas) {
    ctx.y -= 8;
    sectionLabel(ctx, "Notas");
    text(ctx, data.notas, 10);
  }

  if (data.precio != null) {
    ctx.y -= 16;
    ensureSpace(ctx, 70);
    const boxH = 56;
    const boxY = ctx.y - boxH + 14;
    ctx.page.drawRectangle({ x: MARGIN, y: boxY, width: CONTENT_W, height: boxH, color: rgb(0.95, 0.96, 1) });
    ctx.page.drawRectangle({ x: MARGIN, y: boxY, width: 5, height: boxH, color: ACCENT_DEEP });
    ctx.page.drawText("Inversion estimada", { x: MARGIN + 20, y: boxY + boxH - 24, size: 11, font: ctx.bold, color: INK });
    ctx.page.drawText("Validez: 15 dias - impuestos segun aplique", { x: MARGIN + 20, y: boxY + 13, size: 8, font: ctx.font, color: MUTED });
    rightText(ctx.page, money(data.precio, data.moneda), A4[0] - MARGIN - 20, boxY + boxH / 2 - 8, 21, ctx.bold, INK);
    ctx.y = boxY - 18;
  }

  ctx.y -= 4;
  text(ctx, `Gracias por considerar a ${EMPRESA.nombre}. Sera un gusto construir esto contigo.`, 9, { color: MUTED });
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
  header(ctx, data.brand || EMPRESA.nombre, "Acuerdo de colaboración", fechaCorta(data.fecha));

  text(ctx, `Influencer: ${data.influencer}`, 11, { bold: true });
  const meta = [data.nicho, data.contacto].filter(Boolean).join("  -  ");
  if (meta) text(ctx, meta, 9, { color: MUTED });
  for (const p of data.plataformas) {
    const segs = [p.handle, p.seguidores ? `${p.seguidores} seg.` : "", p.engagement ? `${p.engagement} eng.` : ""].filter(Boolean).join(" - ");
    text(ctx, `- ${p.red}: ${segs}`, 9, { color: MUTED, indent: 8 });
  }
  ctx.y -= 8;

  sectionLabel(ctx, `Mi aporte (${EMPRESA.nombre})`);
  text(ctx, `${data.doyTipo ?? "Proyecto"}${data.doyValor != null ? `  -  valor estimado ${money(data.doyValor, data.doyMoneda)}` : ""}`, 10);
  if (data.doyDesc) text(ctx, data.doyDesc, 9, { color: MUTED });
  if (data.doyEntrega) text(ctx, `Fecha de entrega: ${fechaCorta(data.doyEntrega)}`, 9, { color: MUTED });
  ctx.y -= 8;

  sectionLabel(ctx, "Aporte del influencer");
  if (data.promos.length === 0) text(ctx, "- (sin promociones especificadas)", 9, { color: MUTED, indent: 8 });
  for (const p of data.promos) {
    const linea = `- ${p.cantidad}x ${p.tipo} en ${p.plataforma}${p.valor ? ` - ${money(p.valor, p.moneda)}` : ""}${p.fecha ? ` - publica ${fechaCorta(p.fecha)}` : ""}`;
    text(ctx, linea, 10, { indent: 8 });
  }
  ctx.y -= 8;

  text(ctx, `Estado del acuerdo: ${data.estado}`, 10, { bold: true });
  if (data.notas) {
    ctx.y -= 4;
    sectionLabel(ctx, "Notas");
    text(ctx, data.notas, 9, { color: MUTED });
  }

  ctx.y -= 10;
  text(ctx, "Este documento resume un intercambio de colaboracion entre ambas partes.", 8, { color: MUTED });
  footer(ctx);
  return ctx.doc.save();
}
