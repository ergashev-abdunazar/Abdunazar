import { makeQR } from '../public/js/qr.js';
import fs from 'node:fs';
const cases = [
  'https://taklifnoma.uz/i/anvar-va-dilnoza',
  'a', 'Salom dunyo',
  'https://example.com/i/' + 'x'.repeat(60),
  'https://example.com/i/' + 'abc123-'.repeat(15),
  'https://taklifnoma.uz/i/' + 'q'.repeat(120) + "?g=O'tkir aka",
  'https://taklifnoma.uz/i/' + 'k'.repeat(170)
];
fs.mkdirSync('/tmp/qr', { recursive: true });
const meta = [];
cases.forEach((t, idx) => {
  for (const ecl of ['L', 'M', 'Q']) {
    let qr;
    try { qr = makeQR(t, ecl); } catch (e) { meta.push({ idx, ecl, err: e.message }); continue; }
    const scale = 8, quiet = 4, n = qr.size + quiet * 2, W = n * scale;
    const buf = Buffer.alloc(W * W, 255);
    for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.modules[y][x]) {
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) buf[((y + quiet) * scale + dy) * W + (x + quiet) * scale + dx] = 0;
    }
    fs.writeFileSync(`/tmp/qr/${idx}_${ecl}.pgm`, Buffer.concat([Buffer.from(`P5\n${W} ${W}\n255\n`), buf]));
    meta.push({ idx, ecl, ver: qr.version, text: t });
  }
});
fs.writeFileSync('/tmp/qr/meta.json', JSON.stringify(meta));
console.log('generated', meta.length);
