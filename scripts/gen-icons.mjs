// アプリアイコン（PNG）を依存パッケージなしで生成する。
// 使い方: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** 背景色の上に、カンバンの3列を表す白い角丸バーを描く */
function drawIcon(size) {
  const bg = [79, 70, 229];
  const fg = [255, 255, 255];
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const pad = size * 0.2;
  const gap = size * 0.06;
  const colW = (size - pad * 2 - gap * 2) / 3;
  const heights = [0.6, 0.42, 0.28].map((h) => h * size);
  const top = pad;
  const r = colW * 0.25;
  const inBar = (x, y) => {
    for (let i = 0; i < 3; i++) {
      const x0 = pad + i * (colW + gap);
      const x1 = x0 + colW;
      const y0 = top;
      const y1 = top + heights[i];
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const cx = Math.min(Math.max(x, x0 + r), x1 - r);
      const cy = Math.min(Math.max(y, y0 + r), y1 - r);
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) return true;
    }
    return false;
  };
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const color = inBar(x + 0.5, y + 0.5) ? fg : bg;
      const o = row + 1 + x * 4;
      raw[o] = color[0];
      raw[o + 1] = color[1];
      raw[o + 2] = color[2];
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputs = [
  ['icons/icon-192.png', 192],
  ['icons/icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];
for (const [file, size] of outputs) {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, drawIcon(size));
  console.log(`wrote ${file} (${size}px)`);
}
