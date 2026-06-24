// Genera favicon + íconos PWA desde el monograma REAL de JM (blanco) sobre fondo
// de marca. Uso: node scripts/generate-brand-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BG = "#0a0a0f";
const MARK = "public/brand/logo-mark-white.png"; // monograma blanco (transparente)

mkdirSync("public/icons", { recursive: true });

async function icon(size, out, ratio = 0.6, rx = 0.22) {
  const inner = Math.round(size * ratio);
  const mark = await sharp(MARK).resize({ width: inner, height: inner, fit: "inside" }).toBuffer();
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * rx)}" fill="${BG}"/></svg>`;
  await sharp(Buffer.from(bg)).composite([{ input: mark, gravity: "center" }]).png().toFile(out);
  console.log("✓", out);
}

await icon(192, "public/icons/icon-192.png");
await icon(512, "public/icons/icon-512.png");
await icon(512, "public/icons/icon.png");
await icon(512, "public/icons/icon-maskable-512.png", 0.46); // safe zone
await icon(180, "public/icons/apple-touch-icon.png");
await icon(32, "public/icons/favicon-32.png", 0.66, 0.16);
console.log("Listo — íconos generados desde el monograma real.");
