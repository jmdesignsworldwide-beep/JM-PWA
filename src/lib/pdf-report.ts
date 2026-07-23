import { rgb } from "pdf-lib";
import { money, fechaCorta } from "@/lib/format";
import {
  newCtx, header, footer, sectionLabel, kpiCard, bar, chip, text, rightText, ensureSpace, clean,
  A4, MARGIN, CONTENT_W, INK, MUTED, ACCENT, ZEBRA, TABLE_HEAD, HAIRLINE,
} from "@/lib/pdf";

const SUCCESS = rgb(0.15, 0.63, 0.38);
const DANGER = rgb(0.86, 0.24, 0.29);

/** Reporte financiero premium: KPIs, gastos por categoría y margen por proyecto. */
export async function buildFinanceReportPdf(data: {
  brand: string;
  periodo: string;
  ingresos: { DOP: number; USD: number };
  gastos: { DOP: number; USD: number };
  neto: { DOP: number; USD: number };
  porCategoria: { categoria: string; total: number }[];
  margenes: { nombre: string | null; ganancia: number; moneda: string }[];
}): Promise<Uint8Array> {
  const ctx = await newCtx();
  header(ctx, data.brand, "Reporte financiero", data.periodo);

  // ── Fila de KPIs: Ingresos / Gastos / Neto ──
  const gap = 14;
  const cardW = (CONTENT_W - gap * 2) / 3;
  const cardH = 62;
  const top = ctx.y;
  const usd = (v: number) => (v ? money(v, "USD") : null);
  kpiCard(ctx, MARGIN, top, cardW, cardH, "Ingresos", money(data.ingresos.DOP, "DOP"), usd(data.ingresos.USD), SUCCESS);
  kpiCard(ctx, MARGIN + cardW + gap, top, cardW, cardH, "Gastos", money(data.gastos.DOP, "DOP"), usd(data.gastos.USD), DANGER);
  kpiCard(ctx, MARGIN + (cardW + gap) * 2, top, cardW, cardH, "Neto", money(data.neto.DOP, "DOP"), usd(data.neto.USD), ACCENT);
  ctx.y = top - cardH - 22;

  // ── Gastos por categoría (barras) ──
  sectionLabel(ctx, "Gastos por categoría");
  const cats = data.porCategoria.slice(0, 10);
  const maxCat = Math.max(1, ...cats.map((c) => c.total));
  for (const c of cats) {
    ensureSpace(ctx, 22);
    const y = ctx.y;
    ctx.page.drawText(clean(c.categoria), { x: MARGIN, y, size: 9.5, font: ctx.font, color: INK });
    rightText(ctx.page, money(c.total, "DOP"), A4[0] - MARGIN, y, 9.5, ctx.bold, INK);
    bar(ctx, MARGIN, y - 9, CONTENT_W, c.total / maxCat);
    ctx.y -= 24;
  }

  // ── Ganancia por proyecto ──
  ctx.y -= 8;
  sectionLabel(ctx, "Ganancia real por proyecto");
  for (const m of data.margenes.slice(0, 12)) {
    ensureSpace(ctx, 18);
    const y = ctx.y;
    ctx.page.drawText(clean(m.nombre ?? "Proyecto"), { x: MARGIN, y, size: 9.5, font: ctx.font, color: INK });
    rightText(ctx.page, money(m.ganancia, m.moneda), A4[0] - MARGIN, y, 9.5, ctx.bold, m.ganancia >= 0 ? SUCCESS : DANGER);
    ctx.page.drawRectangle({ x: MARGIN, y: y - 6, width: CONTENT_W, height: 0.5, color: HAIRLINE });
    ctx.y -= 18;
  }

  footer(ctx);
  return ctx.doc.save();
}

const ESTADO_COLOR: Record<string, ReturnType<typeof rgb>> = {
  Activo: rgb(0.36, 0.3, 0.92),
  Completado: SUCCESS,
  Negociando: ACCENT,
};

/** Export de influencers premium: tabla con banda, zebra y chip de estado. */
export async function buildInfluencersPdf(data: {
  brand: string;
  filas: { nombre: string; handle: string; estado: string; contacto: string; manager: string }[];
}): Promise<Uint8Array> {
  const ctx = await newCtx();
  header(ctx, data.brand, "Influencers", fechaCorta(new Date().toISOString().slice(0, 10)));
  text(ctx, "Directorio para campañas y seguimiento.", 9, { color: MUTED });
  ctx.y -= 8;

  const cNom = MARGIN + 12;
  const cIg = MARGIN + 165;
  const cEstado = MARGIN + 285;
  const cManagerR = A4[0] - MARGIN - 12;
  const rowH = 24;

  // Cabecera de tabla.
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 8, width: CONTENT_W, height: 24, color: TABLE_HEAD });
  const hy = ctx.y - 2;
  ctx.page.drawText("NOMBRE", { x: cNom, y: hy, size: 8.5, font: ctx.bold, color: MUTED });
  ctx.page.drawText("INSTAGRAM", { x: cIg, y: hy, size: 8.5, font: ctx.bold, color: MUTED });
  ctx.page.drawText("ESTADO", { x: cEstado, y: hy, size: 8.5, font: ctx.bold, color: MUTED });
  rightText(ctx.page, "MANAGER", cManagerR, hy, 8.5, ctx.bold, MUTED);
  ctx.y -= 24;

  data.filas.forEach((f, i) => {
    ensureSpace(ctx, rowH + 4);
    if (i % 2 === 1) ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 8, width: CONTENT_W, height: rowH, color: ZEBRA });
    const y = ctx.y;
    ctx.page.drawText(clean(f.nombre), { x: cNom, y, size: 10, font: ctx.bold, color: INK });
    ctx.page.drawText(clean(f.handle || "-"), { x: cIg, y, size: 9.5, font: ctx.font, color: MUTED });
    const col = ESTADO_COLOR[f.estado] ?? MUTED;
    chip(ctx, f.estado, cEstado, y, col, rgb(0.96, 0.97, 1));
    rightText(ctx.page, clean(f.manager || "Independiente"), cManagerR, y, 9.5, ctx.font, MUTED);
    ctx.y -= rowH;
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y + 8, width: CONTENT_W, height: 0.5, color: HAIRLINE });
  });

  footer(ctx);
  return ctx.doc.save();
}
