// Genera favicon + íconos PWA desde el monograma JM (M blanca sobre fondo de marca).
// Uso: node scripts/generate-brand-icons.mjs
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const BG = "#0a0a0f";
const M = "M14 82 V24 L50 58 L86 24 V82";

// scale 0..100 path into a centered box with padding (safe zone for maskable).
function svg(size, pad = 0.18, bg = BG) {
  const inner = 100;
  const s = (1 - pad * 2);
  const off = (inner * pad);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${bg}"/>
  <g transform="translate(${off},${off}) scale(${s})">
    <path d="${M}" fill="none" stroke="#ffffff" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M50 58 V84" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.85"/>
  </g>
</svg>`;
}

// favicon (transparent bg, dark-on-light not needed: browsers show on tab; use brand bg)
async function png(svgStr, size, out) {
  await sharp(Buffer.from(svgStr)).resize(size, size).png().toFile(out);
  console.log("✓", out);
}

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/brand", { recursive: true });

// Guarda el SVG fuente (reemplazable por el SVG exacto de marca).
writeFileSync("public/brand/logo.svg", svg(512, 0.18));

await png(svg(192, 0.16), 192, "public/icons/icon-192.png");
await png(svg(512, 0.16), 512, "public/icons/icon-512.png");
await png(svg(512, 0.26), 512, "public/icons/icon-maskable-512.png"); // más padding (safe zone)
await png(svg(180, 0.16), 180, "public/icons/apple-touch-icon.png");
await png(svg(32, 0.12), 32, "public/icons/favicon-32.png");
await png(svg(512, 0.16), 512, "public/icons/icon.png");
console.log("Listo.");
