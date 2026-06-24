// Genera src/app/favicon.ico (multi-tamaño 16/32/48) desde el monograma real
// blanco sobre fondo de marca oscuro. Uso: node scripts/generate-favicon.mjs
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFileSync } from "node:fs";

const MARK = "public/brand/logo-mark-white.png";
const BG = "#0a0a0f";

async function squarePng(size, ratio = 0.62, rx = 0.18) {
  const inner = Math.round(size * ratio);
  const mark = await sharp(MARK).resize({ width: inner, height: inner, fit: "inside" }).toBuffer();
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * rx)}" fill="${BG}"/></svg>`;
  return sharp(Buffer.from(bg)).composite([{ input: mark, gravity: "center" }]).png().toBuffer();
}

const pngs = await Promise.all([16, 32, 48].map((s) => squarePng(s)));
writeFileSync("src/app/favicon.ico", await pngToIco(pngs));
console.log("✓ src/app/favicon.ico generado desde el monograma.");
