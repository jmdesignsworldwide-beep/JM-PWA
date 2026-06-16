/**
 * Genera todas las variantes del logo de JM a partir de UN original.
 *
 *   node scripts/generate-logo-variants.mjs [ruta-original] [--from-black]
 *
 * Por defecto lee public/brand/logo-original.png (logo sobre fondo TRANSPARENTE).
 * Si tu original es blanco sobre fondo NEGRO sólido, pasa --from-black para
 * convertir el negro en transparente primero.
 *
 * Produce (en public/brand/ y public/icons/):
 *   - logo-white.png   (logo recoloreado a BLANCO, fondo transparente)
 *   - logo-black.png   (logo recoloreado a NEGRO, fondo transparente)
 *   - icon-192.png / icon-512.png / icon-maskable-512.png (logo blanco sobre #0A0A0F)
 *   - favicon.png      (48px, logo blanco sobre #0A0A0F, siempre visible)
 */
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";

const BG = { r: 10, g: 10, b: 15, alpha: 1 }; // #0A0A0F (marca oscura)
const input = process.argv[2] || "public/brand/logo-original.png";
const fromBlack = process.argv.includes("--from-black");

if (!existsSync(input)) {
  console.error(`❌ No encuentro el original: ${input}\n   Sube tu logo a public/brand/logo-original.png y vuelve a correr.`);
  process.exit(1);
}
mkdirSync("public/brand", { recursive: true });
mkdirSync("public/icons", { recursive: true });

// 1) Normaliza a "logo sobre transparente"
let base = sharp(input).ensureAlpha();
if (fromBlack) {
  // Convierte el negro de fondo en transparencia: usa el brillo como alpha.
  const { width, height } = await base.metadata();
  const gray = await sharp(input).removeAlpha().greyscale().toBuffer();
  const rgb = await sharp(input).removeAlpha().toBuffer();
  base = sharp(rgb, { raw: undefined }).joinChannel(gray); // alpha = luminancia
  void width; void height;
}

const meta = await base.metadata();
const W = meta.width, H = meta.height;
const alpha = await base.clone().extractChannel("alpha").toBuffer();

// 2) Recolorea preservando el alpha del original
async function recolor(hex, out) {
  const color = hex === "white" ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const solid = sharp({ create: { width: W, height: H, channels: 3, background: color } });
  await solid.joinChannel(alpha).png().toFile(out);
  console.log("✓", out);
}
await recolor("white", "public/brand/logo-white.png");
await recolor("black", "public/brand/logo-black.png");

// 3) Íconos: logo BLANCO centrado sobre la marca oscura
const whiteBuf = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 255, g: 255, b: 255 } } })
  .joinChannel(alpha).png().toBuffer();

async function iconOnBg(size, pad, out) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(whiteBuf).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }]).png().toFile(out);
  console.log("✓", out);
}
await iconOnBg(192, 0.16, "public/icons/icon-192.png");
await iconOnBg(512, 0.16, "public/icons/icon-512.png");
await iconOnBg(512, 0.26, "public/icons/icon-maskable-512.png"); // safe-zone maskable
await iconOnBg(48, 0.12, "public/favicon.png");

console.log("\n✅ Variantes generadas. Revísalas en public/brand/ y public/icons/");
