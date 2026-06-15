/**
 * Genera íconos PNG placeholder para la PWA sin dependencias externas.
 * Fondo oscuro premium con un cuadro de acento (azul→púrpura).
 * Reemplázalos por el logo real de JM cuando esté listo.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function makePng(size, padding) {
  const bg = [10, 10, 15]; // #0a0a0f
  const a = [79, 140, 255]; // electric
  const b = [167, 139, 250]; // purple
  const inner = Math.floor(size * padding);
  const radius = Math.floor(size * 0.16);

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filtro None
    for (let x = 0; x < size; x++) {
      let col = bg;
      const inX = x >= inner && x < size - inner;
      const inY = y >= inner && y < size - inner;
      if (inX && inY) {
        // esquinas redondeadas simples del cuadro de acento
        const dx = Math.min(x - inner, size - inner - 1 - x);
        const dy = Math.min(y - inner, size - inner - 1 - y);
        const corner = dx < radius && dy < radius;
        const outside =
          corner && (radius - dx) ** 2 + (radius - dy) ** 2 > radius ** 2;
        if (!outside) {
          const t = (x + y) / (2 * size); // gradiente diagonal
          col = [
            Math.round(a[0] + (b[0] - a[0]) * t),
            Math.round(a[1] + (b[1] - a[1]) * t),
            Math.round(a[2] + (b[2] - a[2]) * t),
          ];
        }
      }
      raw[p++] = col[0];
      raw[p++] = col[1];
      raw[p++] = col[2];
      raw[p++] = 255;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function write(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log("✓", path);
}

write("public/icons/icon-192.png", makePng(192, 0.16));
write("public/icons/icon-512.png", makePng(512, 0.16));
// Maskable: más relleno (safe zone) para que no se recorte el logo.
write("public/icons/icon-maskable-512.png", makePng(512, 0.26));
