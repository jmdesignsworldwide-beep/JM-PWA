import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { money } from "@/lib/format";

const A4: [number, number] = [595.28, 841.89];
const M = 50;
const INK = rgb(0.08, 0.08, 0.1);
const MUTED = rgb(0.45, 0.45, 0.5);

export async function buildFinanceReportPdf(data: {
  brand: string;
  periodo: string;
  ingresos: { DOP: number; USD: number };
  gastos: { DOP: number; USD: number };
  neto: { DOP: number; USD: number };
  porCategoria: { categoria: string; total: number }[];
  margenes: { nombre: string | null; ganancia: number; moneda: string }[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(A4);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = A4[1] - M;

  const line = (s: string, size = 10, b = false, color = INK, x = M) => {
    page.drawText(s, { x, y, size, font: b ? bold : font, color });
    y -= size + 6;
  };
  const right = (s: string, yy: number, size = 10, b = false) =>
    page.drawText(s, { x: A4[0] - M - (b ? bold : font).widthOfTextAtSize(s, size), y: yy, size, font: b ? bold : font, color: INK });

  page.drawRectangle({ x: 0, y: A4[1] - 8, width: A4[0], height: 8, color: rgb(0.31, 0.55, 1) });
  line(data.brand || "JM Designs Worldwide", 18, true);
  line(`Reporte financiero · ${data.periodo}`, 11, false, MUTED);
  y -= 8;

  line("Balance (DOP)", 13, true);
  const yi = y; line(`Ingresos`, 10, false, MUTED); right(money(data.ingresos.DOP, "DOP"), yi);
  const yg = y; line(`Gastos`, 10, false, MUTED); right(money(data.gastos.DOP, "DOP"), yg);
  const yn = y; line(`Neto`, 11, true); right(money(data.neto.DOP, "DOP"), yn, 11, true);
  if (data.ingresos.USD || data.gastos.USD) {
    y -= 4;
    line("Balance (USD)", 13, true);
    const a = y; line("Ingresos", 10, false, MUTED); right(money(data.ingresos.USD, "USD"), a);
    const b = y; line("Gastos", 10, false, MUTED); right(money(data.gastos.USD, "USD"), b);
    const c = y; line("Neto", 11, true); right(money(data.neto.USD, "USD"), c, 11, true);
  }

  y -= 8;
  line("Gastos por categoría", 13, true);
  for (const cat of data.porCategoria.slice(0, 12)) {
    const yy = y; line(`- ${cat.categoria}`, 10, false, MUTED); right(money(cat.total, "DOP"), yy);
  }

  y -= 8;
  line("Ganancia por proyecto", 13, true);
  for (const m of data.margenes.slice(0, 12)) {
    const yy = y; line(`- ${m.nombre ?? "Proyecto"}`, 10, false, MUTED); right(money(m.ganancia, m.moneda), yy);
    if (y < M + 40) break;
  }

  return doc.save();
}

export async function buildInfluencersPdf(data: {
  brand: string;
  filas: { nombre: string; handle: string; estado: string; contacto: string; manager: string }[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage(A4);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = A4[1] - M;
  const w = (s: string, x: number, size = 9, b = false) =>
    page.drawText((s ?? "").replace(/[^\x00-\xFF]/g, ""), { x, y, size, font: b ? bold : font, color: INK });

  page.drawRectangle({ x: 0, y: A4[1] - 8, width: A4[0], height: 8, color: rgb(0.31, 0.55, 1) });
  w(data.brand || "JM Designs Worldwide", M, 18, true); y -= 22;
  w("Influencers (export para campañas)", M, 11); y -= 22;

  const cols = [M, M + 130, M + 250, M + 340, M + 440];
  w("Nombre", cols[0], 9, true); w("IG", cols[1], 9, true); w("Estado", cols[2], 9, true); w("Manager", cols[3], 9, true); w("Contacto", cols[4], 9, true);
  y -= 14;
  for (const f of data.filas) {
    if (y < M + 20) { page = doc.addPage(A4); y = A4[1] - M; }
    w(f.nombre, cols[0]); w(f.handle, cols[1]); w(f.estado, cols[2]); w(f.manager, cols[3]); w(f.contacto, cols[4]);
    y -= 13;
  }
  return doc.save();
}
