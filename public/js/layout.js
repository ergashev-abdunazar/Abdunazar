// Formatlar va markazlashgan matn maketi (bloklar ro'yxati). Bloklar animatsiya uchun ham ishlatiladi.
import { text, paraFit, drawLines, fnt, diamond, circle } from './draw.js';

export const FORMATS = {
  story: { id: 'story', w: 1080, h: 1920, kind: 'tall', k: 1, label: 'Story 9:16' },
  portrait: { id: 'portrait', w: 1080, h: 1350, kind: 'tall', k: 0.8, label: 'Post 4:5' },
  square: { id: 'square', w: 1080, h: 1080, kind: 'square', k: 0.88, label: 'Post 1:1' },
  wide: { id: 'wide', w: 1920, h: 1080, kind: 'wide', k: 1.12, label: 'Gorizontal 16:9' },
  print: { id: 'print', w: 1080, h: 1527, kind: 'tall', k: 1, label: 'Chop etish' }
};

/* Foydalanuvchi tanlay oladigan shriftlar (kirill zaxirasi bilan). */
export const NAME_FONTS = {
  pinyon: { label: 'Yozma (Pinyon)', size: 128, w: 400, i: false, upper: false, ls: 0, lh: 0.95, base: 0.78 },
  vibes: { label: 'Yozma (Great Vibes)', size: 118, w: 400, i: false, upper: false, ls: 0, lh: 1.0, base: 0.78 },
  corm: { label: 'Cormorant kursiv', size: 118, w: 700, i: true, upper: false, ls: 0, lh: 1.0, base: 0.82 },
  play: { label: 'Playfair', size: 96, w: 600, i: false, upper: false, ls: 0, lh: 1.1, base: 0.85 },
  forum: { label: 'Forum (bosh harf)', size: 92, w: 400, i: false, upper: true, ls: 8, lh: 1.15, base: 0.88 },
  cinzel: { label: 'Cinzel (bosh harf)', size: 90, w: 500, i: false, upper: true, ls: 10, lh: 1.15, base: 0.9 },
  jost: { label: 'Jost (bosh harf)', size: 84, w: 300, i: false, upper: true, ls: 12, lh: 1.15, base: 0.88 },
  fred: { label: 'Fredoka (yumaloq)', size: 110, w: 700, i: false, upper: false, ls: 0, lh: 1.05, base: 0.85 },
  unb: { label: 'Unbounded (keng)', size: 70, w: 700, i: false, upper: true, ls: 2, lh: 1.1, base: 0.85 }
};
export const BODY_FONTS = {
  corm: { label: 'Cormorant', size: 38, w: 500, lh: 1.38 },
  play: { label: 'Playfair', size: 32, w: 400, lh: 1.5 },
  jost: { label: 'Jost', size: 34, w: 300, lh: 1.5 },
  manr: { label: 'Manrope', size: 32, w: 500, lh: 1.5 },
  fred: { label: 'Fredoka', size: 36, w: 500, lh: 1.4 }
};

/** Foydalanuvchi shrift tanlovini sozlamaga qo'llaydi. */
export function applyFontOverrides(cfg, S) {
  const f = S.fonts || {};
  const nf = f.name && NAME_FONTS[f.name];
  if (nf) {
    cfg.name = { ...cfg.name, font: fnt(f.name, nf.w, nf.i), size: nf.size, upper: nf.upper, ls: nf.ls, lh: nf.lh, base: nf.base };
  }
  const bf = f.body && BODY_FONTS[f.body];
  if (bf) {
    cfg.body = { ...cfg.body, font: fnt(f.body, bf.w, false), size: bf.size, lh: bf.lh };
  }
  return cfg;
}

/**
 * Bloklarni quradi. part: 'all' | 'A' (sarlavha, ismlar) | 'B' (matn, sana, manzil, tashkilotchi).
 * Har bir blok: { kind, h, draw(ctx, y) }.
 */
export function buildBlocks(ctx, S, D, cfg, k, o) {
  const { cx, mw, part = 'all', compact = false } = o;
  const L = D.L;
  const B = [];
  const sz = (v) => v * k;
  const wantA = part !== 'B';
  const wantB = part !== 'A';

  if (wantA) {
    if (cfg.pre) { const pb = cfg.pre(ctx, S, D, k); if (pb) B.push({ kind: 'pre', ...pb }); }

    const g = (S.guest || '').trim();
    if (g) {
      const z = sz(cfg.guest.size);
      B.push({ kind: 'guest', h: z * 1.3, draw: (c, y) => text(c, L.hurmatli + ' ' + g + ',', cx, y + z * 0.95, cfg.guest.font, z, cfg.guest.color, 'center', { maxW: mw, min: 18 }) });
    }

    const hz = sz(cfg.head.size);
    B.push({ kind: 'head', h: hz * 1.3, draw: (c, y) => text(c, D.head, cx, y + hz * 0.95, cfg.head.font, hz, cfg.head.color, 'center', { maxW: mw, min: 16, ls: cfg.head.ls * k }) });

    let names = [];
    if ((S.n1 || '').trim()) names.push(S.n1.trim());
    if (D.hasN2 && (S.n2 || '').trim()) names.push(S.n2.trim());
    let useAmp = names.length === 2 && !!cfg.amp;
    if (compact && names.length === 2) { names = [names[0] + ' & ' + names[1]]; useAmp = false; }
    const nm = cfg.name;
    const nz = sz(nm.size);
    names.forEach((s0, i) => {
      if (i === 1 && useAmp) {
        const az = sz(cfg.amp.size);
        B.push({ kind: 'amp', h: az * 1.05, draw: (c, y) => text(c, '&', cx, y + az * 0.8, cfg.amp.font, az, cfg.amp.color, 'center') });
      }
      const s = nm.upper ? s0.toUpperCase() : s0;
      const p = paraFit(ctx, s, nm.font, nz, nm.lh, mw, 2, Math.round(sz(28)), (nm.ls || 0) * k);
      B.push({ kind: 'name', h: p.lines.length * p.lh, draw: (c, y) => drawLines(c, p, cx, y + p.size * nm.base, nm.color, 'center') });
    });

    if (cfg.orn) {
      const h = sz(cfg.ornH);
      B.push({ kind: 'orn', h, draw: (c, y) => cfg.orn(c, cx, y + h / 2, k) });
    }
  }

  if (wantB) {
    if ((S.msg || '').trim()) {
      const p = paraFit(ctx, S.msg.trim(), cfg.body.font, sz(cfg.body.size), cfg.body.lh, mw, 5, Math.round(sz(22)));
      B.push({ kind: 'msg', h: p.lines.length * p.lh, draw: (c, y) => drawLines(c, p, cx, y + p.size * 0.88, cfg.body.color, 'center') });
    }

    if (D.d) {
      const dc = cfg.date;
      const style = compact ? 'line' : dc.style;
      if (style === 'split') {
        B.push({
          kind: 'date', h: sz(215), draw: (c, y) => {
            const lw = sz(620), top = y + sz(8), base = y + sz(126);
            c.strokeStyle = dc.line; c.lineWidth = Math.max(1, sz(2));
            c.beginPath(); c.moveTo(cx - lw / 2, top); c.lineTo(cx + lw / 2, top); c.stroke();
            text(c, D.d.day, cx, base, dc.numFont, sz(120), dc.numColor, 'center');
            text(c, D.d.month.toUpperCase(), cx - sz(235), base - sz(30), dc.labelFont, sz(32), dc.color, 'center', { ls: sz(4), maxW: sz(210), min: 14 });
            text(c, D.d.year, cx + sz(235), base - sz(30), dc.labelFont, sz(32), dc.color, 'center', { ls: sz(4) });
            const bot = y + sz(152);
            c.beginPath(); c.moveTo(cx - lw / 2, bot); c.lineTo(cx + lw / 2, bot); c.stroke();
            if (D.sub) text(c, D.sub, cx, y + sz(200), dc.subFont, sz(34), dc.color, 'center', { maxW: mw, min: 16 });
          }
        });
      } else {
        const z1 = sz(dc.size || 52), z2 = sz(32);
        const l1 = D.d.day + ' ' + D.d.month.toUpperCase() + ' ' + D.d.year;
        B.push({
          kind: 'date', h: z1 * 1.2 + (D.sub ? z2 * 1.9 : 0), draw: (c, y) => {
            text(c, l1, cx, y + z1 * 0.95, dc.labelFont, z1, dc.numColor, 'center', { maxW: mw, min: 20, ls: (dc.ls || 0) * k });
            if (D.sub) text(c, D.sub, cx, y + z1 * 1.2 + z2 * 1.15, dc.subFont, z2, dc.color, 'center', { maxW: mw, min: 16 });
          }
        });
      }
    }

    if ((S.venue || '').trim() && D.flags.venue) {
      const lz = sz(22);
      const p = paraFit(ctx, S.venue.trim(), cfg.venue.font, sz(cfg.venue.size), 1.35, mw, 3, Math.round(sz(20)));
      if (compact) {
        B.push({ kind: 'venue', h: p.lines.length * p.lh, draw: (c, y) => drawLines(c, p, cx, y + p.size * 0.88, cfg.venue.color, 'center') });
      } else {
        B.push({
          kind: 'venue', h: lz * 1.7 + p.lines.length * p.lh, draw: (c, y) => {
            text(c, L.manzil, cx, y + lz * 0.95, cfg.label.font, lz, cfg.label.color, 'center', { ls: 5 * k });
            drawLines(c, p, cx, y + lz * 1.7 + p.size * 0.88, cfg.venue.color, 'center');
          }
        });
      }
    }

    if ((S.host || '').trim() && D.flags.host) {
      const hn = S.host.trim();
      const lz = sz(20), hz = sz(cfg.host.size);
      if (compact) {
        const z = sz(cfg.host.size * 0.8);
        B.push({ kind: 'host', h: z * 1.4, draw: (c, y) => text(c, L.hurmatS + ' ' + hn, cx, y + z, cfg.host.font, z, cfg.host.color, 'center', { maxW: mw, min: 18 }) });
      } else {
        B.push({
          kind: 'host', h: lz * 1.7 + hz * 1.25, draw: (c, y) => {
            text(c, L.hurmat, cx, y + lz * 0.95, cfg.label.font, lz, cfg.label.color, 'center', { ls: 5 * k });
            text(c, hn, cx, y + lz * 1.7 + hz * 0.9, cfg.host.font, hz, cfg.host.color, 'center', { maxW: mw, min: 20 });
          }
        });
      }
    }
  }
  return B;
}

function placeBlocks(ctx, S, D, cfg, o, box, k0) {
  let k = k0, B = [], total = 0, gap = 0;
  for (let it = 0; it < 6; it++) {
    B = buildBlocks(ctx, S, D, cfg, k, o);
    gap = cfg.gap * k;
    total = B.reduce((a, b) => a + b.h, 0) + gap * Math.max(0, B.length - 1);
    if (total <= box.h + 0.5) break;
    k *= Math.max(0.5, box.h / total) * 0.985;
  }
  let y = box.y + Math.max(0, (box.h - total) / 2);
  B.forEach((b) => { b.y = y; y += b.h + gap; });
  return B;
}

/**
 * box: {x,y,w,h}. Tall/square: bitta ustun; wide: ikki ustun (A va B) va o'rtada ajratgich.
 * Qaytaradi: { blocks, extra(ctx) }.
 */
export function stackLayout(ctx, S, D, cfg, fmt, box) {
  const k0 = fmt.k;
  if (fmt.kind === 'wide') {
    const half = box.w / 2;
    const mw = Math.min(cfg.maxW, half - 110);
    const A = placeBlocks(ctx, S, D, cfg, { cx: box.x + half * 0.5, mw, part: 'A' }, box, k0);
    const Bb = placeBlocks(ctx, S, D, cfg, { cx: box.x + half * 1.5, mw, part: 'B' }, box, k0);
    const extra = (c) => {
      const x = box.x + half;
      const y0 = box.y + box.h * 0.12, y1 = box.y + box.h * 0.88;
      c.strokeStyle = cfg.divider || cfg.head.color; c.lineWidth = 2; c.globalAlpha = 0.75;
      c.beginPath(); c.moveTo(x, y0); c.lineTo(x, (y0 + y1) / 2 - 22); c.moveTo(x, (y0 + y1) / 2 + 22); c.lineTo(x, y1); c.stroke();
      c.globalAlpha = 1; c.fillStyle = cfg.divider || cfg.head.color;
      diamond(c, x, (y0 + y1) / 2, 9, 9); c.fill();
    };
    return { blocks: [...A, ...Bb], extra };
  }
  const o = { cx: box.x + box.w / 2, mw: cfg.maxW, part: 'all', compact: fmt.kind === 'square' };
  return { blocks: placeBlocks(ctx, S, D, cfg, o, box, k0), extra: null };
}

/* ---------- bezak chiziqlari (cfg.orn uchun) ---------- */
export function ornDiamond(color) {
  return (ctx, x, y, k) => {
    const w = 150 * k;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1, 2 * k);
    ctx.beginPath(); ctx.moveTo(x - w - 22 * k, y); ctx.lineTo(x - 22 * k, y); ctx.moveTo(x + 22 * k, y); ctx.lineTo(x + w + 22 * k, y); ctx.stroke();
    diamond(ctx, x, y, 10 * k, 10 * k); ctx.fill();
    circle(ctx, x - w - 34 * k, y, 3 * k); ctx.fill(); circle(ctx, x + w + 34 * k, y, 3 * k); ctx.fill();
  };
}
export function ornLine(color) {
  return (ctx, x, y, k) => {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1, 2 * k);
    ctx.beginPath(); ctx.moveTo(x - 60 * k, y); ctx.lineTo(x + 60 * k, y); ctx.stroke();
    circle(ctx, x, y, 5 * k); ctx.fill();
  };
}
export function ornDots(colors) {
  return (ctx, x, y, k) => {
    [-1, 0, 1].forEach((i) => { ctx.fillStyle = colors[(i + 1) % colors.length]; circle(ctx, x + i * 38 * k, y, 9 * k); ctx.fill(); });
  };
}
