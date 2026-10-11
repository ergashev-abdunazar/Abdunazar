import { renderMusic, MUSIC_PRESETS, toWav, mix } from '../public/js/audio.js';
import fs from 'fs';
fs.mkdirSync('/tmp/audio', { recursive: true });
for (const p of MUSIC_PRESETS) {
  const t0 = Date.now();
  const a = renderMusic(p.id, 15);
  let pk = 0, sq = 0, nan = 0;
  for (let i = 0; i < a.L.length; i++) { const v = a.L[i]; if (!Number.isFinite(v)) nan++; pk = Math.max(pk, Math.abs(v)); sq += v * v; }
  console.log(p.id, 'ms', Date.now() - t0, 'peak', pk.toFixed(3), 'rms', Math.sqrt(sq / a.L.length).toFixed(3), 'nan', nan, 'dur', a.L.length / a.sampleRate);
  fs.writeFileSync(`/tmp/audio/${p.id}.wav`, Buffer.from(toWav(a)));
}
const l = renderMusic('nozik', 30, { loop: true });
console.log('loop dur', l.duration, l.L.length / l.sampleRate);
const t0 = Date.now(); renderMusic('milliy', 60); console.log('60s milliy ms', Date.now() - t0);
