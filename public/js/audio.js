// Musiqa: tashqi fayllarsiz, JS orqali sintez qilinadi (Karplus-Strong torlar, pianino, marimba, pad, qo'ng'iroq, doira).
// Brauzer va Node'da bir xil ishlaydi (DOM'ga bog'liq emas), shuning uchun avtomatik sinash mumkin.

export const SR = 32000;

export const MUSIC_PRESETS = [
  { id: 'nozik', label: 'Nozik', desc: 'Yumshoq pianino va pad', bpm: 72 },
  { id: 'milliy', label: 'Milliy', desc: 'Dutar va doira', bpm: 96 },
  { id: 'quvnoq', label: 'Quvnoq', desc: 'Marimba, bolalar uchun', bpm: 118 },
  { id: 'tantanali', label: 'Tantanali', desc: 'Bayramona, qo\'ng\'iroqlar', bpm: 96 },
  { id: 'sokin', label: 'Sokin', desc: 'Osoyishta fon', bpm: 60 }
];

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function mkRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- bufer ---------------- */
function makeBus(len) { return { L: new Float32Array(len), R: new Float32Array(len), len }; }

function addTo(bus, start, data, amp, pan) {
  const i0 = Math.max(0, Math.round(start * SR));
  const gl = amp * Math.cos((pan + 1) * Math.PI / 4), gr = amp * Math.sin((pan + 1) * Math.PI / 4);
  const n = Math.min(data.length, bus.len - i0);
  for (let i = 0; i < n; i++) { const v = data[i]; bus.L[i0 + i] += v * gl; bus.R[i0 + i] += v * gr; }
}

/* ---------------- asboblar (har biri mono Float32Array qaytaradi) ---------------- */
// Karplus-Strong tor
function pluck(freq, dur, rnd, bright = 0.5, decay = 0.996) {
  const n = Math.max(2, Math.round(SR / freq));
  const len = Math.floor(dur * SR);
  const out = new Float32Array(len);
  const buf = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) { const w = rnd() * 2 - 1; buf[i] = prev + (w - prev) * (0.35 + bright * 0.65); prev = buf[i]; }
  let idx = 0, last = 0;
  const damp = 0.5 + 0.5 * (0.35 + bright * 0.6);
  for (let i = 0; i < len; i++) {
    const cur = buf[idx];
    const nxt = buf[(idx + 1) % n];
    const v = (cur * damp + nxt * (1 - damp)) * decay;
    buf[idx] = v;
    idx = (idx + 1) % n;
    out[i] = cur;
    last = cur;
  }
  // yumshoq tugash
  const rel = Math.min(len, Math.floor(0.05 * SR));
  for (let i = 0; i < rel; i++) out[len - 1 - i] *= i / rel;
  return out;
}

// qo'shiluvchi sintez: partials = [[ratio, amp, decaySec]]
function additive(freq, dur, partials, attack = 0.004, detune = 0) {
  const len = Math.floor(dur * SR);
  const out = new Float32Array(len);
  for (const [r, a, d] of partials) {
    const f = freq * r * (1 + detune);
    if (f > SR / 2.2) continue;
    const w = 2 * Math.PI * f / SR;
    const k = Math.exp(-1 / (d * SR));
    let env = 1, ph = 0;
    for (let i = 0; i < len; i++) {
      const at = i < attack * SR ? i / (attack * SR) : 1;
      out[i] += Math.sin(ph) * a * env * at;
      ph += w; env *= k;
    }
  }
  const rel = Math.min(len, Math.floor(0.04 * SR));
  for (let i = 0; i < rel; i++) out[len - 1 - i] *= i / rel;
  return out;
}

function piano(freq, dur, rnd) {
  const p = [];
  for (let n = 1; n <= 7; n++) p.push([n * (1 + 0.0004 * n * n), 1 / Math.pow(n, 1.25), Math.max(0.25, 2.6 / Math.pow(n, 0.8))]);
  const out = additive(freq, dur, p, 0.003, (rnd() - 0.5) * 0.0008);
  // bolg'a zarbasi
  const nl = Math.floor(0.012 * SR);
  for (let i = 0; i < nl && i < out.length; i++) out[i] += (rnd() * 2 - 1) * 0.05 * (1 - i / nl);
  return out;
}
const marimba = (freq, dur) => additive(freq, dur, [[1, 1, 0.7], [3.93, 0.32, 0.16], [9.2, 0.1, 0.06]], 0.002);
const bell = (freq, dur) => additive(freq, dur, [[1, 1, 2.8], [2.76, 0.5, 1.8], [5.4, 0.28, 1.1], [8.93, 0.16, 0.6]], 0.002);
const sine = (freq, dur, att = 0.01) => additive(freq, dur, [[1, 1, 4], [2, 0.12, 2]], att);

// pad: bir necha detune qilingan arra to'lqin, past chastotali filtr
function padNote(freq, dur, att, rel, bright = 0.12, voices = 3) {
  const len = Math.floor((dur + rel) * SR);
  const out = new Float32Array(len);
  const dets = voices === 1 ? [0] : voices === 2 ? [-0.004, 0.004] : [-0.006, 0, 0.006];
  const ph = dets.map((d, i) => (i * 0.37) % 1);
  const inc = dets.map((d) => freq * (1 + d) / SR);
  let lp = 0;
  const a = bright;
  for (let i = 0; i < len; i++) {
    let s = 0;
    for (let v = 0; v < dets.length; v++) { ph[v] += inc[v]; if (ph[v] >= 1) ph[v] -= 1; s += (ph[v] * 2 - 1); }
    s /= dets.length;
    lp += (s - lp) * a;
    const t = i / SR;
    let e = t < att ? t / att : 1;
    if (t > dur) e *= Math.max(0, 1 - (t - dur) / rel);
    out[i] = lp * e;
  }
  return out;
}

function kick(rnd) {
  const len = Math.floor(0.28 * SR); const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; const f = 48 + 90 * Math.exp(-t * 28);
    ph += 2 * Math.PI * f / SR;
    out[i] = Math.sin(ph) * Math.exp(-t * 11);
  }
  return out;
}
function doira(kind, rnd) { // "dum" (past) va "tak" (yuqori)
  const len = Math.floor((kind === 'dum' ? 0.32 : 0.14) * SR); const out = new Float32Array(len);
  let ph = 0, hp = 0, prev = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if (kind === 'dum') {
      const f = 70 + 75 * Math.exp(-t * 22); ph += 2 * Math.PI * f / SR;
      out[i] = Math.sin(ph) * Math.exp(-t * 9) * 0.95 + (rnd() * 2 - 1) * 0.12 * Math.exp(-t * 40);
    } else {
      const n = rnd() * 2 - 1; hp = n - prev; prev = n;
      ph += 2 * Math.PI * 1500 / SR;
      out[i] = (hp * 0.55 + Math.sin(ph) * 0.3) * Math.exp(-t * 38);
    }
  }
  return out;
}
function clap(rnd) {
  const len = Math.floor(0.16 * SR); const out = new Float32Array(len);
  let lp = 0, hp = 0, prev = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; const n = rnd() * 2 - 1;
    hp = n - prev; prev = n; lp += (hp - lp) * 0.5;
    const e = Math.exp(-t * 30) + 0.6 * Math.exp(-Math.max(0, t - 0.012) * 40) * (t > 0.012 ? 1 : 0);
    out[i] = lp * e;
  }
  return out;
}
function tick(rnd) {
  const len = Math.floor(0.05 * SR); const out = new Float32Array(len); let ph = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; ph += 2 * Math.PI * 1700 / SR; out[i] = Math.sin(ph) * Math.exp(-t * 90) * 0.7; }
  return out;
}

/* ---------------- effektlar ---------------- */
function reverb(bus, mix = 0.28, size = 1) {
  const combs = [0.0297, 0.0371, 0.0411, 0.0437].map((s) => Math.round(s * size * SR));
  const aps = [0.005, 0.0017].map((s) => Math.round(s * SR));
  const fb = 0.82;
  const proc = (inp, spread) => {
    const out = new Float32Array(inp.length);
    for (const c0 of combs) {
      const c = c0 + spread;
      const d = new Float32Array(c); let ix = 0, lp = 0;
      for (let i = 0; i < inp.length; i++) {
        const y = d[ix];
        lp += (y - lp) * 0.35;
        d[ix] = inp[i] + lp * fb;
        ix = (ix + 1) % c;
        out[i] += y * 0.25;
      }
    }
    for (const a0 of aps) {
      const a = a0 + spread; const d = new Float32Array(a); let ix = 0;
      for (let i = 0; i < out.length; i++) {
        const z = d[ix]; const x = out[i];
        const y = -x + z;
        d[ix] = x + z * 0.5;
        out[i] = y;
        ix = (ix + 1) % a;
      }
    }
    return out;
  };
  const wl = proc(bus.L, 0), wr = proc(bus.R, 23);
  for (let i = 0; i < bus.len; i++) { bus.L[i] = bus.L[i] * (1 - mix * 0.5) + wl[i] * mix; bus.R[i] = bus.R[i] * (1 - mix * 0.5) + wr[i] * mix; }
}

/* ---------------- kompozitsiya ---------------- */
// akkordlar: midi ildizlar + uchovlik turlari
const MAJ = [0, 4, 7], MIN = [0, 3, 7], MAJ7 = [0, 4, 7, 11];
const chord = (root, type) => type.map((i) => root + i);

function composeNozik(bus, dur, rnd, bpm) {
  const beat = 60 / bpm, bar = beat * 4;
  const prog = [chord(57, MIN), chord(53, MAJ), chord(48, MAJ), chord(55, MAJ)]; // Am F C G
  const scale = [0, 2, 4, 7, 9]; // pentatonik, C
  const bars = Math.ceil(dur / bar);
  let mel = 4;
  for (let b = 0; b < bars; b++) {
    const ch = prog[b % 4]; const t0 = b * bar;
    addTo(bus, t0, padNote(mtof(ch[0] + 12), bar * 0.98, 0.5, 1.2, 0.05), 0.11, -0.2);
    addTo(bus, t0, padNote(mtof(ch[2] + 12), bar * 0.98, 0.6, 1.2, 0.05), 0.08, 0.25);
    addTo(bus, t0, piano(mtof(ch[0] - 12), beat * 3.6, rnd), 0.33, 0);
    for (let i = 0; i < 8; i++) {
      const note = ch[[0, 1, 2, 1, 0, 1, 2, 1][i] % 3] + 12;
      const tt = t0 + i * beat / 2 + (rnd() - 0.5) * 0.012;
      addTo(bus, tt, piano(mtof(note + 12 * (i % 4 === 2 ? 0 : 0)), beat * 2.2, rnd), 0.2 * (i % 2 === 0 ? 1 : 0.75), -0.3 + 0.1 * (i % 3));
    }
    // ohang (ikki taktda bir marta)
    if (b >= 1) {
      const pat = [0, 2, 4, 2, 3, 1, 0, -1];
      for (let i = 0; i < 4; i++) {
        if (rnd() < 0.8) {
          mel = Math.max(0, Math.min(scale.length * 2 - 1, mel + Math.round((rnd() - 0.5) * 3)));
          const oct = Math.floor(mel / 5), deg = scale[mel % 5];
          const note = 72 + oct * 12 + deg;
          addTo(bus, t0 + i * beat + (rnd() < 0.3 ? beat / 2 : 0), piano(mtof(note), beat * 2.6, rnd), 0.22, 0.25);
        }
      }
    }
  }
  return 0.3;
}

function composeMilliy(bus, dur, rnd, bpm) {
  const beat = 60 / bpm, bar = beat * 4;
  const scale = [0, 1, 4, 5, 7, 8, 10]; // D frigiy-dominant
  const root = 50; // D3
  const bars = Math.ceil(dur / bar);
  let deg = 4;
  const ph = [[3, 1, 1.5, 2], [2, 1, 0, 1], [4, 3, 2, 1]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar;
    // drone
    addTo(bus, t0, padNote(mtof(root), bar, 0.8, 1.0, 0.04, 2), 0.14, 0);
    addTo(bus, t0, padNote(mtof(root + 7), bar, 0.8, 1.0, 0.04, 2), 0.07, 0.2);
    // dutar basi
    [0, 2].forEach((k) => addTo(bus, t0 + k * beat, pluck(mtof(root - 12 + (k ? 7 : 0)), beat * 2.5, rnd, 0.45, 0.9975), 0.4, -0.1));
    // doira usuli: dum . tak tak | dum tak . tak
    const pat = [['dum', 0], ['tak', 1.5], ['tak', 2], ['dum', 2.5], ['tak', 3], ['tak', 3.5]];
    pat.forEach(([k, pos]) => addTo(bus, t0 + pos * beat * 0.999, doira(k, rnd), k === 'dum' ? 0.5 : 0.3, 0.1));
    if (b % 2 === 1) addTo(bus, t0 + 1 * beat, doira('tak', rnd), 0.22, 0.1);
    // dutar ohangi (16-lik)
    const n8 = 8;
    for (let i = 0; i < n8; i++) {
      if (b === 0 && i < 2) continue;
      if (rnd() < 0.18) continue;
      const step = Math.round((rnd() - 0.5) * 3) + (ph[b % 3][i % 4] > 2 ? 1 : -0) * (rnd() < 0.3 ? 1 : 0);
      deg = Math.max(0, Math.min(12, deg + step));
      const note = root + 24 + scale[deg % 7] + 12 * Math.floor(deg / 7);
      const tt = t0 + i * beat / 2 + (rnd() - 0.5) * 0.008;
      // bezak: ikki marta tez zarba
      if (rnd() < 0.22) addTo(bus, tt - beat / 8, pluck(mtof(note + 1), beat * 0.3, rnd, 0.9, 0.99), 0.12, 0.25);
      addTo(bus, tt, pluck(mtof(note), beat * 1.6, rnd, 0.7, 0.9965), 0.36, 0.2 + 0.1 * Math.sin(i));
    }
  }
  return 0.32;
}

function composeQuvnoq(bus, dur, rnd, bpm) {
  const beat = 60 / bpm, bar = beat * 4;
  const prog = [chord(48, MAJ), chord(55, MAJ), chord(57, MIN), chord(53, MAJ)];
  const pent = [0, 2, 4, 7, 9];
  const bars = Math.ceil(dur / bar);
  let mel = 5;
  for (let b = 0; b < bars; b++) {
    const ch = prog[b % 4]; const t0 = b * bar;
    // sakrovchi bas
    [0, 1, 2, 3].forEach((k) => addTo(bus, t0 + k * beat, marimba(mtof(ch[k % 2 === 0 ? 0 : 2] - 12), beat * 0.9), 0.42, -0.1));
    // akkord urishlari
    for (let i = 0; i < 8; i++) if (i % 2 === 1) addTo(bus, t0 + i * beat / 2, marimba(mtof(ch[(i >> 1) % 3] + 12), beat * 0.4), 0.2, -0.35 + 0.1 * (i % 4));
    // yuqori ohang
    for (let i = 0; i < 8; i++) {
      if (rnd() < 0.25) continue;
      mel = Math.max(0, Math.min(9, mel + Math.round((rnd() - 0.5) * 4)));
      const note = 72 + Math.floor(mel / 5) * 12 + pent[mel % 5];
      addTo(bus, t0 + i * beat / 2, marimba(mtof(note), beat * 0.6), 0.34, 0.3);
    }
    addTo(bus, t0 + beat, clap(rnd), 0.16, 0); addTo(bus, t0 + 3 * beat, clap(rnd), 0.16, 0);
    for (let i = 0; i < 8; i++) addTo(bus, t0 + i * beat / 2, tick(rnd), 0.1, 0.4);
  }
  return 0.25;
}

function composeTantanali(bus, dur, rnd, bpm) {
  const beat = 60 / bpm, bar = beat * 4;
  const prog = [chord(50, MAJ), chord(57, MAJ), chord(59, MIN), chord(55, MAJ)]; // D A Bm G
  const D_MAJ = [0, 2, 4, 5, 7, 9, 11];
  const bars = Math.ceil(dur / bar);
  for (let b = 0; b < bars; b++) {
    const ch = prog[b % 4]; const t0 = b * bar;
    ch.forEach((n, i) => addTo(bus, t0, padNote(mtof(n + 12), bar, 0.35, 0.9, 0.09), 0.1, -0.3 + 0.3 * i));
    addTo(bus, t0, sine(mtof(ch[0] - 12), beat * 3.8), 0.45, 0);
    // zarb
    addTo(bus, t0, kick(rnd), 0.5, 0); addTo(bus, t0 + 2 * beat, kick(rnd), 0.4, 0);
    addTo(bus, t0 + beat, clap(rnd), 0.12, 0); addTo(bus, t0 + 3 * beat, clap(rnd), 0.12, 0);
    // qo'ng'iroq arpeggio (16-lik)
    for (let i = 0; i < 8; i++) {
      const note = ch[[0, 1, 2, 1, 2, 1, 0, 1][i]] + 24;
      addTo(bus, t0 + i * beat / 2, bell(mtof(note), beat * 1.8), 0.15 + 0.05 * (i === 0), 0.3 * Math.sin(i));
    }
    // fanfar (har 4 taktda)
    if (b % 4 === 0) {
      [62, 66, 69, 74].forEach((n, i) => addTo(bus, t0 + i * beat * 0.75, padNote(mtof(n), beat * 0.9, 0.04, 0.35, 0.22, 3), 0.2, 0));
    }
    if (b % 4 === 2) {
      const mel = [D_MAJ[4], D_MAJ[2], D_MAJ[4], D_MAJ[5]];
      mel.forEach((d, i) => addTo(bus, t0 + i * beat, bell(mtof(74 + d), beat * 1.6), 0.2, 0.2));
    }
  }
  return 0.32;
}

function composeSokin(bus, dur, rnd, bpm) {
  const beat = 60 / bpm, bar = beat * 4;
  const prog = [chord(48, MAJ7), chord(53, MAJ7), chord(45, [0, 3, 7, 10]), chord(55, [0, 4, 7, 10])];
  const pent = [0, 2, 4, 7, 9];
  const bars = Math.ceil(dur / bar);
  for (let b = 0; b < bars; b++) {
    const ch = prog[b % 4]; const t0 = b * bar;
    ch.forEach((n, i) => addTo(bus, t0, padNote(mtof(n + 12), bar + 0.4, 1.2, 1.6, 0.06), 0.1, -0.4 + 0.25 * i));
    addTo(bus, t0, sine(mtof(ch[0] - 12), bar * 0.95, 0.3), 0.35, 0);
    for (let i = 0; i < 3; i++) if (rnd() < 0.7) {
      const note = 72 + pent[Math.floor(rnd() * 5)] + (rnd() < 0.4 ? 12 : 0);
      addTo(bus, t0 + rnd() * bar * 0.9, bell(mtof(note), 3), 0.12, rnd() * 1.2 - 0.6);
    }
  }
  return 0.45;
}

const COMPOSERS = { nozik: composeNozik, milliy: composeMilliy, quvnoq: composeQuvnoq, tantanali: composeTantanali, sokin: composeSokin };

/**
 * Musiqa yaratadi. Qaytaradi { L, R, sampleRate, duration }.
 * o: { loop: oxiri boshiga ulanadigan (jonli sahifa uchun), seed }
 */
export function renderMusic(preset, duration, o = {}) {
  const info = MUSIC_PRESETS.find((p) => p.id === preset) || MUSIC_PRESETS[0];
  const comp = COMPOSERS[info.id];
  const tail = 3.5;
  let dur = duration;
  if (o.loop) { // butun taktlar soniga yaxlitlaymiz
    const bar = (60 / info.bpm) * 4; dur = Math.max(bar * 4, Math.round(duration / bar) * bar);
  }
  const len = Math.floor((dur + tail) * SR);
  const bus = makeBus(len);
  const rnd = mkRng(o.seed || 1234567);
  comp(bus, dur + tail, rnd, info.bpm);
  reverb(bus, info.id === 'sokin' ? 0.38 : info.id === 'milliy' ? 0.22 : 0.28);
  let L = bus.L, R = bus.R, outLen = Math.floor(dur * SR);
  if (o.loop) { // dum qismini boshiga qo'shamiz
    const tl = len - outLen;
    for (let i = 0; i < tl && i < outLen; i++) { L[i] += L[outLen + i]; R[i] += R[outLen + i]; }
  }
  L = L.slice(0, outLen); R = R.slice(0, outLen);
  softClip(L, R, 0.5, info.id === 'milliy' ? 1.7 : 1.0);
  normalize(L, R, 0.89);
  if (!o.loop) {
    fade(L, R, 0.08, 0, 'in');
    fade(L, R, Math.min(2.2, dur * 0.3), 0, 'out');
  }
  return { L, R, sampleRate: SR, duration: dur };
}

// yumshoq siqish: baland cho'qqilarni pasaytirib, umumiy balandlikni tenglashtiradi
function softClip(L, R, ref, drive) {
  let m = 0;
  for (let i = 0; i < L.length; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > m) m = a; if (b > m) m = b; }
  if (m < 1e-6) return;
  const g = drive / m;
  for (let i = 0; i < L.length; i++) { L[i] = Math.tanh(L[i] * g); R[i] = Math.tanh(R[i] * g); }
}
function normalize(L, R, peak) {
  let m = 0;
  for (let i = 0; i < L.length; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > m) m = a; if (b > m) m = b; }
  if (m < 1e-6) return;
  const g = peak / m;
  for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; }
}
function fade(L, R, sec, _, dir) {
  const n = Math.min(L.length, Math.floor(sec * SR));
  for (let i = 0; i < n; i++) {
    const g = i / n; const j = dir === 'in' ? i : L.length - 1 - i;
    const gg = dir === 'in' ? g : g; L[j] *= gg; R[j] *= gg;
  }
}

/* ---------------- tayyor audio bilan ishlash ---------------- */

/** Foydalanuvchi musiqasini (kanallar massivi) kerakli davomiylikka keltiradi: takrorlaydi/kesadi, yumshoq boshlanish-tugash. */
export function fitToDuration(ch, srcRate, duration, o = {}) {
  const n = Math.floor(duration * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  const a = ch[0], b = ch[1] || ch[0];
  const ratio = srcRate / SR;
  const start = Math.floor((o.offset || 0) * srcRate);
  const total = a.length - start;
  if (total <= 0) return { L, R, sampleRate: SR, duration };
  for (let i = 0; i < n; i++) {
    let pos = start + i * ratio;
    if (pos >= a.length) { if (o.loop === false) break; pos = start + ((pos - start) % total); }
    const i0 = Math.floor(pos), fr = pos - i0, i1 = Math.min(a.length - 1, i0 + 1);
    L[i] = a[i0] + (a[i1] - a[i0]) * fr;
    R[i] = b[i0] + (b[i1] - b[i0]) * fr;
  }
  normalize(L, R, 0.89);
  fade(L, R, 0.15, 0, 'in'); fade(L, R, Math.min(2, duration * 0.25), 0, 'out');
  return { L, R, sampleRate: SR, duration };
}

/**
 * Musiqa + ovozli tabrik aralashmasi. Ovoz paytida musiqa pasayadi (ducking).
 * voice: { ch:[Float32Array...], sampleRate } yoki null. o: { musicVol, voiceVol, voiceAt, duck }
 */
export function mix(music, voice, duration, o = {}) {
  const n = Math.floor(duration * SR);
  const mv = o.musicVol == null ? 0.8 : o.musicVol;
  const vv = o.voiceVol == null ? 1 : o.voiceVol;
  const L = new Float32Array(n), R = new Float32Array(n);
  let vo = null;
  if (voice) {
    vo = new Float32Array(n);
    const src = voice.ch[0]; const ratio = voice.sampleRate / SR;
    const off = Math.floor((o.voiceAt == null ? 1.0 : o.voiceAt) * SR);
    for (let i = 0; i + off < n; i++) {
      const pos = i * ratio; if (pos >= src.length - 1) break;
      const i0 = Math.floor(pos), fr = pos - i0;
      vo[i + off] = (src[i0] + (src[i0 + 1] - src[i0]) * fr) * vv;
    }
    // ovoz balandligini tekislaymiz
    let m = 0; for (let i = 0; i < n; i++) { const a = Math.abs(vo[i]); if (a > m) m = a; }
    if (m > 1e-4) { const g = 0.9 / m; for (let i = 0; i < n; i++) vo[i] *= g * vv; }
  }
  // ducking: ovoz envelopi (20 ms RMS, yumshoq)
  let env = 0; const duck = vo ? (o.duck == null ? 0.65 : o.duck) : 0;
  const atk = 1 - Math.exp(-1 / (0.03 * SR)), rel = 1 - Math.exp(-1 / (0.45 * SR));
  for (let i = 0; i < n; i++) {
    let g = mv;
    if (vo) {
      const a = Math.abs(vo[i]) > 0.02 ? 1 : 0;
      env += (a - env) * (a > env ? atk : rel);
      g = mv * (1 - duck * Math.min(1, env));
    }
    const ml = i < music.L.length ? music.L[i] : 0, mr = i < music.R.length ? music.R[i] : 0;
    L[i] = ml * g + (vo ? vo[i] : 0) * 0.95;
    R[i] = mr * g + (vo ? vo[i] : 0) * 0.95;
  }
  normalize(L, R, 0.92);
  return { L, R, sampleRate: SR, duration };
}

/** PCM16 WAV (server konvertatsiyasi va yuklab olish uchun). */
export function toWav(a) {
  const n = a.L.length, bytes = 44 + n * 4;
  const buf = new ArrayBuffer(bytes); const v = new DataView(buf);
  const wr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  wr(0, 'RIFF'); v.setUint32(4, bytes - 8, true); wr(8, 'WAVE'); wr(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, a.sampleRate, true); v.setUint32(28, a.sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  wr(36, 'data'); v.setUint32(40, n * 4, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    v.setInt16(o, Math.max(-1, Math.min(1, a.L[i])) * 32767, true);
    v.setInt16(o + 2, Math.max(-1, Math.min(1, a.R[i])) * 32767, true);
    o += 4;
  }
  return buf;
}

/* ---------------- brauzer qismi ---------------- */
export function toAudioBuffer(actx, a) {
  const b = actx.createBuffer(2, a.L.length, a.sampleRate);
  b.copyToChannel(a.L, 0); b.copyToChannel(a.R, 1);
  return b;
}

/** Fayl (mp3/m4a/wav/ogg) yoki Blob'ni dekodlaydi. Qaytaradi { ch, sampleRate, duration }. */
export async function decodeFile(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const actx = new AC();
  try {
    const ab = await blob.arrayBuffer();
    const buf = await new Promise((res, rej) => actx.decodeAudioData(ab, res, rej));
    const ch = []; for (let i = 0; i < Math.min(2, buf.numberOfChannels); i++) ch.push(buf.getChannelData(i).slice());
    return { ch, sampleRate: buf.sampleRate, duration: buf.duration };
  } finally { try { actx.close(); } catch (e) { /* */ } }
}

/** Mikrofon yozuvchisi. */
export class VoiceRecorder {
  constructor() { this.rec = null; this.chunks = []; this.stream = null; this.t0 = 0; }
  static supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.start();
    this.t0 = performance.now();
  }
  elapsed() { return (performance.now() - this.t0) / 1000; }
  stop() {
    return new Promise((res) => {
      this.rec.onstop = () => {
        this.stream.getTracks().forEach((t) => t.stop());
        res(new Blob(this.chunks, { type: this.rec.mimeType || 'audio/webm' }));
      };
      this.rec.stop();
    });
  }
}

/** Oldindan eshitish: audio obyektini ijro etadi. Qaytaradi stop() funksiyasi. */
export function playPreview(a, o = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const actx = new AC();
  const src = actx.createBufferSource();
  src.buffer = toAudioBuffer(actx, a);
  src.loop = !!o.loop;
  const g = actx.createGain(); g.gain.value = o.volume == null ? 0.9 : o.volume;
  src.connect(g); g.connect(actx.destination);
  src.start();
  if (actx.state === 'suspended') actx.resume();
  src.onended = () => { if (o.onend) o.onend(); };
  return () => { try { src.stop(); } catch (e) { /* */ } try { actx.close(); } catch (e) { /* */ } };
}
