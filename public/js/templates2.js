// Qo'shimcha 10 ta shablon (templates.js ga ulanadi).
import { fnt, text, rr, diamond, circle, rng, rgba, mix, star, sparkle, branch, archPathE, petalRing } from './draw.js';
import { stackLayout, applyFontOverrides, ornDiamond, ornLine, ornDots } from './layout.js';

function done(ctx, S, D, cfg, fmt, box, bg) {
  applyFontOverrides(cfg, S);
  const st = stackLayout(ctx, S, D, cfg, fmt, box);
  return { bg, extra: st.extra, blocks: st.blocks };
}
const F = {
  corm: (w, i) => fnt('corm', w, i), cinzel: (w) => fnt('cinzel', w), jost: (w) => fnt('jost', w),
  fred: (w) => fnt('fred', w), play: (w, i) => fnt('play', w, i), vibes: () => fnt('vibes', 400), pinyon: () => fnt('pinyon', 400),
  forum: () => fnt('forum', 400), unb: (w) => fnt('unb', w), manr: (w) => fnt('manr', w)
};

/** Umumiy sozlama: P ranglari + o (shriftlar). */
function mk(P, o = {}) {
  const nm = o.name || {};
  const dateFonts = o.date || {};
  return {
    maxW: o.maxW || 690, gap: o.gap || 28, divider: o.divider || P.accent,
    guest: { font: F.corm(500, true), size: 40, color: o.guestC || P.accent },
    head: { font: o.headFont || F.jost(500), size: o.headSize || 26, color: o.headC || P.accent, ls: o.headLs || 8 },
    name: { font: nm.font || F.vibes(), size: nm.size || 118, color: o.nameC || P.ink, lh: nm.lh || 1.0, base: nm.base || 0.8, upper: !!nm.upper, ls: nm.ls || 0 },
    amp: { font: o.ampFont || F.corm(500, true), size: o.ampSize || 58, color: o.ampC || P.accent },
    orn: o.orn === undefined ? ornDiamond(P.accent) : o.orn, ornH: 34,
    body: { font: o.bodyFont || F.corm(600, true), size: o.bodySize || 38, color: o.bodyC || P.ink, lh: 1.4 },
    date: {
      style: dateFonts.style || 'split', size: dateFonts.size || 50, ls: dateFonts.ls || 4,
      numFont: dateFonts.numFont || F.cinzel(500), labelFont: dateFonts.labelFont || F.cinzel(500), subFont: dateFonts.subFont || F.corm(600, true),
      color: o.dateC || P.accent, numColor: o.dateNum || P.ink, line: o.dateLine || P.accent
    },
    label: { font: o.labelFont || F.jost(500), color: o.labelC || P.accent },
    venue: { font: o.venueFont || F.corm(700, false), size: 36, color: o.venueC || P.ink },
    host: { font: o.hostFont || F.corm(700, true), size: 46, color: o.hostC || P.ink },
    pre: o.pre
  };
}
const boxOf = (fmt, my) => ({ x: 0, y: my, w: fmt.w, h: fmt.h - 2 * my });

/* -------- umumiy chizmalar -------- */
function leaf(c, x, y, len, wid, rot, col) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -wid, len, 0); c.quadraticCurveTo(len * 0.5, wid, 0, 0);
  c.fillStyle = col; c.fill(); c.restore();
}
function rose(c, x, y, R, c1, c2, c3) {
  c.save(); c.translate(x, y);
  circle(c, 0, 0, R); c.fillStyle = c2; c.fill();
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9, r = R * (1 - i * 0.12);
    c.save(); c.rotate(a);
    c.beginPath(); c.ellipse(r * 0.18, 0, r * 0.78, r * 0.6, 0, 0, Math.PI * 2); c.fillStyle = i % 2 ? c1 : c3; c.globalAlpha = 0.92; c.fill();
    c.globalAlpha = 1; c.strokeStyle = c2; c.lineWidth = Math.max(1, R * 0.025); c.stroke();
    c.restore();
  }
  circle(c, 0, 0, R * 0.2); c.fillStyle = c2; c.fill();
  c.restore();
}

/* ================= 11. ATIRGUL ================= */
function roza(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.bg); g.addColorStop(1, mix(P.bg, '#ffffff', 0.5));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const s = Math.min(W, H) / 1080 * (kind === 'wide' ? 1.0 : 1);
    const cluster = (cx, cy, rot, f) => {
      c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(f, f);
      [[-30, 40, 0.5, 0.2], [60, 90, 0.9, 0.1], [140, 20, 0.4, -0.3], [20, 150, 0.7, 0.6], [-90, 130, 0.3, 1.0], [150, 120, 0.6, 0.0]]
        .forEach((l) => leaf(c, l[0], l[1], 230 * l[2] + 90, 36, l[3] * 3, P.leaf));
      rose(c, 0, 0, 150, P.r1, P.r3, P.r2); rose(c, 190, 80, 95, P.r2, P.r3, P.r1); rose(c, 40, 210, 80, P.r1, P.r3, P.r2);
      c.restore();
    };
    cluster(0, 0, 0, 1.15 * s);
    c.save(); c.translate(W, H); c.rotate(Math.PI); c.scale(1.15 * s, 1.15 * s);
    [[-30, 40, 0.5, 0.2], [60, 90, 0.9, 0.1], [140, 20, 0.4, -0.3], [20, 150, 0.7, 0.6]].forEach((l) => leaf(c, l[0], l[1], 230 * l[2] + 90, 36, l[3] * 3, P.leaf));
    rose(c, 0, 0, 150, P.r1, P.r3, P.r2); rose(c, 190, 80, 95, P.r2, P.r3, P.r1); c.restore();
    if (kind === 'tall') { c.save(); c.translate(W, 0); c.scale(-0.5 * s, 0.5 * s); rose(c, 0, 0, 120, P.r2, P.r3, P.r1); leaf(c, 20, 60, 170, 30, 1.2, P.leaf); c.restore(); }
  };
  const cfg = mk(P, { name: { font: F.vibes(), size: 124, base: 0.8 }, orn: ornDiamond(P.accent), maxW: 640, date: { numFont: F.corm(700, false), labelFont: F.jost(500) } });
  return done(ctx, S, D, cfg, fmt, boxOf(fmt, kind === 'tall' ? 330 : 190), bg);
}

/* ================= 12. MARMAR ================= */
function marmar(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    const r = rng(77);
    for (let i = 0; i < 9; i++) { // yumshoq soyalar
      const x = r() * W, y = r() * H, R = Math.min(W, H) * (0.3 + r() * 0.4);
      const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, rgba(P.vein, 0.1)); g.addColorStop(1, rgba(P.vein, 0));
      c.fillStyle = g; c.fillRect(x - R, y - R, 2 * R, 2 * R);
    }
    for (let i = 0; i < 7; i++) { // tomirlar
      c.beginPath(); let x = r() * W, y = -40; c.moveTo(x, y);
      while (y < H + 40) { const nx = x + (r() - 0.5) * W * 0.22, ny = y + 140 + r() * 180; c.bezierCurveTo(x + (r() - 0.5) * 120, y + 60, nx + (r() - 0.5) * 120, ny - 60, nx, ny); x = nx; y = ny; }
      c.strokeStyle = P.vein; c.globalAlpha = 0.06 + r() * 0.1; c.lineWidth = 1 + r() * 4; c.stroke();
    }
    c.globalAlpha = 1;
    const m = 54;
    c.strokeStyle = P.accent; c.lineWidth = 3; c.strokeRect(m, m, W - 2 * m, H - 2 * m);
    c.lineWidth = 1.2; c.strokeRect(m + 16, m + 16, W - 2 * m - 32, H - 2 * m - 32);
    [[m + 16, m + 16, 1, 1], [W - m - 16, m + 16, -1, 1], [m + 16, H - m - 16, 1, -1], [W - m - 16, H - m - 16, -1, -1]].forEach((p) => {
      c.save(); c.translate(p[0], p[1]); c.scale(p[2], p[3]); c.fillStyle = P.accent;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(60, 0); c.lineTo(0, 60); c.closePath(); c.globalAlpha = 0.9; c.fill(); c.restore();
    });
    c.globalAlpha = 1;
  };
  const cfg = mk(P, { name: { font: F.cinzel(500), size: 90, upper: true, ls: 9, base: 0.9, lh: 1.15 }, headFont: F.cinzel(500), orn: ornDiamond(P.accent), maxW: 700, ampFont: F.corm(500, true), date: { numFont: F.cinzel(500), labelFont: F.cinzel(500) } });
  return done(ctx, S, D, cfg, fmt, boxOf(fmt, kind === 'tall' ? 200 : 140), bg);
}

/* ================= 13. BOHO ================= */
function pampas(c, x, y, h, lean, col) {
  c.save(); c.translate(x, y);
  for (let i = 0; i < 9; i++) {
    const a = lean + (i - 4) * 0.13, L = h * (0.7 + (i % 3) * 0.14);
    c.strokeStyle = col; c.lineWidth = 3; c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.sin(a) * L * 0.4, -L * 0.5, Math.sin(a) * L, -Math.cos(a) * L); c.stroke();
    for (let k = 0; k < 16; k++) { // pat
      const t = 0.45 + k * 0.034, px = Math.sin(a) * L * t * (1 + 0.1 * t), py = -Math.cos(a) * L * t;
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + (k % 2 ? 1 : -1) * 34, py - 16); c.lineWidth = 1.4; c.stroke();
    }
  }
  c.restore(); c.globalAlpha = 1;
}
function bohem(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    const cx = W / 2;
    if (kind === 'wide') {
      [[0, P.arch1], [18, P.arch2], [40, P.card]].forEach((a) => { c.fillStyle = a[1]; rr(c, W * 0.06 + a[0], H * 0.08 + a[0], W * 0.88 - 2 * a[0], H * 0.84 - 2 * a[0], 150 - a[0] * 1.5); c.fill(); });
      pampas(c, W * 0.1, H * 0.93, H * 0.2, -0.3, P.grass); pampas(c, W * 0.9, H * 0.93, H * 0.2, 0.3, P.grass);
      circle(c, cx, H * 0.17, 20); c.fillStyle = P.sun; c.fill();
      return;
    }
    const mw = W * 0.78, top = H * 0.07, bot = H * 0.93;
    [[mw, P.arch1], [mw * 0.93, P.arch2], [mw * 0.86, P.card]].forEach((a, i) => {
      c.beginPath(); const x0 = cx - a[0] / 2, x1 = cx + a[0] / 2, tp = top + i * 26;
      c.moveTo(x0, bot); c.lineTo(x0, tp + a[0] / 2); c.arc(cx, tp + a[0] / 2, a[0] / 2, Math.PI, 0); c.lineTo(x1, bot); c.closePath();
      c.fillStyle = a[1]; c.fill();
    });
    pampas(c, cx - mw / 2 + 20, H * 0.95, H * 0.2, -0.35, P.grass); pampas(c, cx + mw / 2 - 20, H * 0.95, H * 0.2, 0.35, P.grass);
    circle(c, cx, top + mw * (kind === 'tall' ? 0.2 : 0.12), mw * (kind === 'tall' ? 0.045 : 0.03)); c.fillStyle = P.sun; c.fill();
  };
  const cfg = mk(P, { name: { font: F.play(600), size: 92, base: 0.86, lh: 1.1 }, headFont: F.jost(500), orn: ornLine(P.accent), maxW: kind === 'wide' ? 600 : 560, bodyFont: F.play(400), bodySize: 30, date: { numFont: F.play(600), labelFont: F.jost(500), subFont: F.play(400, true) }, venueFont: F.play(500), hostFont: F.play(600, true) });
  const mw = fmt.w * 0.78;
  const box = kind === 'wide' ? { x: fmt.w * 0.08, y: fmt.h * 0.22, w: fmt.w * 0.84, h: fmt.h * 0.62 } : kind === 'square' ? { x: fmt.w / 2 - mw * 0.43, y: fmt.h * 0.27, w: mw * 0.86, h: fmt.h * 0.62 } : { x: fmt.w / 2 - mw * 0.43, y: fmt.h * 0.21, w: mw * 0.86, h: fmt.h * 0.68 };
  return done(ctx, S, D, cfg, fmt, box, bg);
}

/* ================= 14. KOSMOS ================= */
function kosmos(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    const g = c.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, P.bg); g.addColorStop(1, P.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = rng(5);
    for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * H, s = r() * 2.4 + 0.6; c.globalAlpha = 0.35 + r() * 0.65; c.fillStyle = '#ffffff'; circle(c, x, y, s); c.fill(); }
    c.globalAlpha = 1;
    for (let i = 0; i < 9; i++) { c.fillStyle = P.accent; sparkle(c, r() * W, r() * H, 10 + r() * 16); }
    const m = (Math.min(W, H) / 1080) * (kind === 'tall' ? 1 : 0.62);
    // oy
    c.save(); c.translate(W - 190 * m, 190 * m);
    c.beginPath(); c.arc(0, 0, 90 * m, 0, Math.PI * 2); c.arc(38 * m, -14 * m, 78 * m, 0, Math.PI * 2, true);
    c.fillStyle = P.moon; c.fill();
    c.restore();
    // sayyora
    c.save(); c.translate(150 * m, H - 200 * m);
    circle(c, 0, 0, 70 * m); c.fillStyle = P.planet; c.fill();
    c.strokeStyle = rgba(P.moon, 0.85); c.lineWidth = 9 * m; c.beginPath(); c.ellipse(0, 0, 118 * m, 30 * m, -0.4, 0, Math.PI * 2); c.stroke();
    c.restore();
    // uchar yulduz
    c.strokeStyle = rgba('#ffffff', 0.6); c.lineWidth = 3 * m; c.beginPath(); c.moveTo(W * 0.15, H * 0.22); c.lineTo(W * 0.05, H * 0.27); c.stroke();
    if (kind !== 'wide') { c.strokeStyle = rgba(P.accent, 0.8); c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H * 0.5, Math.min(W, H) * 0.46, 0, Math.PI * 2); c.setLineDash([4, 18]); c.stroke(); c.setLineDash([]); }
  };
  const cfg = mk(P, { name: { font: F.fred(700), size: 108, base: 0.85, lh: 1.05 }, headFont: F.fred(600), headLs: 6, ampFont: F.fred(600), orn: ornDots([P.accent, P.moon, P.planet]), bodyFont: F.fred(400), bodySize: 34, date: { style: 'line', size: 54, labelFont: F.fred(700), subFont: F.fred(500) }, venueFont: F.fred(500), hostFont: F.fred(600), labelFont: F.fred(600), guestC: P.moon });
  return done(ctx, S, D, cfg, fmt, boxOf(fmt, kind === 'tall' ? 260 : 170), bg);
}

/* ================= 15. TROPIK ================= */
function frond(c, x, y, len, rot, col, col2) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.strokeStyle = col2; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.18, len, 0); c.stroke();
  for (let i = 1; i < 14; i++) {
    const t = i / 14, px = t * len, py = -Math.sin(t * Math.PI) * len * 0.1 * 1.8 * (1 - t) * 0.0 - (len * 0.18) * 2 * t * (1 - t) * 1.0;
    const L = len * 0.3 * (1 - t * 0.55);
    [-1, 1].forEach((sgn) => {
      c.save(); c.translate(px, py); c.rotate(sgn * (1.0 - t * 0.35));
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, sgn * -L * 0.16, L, 0); c.quadraticCurveTo(L * 0.5, sgn * L * 0.08, 0, 0);
      c.fillStyle = i % 2 ? col : col2; c.fill(); c.restore();
    });
  }
  c.restore();
}
function hibiscus(c, x, y, R, col, center) {
  petalRing(c, x, y, 5, R * 0.2, R * 0.8, R * 0.72, col, mix(col, '#000000', 0.2), 2, -Math.PI / 2);
  circle(c, x, y, R * 0.16); c.fillStyle = center; c.fill();
}
function tropik(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.bg); g.addColorStop(1, mix(P.bg, '#ffffff', 0.45));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const s = (Math.min(W, H) / 1080) * (kind === 'tall' ? 1 : 0.58);
    frond(c, -40, 40 * s, 560 * s, 0.6, P.leaf1, P.leaf2); frond(c, -40, 200 * s, 430 * s, 0.15, P.leaf2, P.leaf1);
    frond(c, W + 40, H - 40 * s, 560 * s, Math.PI + 0.6, P.leaf1, P.leaf2); frond(c, W + 40, H - 200 * s, 430 * s, Math.PI + 0.15, P.leaf2, P.leaf1);
    if (kind === 'tall') { frond(c, W + 30, 100, 400, Math.PI - 0.55, P.leaf2, P.leaf1); frond(c, -30, H - 100, 400, -0.55, P.leaf2, P.leaf1); }
    hibiscus(c, 150 * s, 190 * s, 80 * s, P.flower, P.sun); hibiscus(c, W - 150 * s, H - 190 * s, 90 * s, P.flower2, P.sun);
  };
  const cfg = mk(P, { name: { font: F.fred(700), size: 110, base: 0.85, lh: 1.05 }, headFont: F.fred(600), ampFont: F.vibes(), ampSize: 80, orn: ornDots([P.flower, P.sun, P.leaf2]), bodyFont: F.fred(400), bodySize: 34, date: { style: 'line', size: 54, labelFont: F.fred(700), subFont: F.fred(500) }, venueFont: F.fred(500), hostFont: F.fred(600), labelFont: F.fred(600) });
  return done(ctx, S, D, cfg, fmt, boxOf(fmt, kind === 'tall' ? 380 : kind === 'square' ? 250 : 170), bg);
}

/* ================= 16. ART-DEKO ================= */
function deko(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W / 2, 0, 20, W / 2, 0, H * 0.7); g.addColorStop(0, P.panel); g.addColorStop(1, rgba(P.panel, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = P.accent;
    // yelpig'ich
    const R0 = Math.min(W, H) * (kind === 'tall' ? 0.09 : 0.065);
    for (let i = 1; i <= (kind === 'tall' ? 9 : 7); i++) { c.lineWidth = i % 3 === 0 ? 3 : 1.5; c.globalAlpha = 0.9 - i * 0.07; c.beginPath(); c.arc(W / 2, 0, R0 + i * R0 * 0.42, 0, Math.PI); c.stroke(); }
    c.globalAlpha = 0.55; c.lineWidth = 1.5;
    for (let a = 0.1; a < Math.PI; a += Math.PI / 24) { c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * R0, Math.sin(a) * R0); c.lineTo(W / 2 + Math.cos(a) * R0 * 4.5, Math.sin(a) * R0 * 4.5); c.stroke(); }
    c.globalAlpha = 1;
    // pastki yelpig'ich
    for (let i = 1; i <= 5; i++) { c.lineWidth = i % 2 ? 2.4 : 1.2; c.globalAlpha = 0.8 - i * 0.1; c.beginPath(); c.arc(W / 2, H, R0 * 0.8 + i * R0 * 0.4, Math.PI, 0); c.stroke(); }
    c.globalAlpha = 1;
    // ramka
    const m = 44; c.lineWidth = 3; c.strokeRect(m, m, W - 2 * m, H - 2 * m);
    c.lineWidth = 1.2; c.strokeRect(m + 14, m + 14, W - 2 * m - 28, H - 2 * m - 28);
    // yon vertikal chiziqlar
    c.lineWidth = 2;
    [m + 40, W - m - 40].forEach((x) => { c.globalAlpha = 0.5; c.beginPath(); c.moveTo(x, H * 0.3); c.lineTo(x, H * 0.7); c.stroke(); });
    c.globalAlpha = 1;
  };
  const cfg = mk(P, { name: { font: F.forum(), size: 96, upper: true, ls: 10, base: 0.88, lh: 1.15 }, headFont: F.forum(), headLs: 10, orn: ornDiamond(P.accent), ampFont: F.forum(), maxW: 640, date: { numFont: F.forum(), labelFont: F.forum(), subFont: F.corm(600, true) }, labelFont: F.forum(), bodyFont: F.corm(600, true) });
  return done(ctx, S, D, cfg, fmt, kind === 'square' ? { x: 0, y: 330, w: fmt.w, h: fmt.h - 330 - 140 } : boxOf(fmt, kind === 'tall' ? 360 : 190), bg);
}

/* ================= 17. AKVAREL ================= */
function akvarel(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    const blob = (x, y, r, col, a) => { const g = c.createRadialGradient(x, y, r * 0.05, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(0.65, rgba(col, a * 0.55)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); };
    const m = Math.min(W, H);
    blob(W * 0.08, H * 0.06, m * 0.62, P.c1, 0.85); blob(W * 0.3, H * 0.0, m * 0.45, P.c2, 0.7); blob(W * 0.0, H * 0.22, m * 0.4, P.c3, 0.6);
    blob(W * 0.95, H * 0.97, m * 0.65, P.c2, 0.85); blob(W * 0.72, H * 1.02, m * 0.5, P.c1, 0.7); blob(W * 1.0, H * 0.78, m * 0.4, P.c3, 0.55);
    c.save(); c.globalAlpha = 0.9; branch(c, 30, H * 0.2, W * 0.28, H * 0.06, 100, H * 0.12, 7, P.leaf, 52, 3); c.restore();
    c.save(); c.translate(W, H); c.rotate(Math.PI); branch(c, 30, H * 0.2, W * 0.28, H * 0.06, 100, H * 0.12, 7, P.leaf, 52, 3); c.restore();
  };
  const cfg = mk(P, { name: { font: F.pinyon(), size: 128, base: 0.78, lh: 0.95 }, headFont: F.jost(400), orn: ornLine(P.accent), maxW: 640, date: { numFont: F.corm(600, false), labelFont: F.jost(400), subFont: F.corm(600, true) } });
  return done(ctx, S, D, cfg, fmt, boxOf(fmt, kind === 'tall' ? 330 : 190), bg);
}

/* ================= 18. RETRO ================= */
function retro(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 1.0, Rr = Math.hypot(W, H);
    for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? P.s1 : P.s2; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, Rr, Math.PI + i * Math.PI / 24, Math.PI + (i + 1) * Math.PI / 24); c.closePath(); c.fill(); }
    // kamalak yoylar
    [P.a1, P.a2, P.a3, P.a4].forEach((col, i) => { c.fillStyle = col; circle(c, cx, cy, Math.min(W, H) * (0.38 - i * 0.06)); c.fill(); });
    // karta
    const mw = kind === 'wide' ? W * 0.5 : W * 0.84, mh = kind === 'tall' ? H * 0.66 : H * 0.8, x = cx - mw / 2, y = kind === 'tall' ? H * 0.1 : H * 0.1;
    c.fillStyle = P.shadow; rr(c, x + 14, y + 14, mw, mh, 48); c.fill();
    c.fillStyle = P.card; rr(c, x, y, mw, mh, 48); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 6; rr(c, x, y, mw, mh, 48); c.stroke();
    c.lineWidth = 2; rr(c, x + 20, y + 20, mw - 40, mh - 40, 32); c.stroke();
  };
  const mw = kind === 'wide' ? fmt.w * 0.5 : fmt.w * 0.84;
  const cfg = mk(P, { name: { font: F.unb(700), size: 66, upper: true, ls: 1, base: 0.85, lh: 1.15 }, headFont: F.unb(500), headSize: 20, headLs: 4, ampFont: F.unb(500), ampSize: 44, orn: ornDots([P.a1, P.a2, P.a3]), maxW: mw - 150, bodyFont: F.manr(600), bodySize: 30, date: { style: 'line', size: 44, labelFont: F.unb(600), subFont: F.manr(600) }, venueFont: F.manr(700), hostFont: F.unb(500), labelFont: F.unb(500), guestC: P.accent, headC: P.accent });
  const box = kind === 'wide' ? { x: fmt.w * 0.25, y: fmt.h * 0.15, w: fmt.w * 0.5, h: fmt.h * 0.7 } : { x: fmt.w * 0.08, y: fmt.h * (kind === 'tall' ? 0.13 : 0.14), w: fmt.w * 0.84, h: fmt.h * (kind === 'tall' ? 0.6 : 0.72) };
  return done(ctx, S, D, cfg, fmt, box, bg);
}

/* ================= 19. BITIRUV ================= */
function gradCap(c, x, y, s, col, tassel) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = col; c.beginPath(); c.moveTo(-130, 0); c.lineTo(0, -52); c.lineTo(130, 0); c.lineTo(0, 52); c.closePath(); c.fill();
  c.fillStyle = mix(col, '#000000', 0.3); c.beginPath(); c.moveTo(-70, 24); c.lineTo(-70, 78); c.quadraticCurveTo(0, 116, 70, 78); c.lineTo(70, 24); c.lineTo(0, 52); c.closePath(); c.fill();
  c.strokeStyle = tassel; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(112, 20); c.lineTo(112, 92); c.stroke();
  circle(c, 112, 100, 9); c.fillStyle = tassel; c.fill();
  c.restore();
}
function bitiruv(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    const g = c.createRadialGradient(W / 2, H * 0.4, 80, W / 2, H * 0.4, Math.max(W, H) * 0.8); g.addColorStop(0, P.panel); g.addColorStop(1, P.bg);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = rng(21);
    for (let i = 0; i < 60; i++) { c.fillStyle = [P.accent, '#ffffff', P.c2][i % 3]; c.globalAlpha = 0.45; c.save(); c.translate(r() * W, r() * H); c.rotate(r() * 3); c.fillRect(0, 0, 10 + r() * 10, 5); c.restore(); }
    c.globalAlpha = 1;
    c.strokeStyle = P.accent; c.lineWidth = 3; c.strokeRect(46, 46, W - 92, H - 92); c.lineWidth = 1; c.strokeRect(62, 62, W - 124, H - 124);
    // lavr shoxlari pastda
    const bw = Math.min(W, H) * 0.34;
    if (kind !== 'wide') [-1, 1].forEach((sg) => { c.save(); c.translate(W / 2 + sg * bw * 0.35, H - 110); c.scale(sg, 1); c.rotate(-0.1); branch(c, 0, 0, -bw, -bw * 0.5, -bw * 0.5, 40, 8, P.accent, 44, 3); c.restore(); });
    if (kind !== 'wide') gradCap(c, W / 2, kind === 'tall' ? 270 : 170, kind === 'tall' ? 1.5 : 0.9, P.accent, P.c2);
    else gradCap(c, W * 0.25, H * 0.2, 0.8, P.accent, P.c2);
  };
  const cfg = mk(P, { name: { font: F.play(600), size: 94, base: 0.86, lh: 1.1 }, headFont: F.cinzel(500), orn: ornDiamond(P.accent), maxW: 680, date: { numFont: F.play(600), labelFont: F.cinzel(500), subFont: F.play(400, true) }, bodyFont: F.play(400, true), bodySize: 30, venueFont: F.play(500), hostFont: F.play(600, true), labelFont: F.cinzel(500) });
  const box = kind === 'tall' ? { x: 0, y: 420, w: fmt.w, h: fmt.h - 420 - 220 } : kind === 'square' ? { x: 0, y: 270, w: fmt.w, h: fmt.h - 270 - 170 } : { x: 0, y: 300, w: fmt.w, h: fmt.h - 300 - 120 };
  return done(ctx, S, D, cfg, fmt, box, bg);
}

/* ================= 20. NUR (islomiy naqsh) ================= */
function nur(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.42, Math.max(W, H) * 0.7); g.addColorStop(0, rgba(P.panel, 0.95)); g.addColorStop(1, rgba(P.panel, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // sakkiz qirrali yulduzlar to'ri
    const s = 120; c.strokeStyle = rgba(P.accent, 0.2); c.lineWidth = 1.6;
    for (let y = 0; y < H + s; y += s) for (let x = 0; x < W + s; x += s) {
      c.save(); c.translate(x, y);
      c.strokeRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6);
      c.rotate(Math.PI / 4); c.strokeRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6); c.restore();
      c.beginPath(); c.moveTo(x + s / 2 - 8, y + s / 2); c.lineTo(x + s / 2, y + s / 2 - 8); c.lineTo(x + s / 2 + 8, y + s / 2); c.lineTo(x + s / 2, y + s / 2 + 8); c.closePath(); c.stroke();
    }
    if (kind === 'wide') {
      c.strokeStyle = P.accent; c.lineWidth = 4; rr(c, 50, 50, W - 100, H - 100, 120); c.stroke(); c.lineWidth = 1.5; rr(c, 72, 72, W - 144, H - 144, 100); c.stroke();
      c.save(); c.translate(W / 2, H * 0.15); circle(c, 0, 0, 44); c.fillStyle = P.accent; c.fill(); circle(c, 16, -5, 38); c.fillStyle = P.bg; c.fill(); c.fillStyle = P.accent; star(c, 54, -8, 12, 5, 0.45); c.fill(); c.restore();
      return;
    }
    // mehrob ramka
    const mw = W * 0.86, x0 = W / 2 - mw / 2, x1 = W / 2 + mw / 2, tp = H * 0.065, bt = H * 0.94;
    const arch = (inset, lw, col, fill) => {
      c.beginPath(); archPathE(c, x0 + inset, x1 - inset, tp + inset, bt - inset, mw * 0.5);
      if (fill) { c.fillStyle = fill; c.fill(); } c.strokeStyle = col; c.lineWidth = lw; c.stroke();
    };
    arch(0, 4, P.accent, rgba(P.bg, 0.78)); arch(22, 1.5, P.accent, null);
    // hilol va yulduz
    const cy = tp + mw * 0.2;
    c.save(); c.translate(W / 2, cy);
    circle(c, 0, 0, 50); c.fillStyle = P.accent; c.fill();
    circle(c, 18, -6, 44); c.fillStyle = P.bg; c.fill();
    c.fillStyle = P.accent; star(c, 62, -10, 14, 5, 0.45); c.fill();
    c.restore();
  };
  const cfg = mk(P, { name: { font: F.vibes(), size: 120, base: 0.8 }, headFont: F.cinzel(500), headSize: 24, orn: ornDiamond(P.accent), maxW: kind === 'wide' ? 520 : 600, date: { numFont: F.cinzel(500), labelFont: F.cinzel(500) }, bodySize: 36 });
  const mw = kind === 'wide' ? fmt.w * 0.5 : fmt.w * 0.86;
  const box = kind === 'wide' ? { x: 0, y: fmt.h * 0.24, w: fmt.w, h: fmt.h * 0.62 } : { x: fmt.w / 2 - mw * 0.4, y: fmt.h * (kind === 'tall' ? 0.2 : 0.3), w: mw * 0.8, h: fmt.h * (kind === 'tall' ? 0.68 : 0.6) };
  return done(ctx, S, D, cfg, fmt, box, bg);
}

export const NEW_TEMPLATES = {
  roza: {
    id: 'roza', name: 'Atirgul', tag: 'romantik', fx: 'petal', fonts: ['vibes', 'jost', 'corm'], layout: roza, pals: [
      { bg: '#fde8ea', r1: '#e8728f', r2: '#f4a6b8', r3: '#c24a6c', leaf: '#6a9a6d', accent: '#b8456a', ink: '#5a2234' },
      { bg: '#fff0e3', r1: '#f29a76', r2: '#f9c3a7', r3: '#d2694a', leaf: '#7fa07a', accent: '#b6582f', ink: '#573019' },
      { bg: '#ece6f8', r1: '#a98ad6', r2: '#cdb9ec', r3: '#7d5bb5', leaf: '#6f9c86', accent: '#6a47a3', ink: '#33224f' }]
  },
  marmar: {
    id: 'marmar', name: 'Marmar', tag: 'hashamatli', fx: 'sparkle', fonts: ['cinzel', 'corm', 'jost'], layout: marmar, pals: [
      { bg: '#f3f1ec', vein: '#8d8a84', accent: '#b8923c', ink: '#2b2822' },
      { bg: '#15161a', vein: '#9aa0ad', accent: '#d9b862', ink: '#f4efe2' },
      { bg: '#12342c', vein: '#a9cdbd', accent: '#e0c177', ink: '#f6f1e2' }]
  },
  bohem: {
    id: 'bohem', name: 'Boho', tag: 'tabiiy', fx: 'dust', fonts: ['play', 'jost'], layout: bohem, pals: [
      { bg: '#e8d5bd', arch1: '#c9805f', arch2: '#dba184', card: '#fbf3e7', grass: '#b9946b', sun: '#d9825f', accent: '#b5603f', ink: '#4b3326' },
      { bg: '#dfe3d3', arch1: '#7d9378', arch2: '#a4b79e', card: '#f8f7ee', grass: '#97a58b', sun: '#d2a35a', accent: '#5f7a5a', ink: '#2c3a2b' },
      { bg: '#efd9d9', arch1: '#b87f86', arch2: '#d5a9ad', card: '#fcf4f1', grass: '#c9a5a0', sun: '#d7a14f', accent: '#9a5a63', ink: '#4a2b30' }]
  },
  kosmos: {
    id: 'kosmos', name: 'Kosmos', tag: 'bolalar', fx: 'twinkle', fonts: ['fred'], layout: kosmos, pals: [
      { bg: '#0b1240', bg2: '#2a1a6e', accent: '#ffd166', moon: '#fff1c1', planet: '#ff6b9a', ink: '#ffffff' },
      { bg: '#07253b', bg2: '#0f5a73', accent: '#7ff0d6', moon: '#e9fbff', planet: '#ffb84d', ink: '#f2fcff' },
      { bg: '#2a0f4a', bg2: '#6a2a8f', accent: '#ff9ad5', moon: '#fff2fb', planet: '#7ad7ff', ink: '#fff6ff' }]
  },
  tropik: {
    id: 'tropik', name: 'Tropik', tag: 'yozgi', fx: 'petal', fonts: ['fred', 'vibes'], layout: tropik, pals: [
      { bg: '#fff3d6', leaf1: '#2f9e6b', leaf2: '#1c7a52', flower: '#ff5c8a', flower2: '#ff8a3d', sun: '#ffd23f', accent: '#d6336c', ink: '#124a37' },
      { bg: '#e3f7f3', leaf1: '#2bb08a', leaf2: '#117a65', flower: '#ff7a59', flower2: '#ffb703', sun: '#fff1a8', accent: '#e8590c', ink: '#0d4a40' },
      { bg: '#ffe6f0', leaf1: '#3fae6f', leaf2: '#207a4a', flower: '#ff3d81', flower2: '#9b5de5', sun: '#ffe066', accent: '#c2185b', ink: '#3a1740' }]
  },
  deko: {
    id: 'deko', name: 'Art-deko', tag: 'gala', fx: 'sparkle', fonts: ['forum', 'corm', 'jost'], layout: deko, pals: [
      { bg: '#0b0b0d', panel: '#2a2312', accent: '#d8b45a', ink: '#f5ecd4' },
      { bg: '#0a2a26', panel: '#14564c', accent: '#e2c06f', ink: '#f6efdc' },
      { bg: '#141a33', panel: '#2b3668', accent: '#e8b4a0', ink: '#fbeee8' }]
  },
  akvarel: {
    id: 'akvarel', name: 'Akvarel', tag: 'mayin', fx: 'dust', fonts: ['pinyon', 'jost', 'corm'], layout: akvarel, pals: [
      { bg: '#fffaf6', c1: '#f7a8c4', c2: '#a6c8f0', c3: '#ffd9a8', leaf: '#8ab08a', accent: '#c05f86', ink: '#4a3b47' },
      { bg: '#fbfaf2', c1: '#ffc6a3', c2: '#b4e0c8', c3: '#f3e3a0', leaf: '#7fa77f', accent: '#c4703f', ink: '#3f3c2e' },
      { bg: '#faf7fd', c1: '#c9b3ee', c2: '#ffe08a', c3: '#a9d8f0', leaf: '#92b39a', accent: '#7d5cb8', ink: '#3b3350' }]
  },
  retro: {
    id: 'retro', name: 'Retro', tag: 'quvnoq', fx: 'confetti', fonts: ['unb', 'manr'], layout: retro, pals: [
      { bg: '#f6e3b8', s1: '#f4c26a', s2: '#f7d794', a1: '#e8532b', a2: '#f28c28', a3: '#f6c744', a4: '#8fb36b', card: '#fff8e6', shadow: '#3d2b1f', accent: '#d9432a', ink: '#3d2b1f' },
      { bg: '#ffd9e8', s1: '#ffb3d1', s2: '#ffc9de', a1: '#7a5cff', a2: '#ff5c9a', a3: '#ffc233', a4: '#3fc1c9', card: '#fffafc', shadow: '#2d1b4e', accent: '#7a3cff', ink: '#2d1b4e' },
      { bg: '#d6ecf5', s1: '#8fcbe3', s2: '#aadbed', a1: '#ff6b4a', a2: '#ffb347', a3: '#fff07a', a4: '#2a9d8f', card: '#fffdf3', shadow: '#12384a', accent: '#e8563a', ink: '#12384a' }]
  },
  bitiruv: {
    id: 'bitiruv', name: 'Bitiruv', tag: 'bitiruv', fx: 'confetti', fonts: ['play', 'cinzel'], layout: bitiruv, pals: [
      { bg: '#0b1736', panel: '#1b3270', accent: '#e8c15b', c2: '#c0392b', ink: '#f8f2e2' },
      { bg: '#3a0f1f', panel: '#6a1f3a', accent: '#efc86b', c2: '#2a9d8f', ink: '#fff2e6' },
      { bg: '#101010', panel: '#2e2e2e', accent: '#d9b45c', c2: '#e04f5f', ink: '#f5efdf' }]
  },
  nur: {
    id: 'nur', name: 'Nur', tag: 'diniy', fx: 'twinkle', fonts: ['vibes', 'cinzel', 'corm'], layout: nur, pals: [
      { bg: '#07352f', panel: '#0f6a5c', accent: '#e8c46a', ink: '#fdf6df' },
      { bg: '#0d1740', panel: '#243a8a', accent: '#dfe6ff', ink: '#f4f6ff' },
      { bg: '#3a0d22', panel: '#6b1f43', accent: '#f0c778', ink: '#fff0e4' }]
  }
};
export const NEW_ORDER = ['roza', 'marmar', 'bohem', 'kosmos', 'tropik', 'deko', 'akvarel', 'retro', 'bitiruv', 'nur'];
