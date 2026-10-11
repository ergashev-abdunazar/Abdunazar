import { makeQR } from '../public/js/qr.js';
import fs from 'node:fs';
fs.mkdirSync('/tmp/qr2', { recursive: true });
const meta = [];
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const alpha = 'abcdefghijklmnopqrstuvwxyz0123456789-/:.?=&';
let n = 0;
for (const ecl of ['L', 'M', 'Q', 'H']) for (let len = 20; len <= 150; len += 5) {
  let t = ''; for (let i = 0; i < len; i++) t += alpha[(rnd() * alpha.length) | 0];
  let qr; try { qr = makeQR(t, ecl); } catch (e) { continue; }
  const scale = 6, quiet = 4, N = qr.size + quiet * 2, W = N * scale;
  const buf = Buffer.alloc(W * W, 255);
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.modules[y][x])
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) buf[((y + quiet) * scale + dy) * W + (x + quiet) * scale + dx] = 0;
  fs.writeFileSync(`/tmp/qr2/${n}.pgm`, Buffer.concat([Buffer.from(`P5\n${W} ${W}\n255\n`), buf]));
  meta.push({ n, ecl, ver: qr.version, text: t }); n++;
}
fs.writeFileSync('/tmp/qr2/meta.json', JSON.stringify(meta));
console.log(n);
