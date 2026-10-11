// 10 ta shablon. Har biri: { id, name, tag, fx, fonts, pals, layout(ctx,S,D,P,fmt) -> {bg, extra, blocks} }
import {
  fnt, text, paraFit, drawLines, rr, diamond, circle, rng, rgba, mix, star, sparkle, tulip,
  petalRing, medallion, branch, ikat, archPathE
} from './draw.js';
import { stackLayout, applyFontOverrides, NAME_FONTS, BODY_FONTS, ornDiamond, ornLine, ornDots } from './layout.js';
import { getImage, whenImage } from './items.js';
import { drawCover } from './draw.js';

function done(ctx, S, D, cfg, fmt, box, bg) {
  applyFontOverrides(cfg, S);
  const st = stackLayout(ctx, S, D, cfg, fmt, box);
  return { bg, extra: st.extra, blocks: st.blocks };
}

const F = {
  corm: (w, i) => fnt('corm', w, i),
  cinzel: (w) => fnt('cinzel', w),
  jost: (w) => fnt('jost', w),
  fred: (w) => fnt('fred', w),
  bric: (w) => fnt('bric', w)
};

function hill(ctx, W, H, base, amp, ph, color, wave = 150) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base + Math.sin(x / wave + ph) * amp);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}
function cloud(ctx, x, y, s, color = 'rgba(255,255,255,.92)') {
  ctx.fillStyle = color;
  [[0, 0, 40], [46, -14, 50], [96, 0, 38], [48, 14, 46]].forEach((c) => { circle(ctx, x + c[0] * s, y + c[1] * s, c[2] * s); ctx.fill(); });
}

/* ================= 1. ATLAS ================= */
function atlas(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const small = H < 1500, tall = kind === 'tall';
  const bh = tall && !small ? 178 : (kind === 'square' ? 96 : 120);
  const gy = tall && !small ? 46 : (kind === 'square' ? 28 : 36);
  const x0 = kind === 'wide' ? 140 : (kind === 'square' ? 110 : (small ? 140 : 90));
  const x1 = W - x0;
  const top = bh + gy, bot = H - bh - gy;
  const rx = (x1 - x0) / 2, ry = Math.min(rx, (bot - top) * (kind === 'square' ? 0.26 : 0.3));
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    [0, 1].forEach((i) => {
      c.save();
      if (i) { c.translate(0, H); c.scale(1, -1); }
      c.fillStyle = P.panel; c.fillRect(0, 0, W, bh);
      c.fillStyle = P.accent; c.fillRect(0, bh - 14, W, 3); c.fillRect(0, bh - 24, W, 1.5);
      const r = (bh - 26) * 0.32, n = Math.round(W / (r * 2.6)), step = W / n;
      for (let j = 0; j < n; j++) {
        const x = step * (j + 0.5), cy = (bh - 26) / 2 + 4;
        if (j % 2 === 0) ikat(c, x, cy, r, P.alt, P.accent, P.panel); else ikat(c, x, cy, r, P.accent, P.alt, P.panel);
      }
      c.restore();
    });
    archPathE(c, x0, x1, top, bot, ry); c.fillStyle = P.panel; c.fill();
    c.strokeStyle = P.accent; c.lineWidth = 4; c.stroke();
    archPathE(c, x0 + 22, x1 - 22, top + 22, bot - 22, Math.max(10, ry - 22)); c.lineWidth = 1.5; c.stroke();
    diamond(c, W / 2, top + 60, 9, 14); c.fillStyle = P.accent; c.fill();
  };
  const cfg = {
    maxW: 640, gap: 30, divider: P.accent,
    guest: { font: F.corm(500, true), size: 40, color: P.accent },
    head: { font: F.cinzel(500), size: 28, color: P.accent, ls: 7 },
    name: { font: fnt('pinyon', 400), size: 128, color: P.ink, lh: 0.95, base: 0.78, upper: false, ls: 0 },
    amp: { font: fnt('pinyon', 400), size: 70, color: P.accent },
    orn: ornDiamond(P.accent), ornH: 36,
    body: { font: F.corm(500, false), size: 38, color: P.ink, lh: 1.38 },
    date: { style: 'split', numFont: F.cinzel(700), labelFont: F.cinzel(500), subFont: F.corm(600, true), color: P.accent, numColor: P.ink, line: P.accent },
    label: { font: F.cinzel(500), color: P.accent },
    venue: { font: F.corm(600, false), size: 36, color: P.ink },
    host: { font: F.corm(700, true), size: 46, color: P.ink }
  };
  const by = top + ry * (kind === 'square' ? 0.5 : 0.6);
  return done(ctx, S, D, cfg, fmt, { x: x0 + 60, y: by, w: (x1 - x0) - 120, h: bot - 50 - by }, bg);
}

/* ================= 2. OLTIN ================= */
function oltin(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    const g = c.createRadialGradient(W / 2, H * 0.45, 60, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, P.panel); g.addColorStop(1, P.bg);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = P.accent; c.lineWidth = 4; c.strokeRect(46, 46, W - 92, H - 92);
    c.lineWidth = 1.5; c.strokeRect(70, 70, W - 140, H - 140);
    [[70, 70, 1, 1], [W - 70, 70, -1, 1], [70, H - 70, 1, -1], [W - 70, H - 70, -1, -1]].forEach((p) => {
      c.save(); c.translate(p[0], p[1]); c.scale(p[2], p[3]);
      c.strokeStyle = P.accent; c.lineWidth = 2;
      [58, 40, 22].forEach((r) => { c.beginPath(); c.arc(0, 0, r, 0, Math.PI / 2); c.stroke(); });
      diamond(c, 0, 0, 9, 9); c.fillStyle = P.accent; c.fill();
      c.restore();
    });
  };
  const cfg = {
    maxW: 700, gap: 28, divider: P.accent,
    pre: (c, S2, D2, k) => {
      const i1 = ((S2.n1 || '').trim().charAt(0) || '').toUpperCase();
      const i2 = D2.hasN2 ? ((S2.n2 || '').trim().charAt(0) || '').toUpperCase() : '';
      const ini = (i1 && i2) ? i1 + ' & ' + i2 : (i1 || i2);
      if (!ini || kind === 'square') return null;
      const r = 70 * k;
      return {
        h: r * 2, draw: (cc, y) => {
          cc.strokeStyle = P.accent; cc.lineWidth = Math.max(1, 2.5 * k);
          circle(cc, cc.__cx || W / 2, y + r, r); cc.stroke();
          cc.lineWidth = Math.max(1, k); circle(cc, cc.__cx || W / 2, y + r, r - 9 * k); cc.stroke();
          const z = (ini.length > 1 ? 36 : 54) * k;
          text(cc, ini, cc.__cx || W / 2, y + r + z * 0.35, fnt('cinzel', 500), z, P.ink, 'center', { maxW: r * 1.5, min: 14 });
        }
      };
    },
    guest: { font: F.corm(500, true), size: 40, color: P.accent },
    head: { font: F.corm(700, false), size: 30, color: P.accent, ls: 8 },
    name: { font: F.cinzel(500), size: 92, color: P.ink, lh: 1.15, base: 0.9, upper: true, ls: 10 },
    amp: { font: F.corm(500, true), size: 66, color: P.accent },
    orn: ornDiamond(P.accent), ornH: 36,
    body: { font: F.corm(500, true), size: 40, color: P.ink, lh: 1.35 },
    date: { style: 'split', numFont: F.cinzel(500), labelFont: F.cinzel(500), subFont: F.corm(500, true), color: P.accent, numColor: P.ink, line: P.accent },
    label: { font: F.cinzel(500), color: P.accent },
    venue: { font: F.corm(600, false), size: 38, color: P.ink },
    host: { font: F.corm(700, true), size: 48, color: P.ink }
  };
  const ky = kind === 'tall' && H > 1500 ? 130 : 110;
  const res = done(ctx, S, D, cfg, fmt, { x: 0, y: ky, w: W, h: H - 2 * ky }, bg);
  // monogramma markazi: ustun markaziga moslash (wide rejimida chap ustun)
  res.blocks.forEach((b) => {
    if (b.kind === 'pre') {
      const orig = b.draw;
      const cx = kind === 'wide' ? W / 4 : W / 2;
      b.draw = (c, y) => { c.__cx = cx; orig(c, y); c.__cx = null; };
    }
  });
  return res;
}

/* ================= 3. MINIMAL ================= */
function minimal(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    if (kind !== 'wide') {
      const r0 = Math.min(W * 0.43, H * 0.4);
      c.strokeStyle = P.accent; c.globalAlpha = 0.55; c.lineWidth = 2; circle(c, W / 2, H / 2, r0); c.stroke();
      c.globalAlpha = 0.3; c.lineWidth = 1; circle(c, W / 2, H / 2, r0 + 16); c.stroke(); c.globalAlpha = 1;
    }
    const sc = (kind === 'tall' && H > 1500) ? 1 : 0.6;
    c.save(); c.scale(sc, sc); branch(c, -20, 70, 400, 320, 60, 330, 8, P.accent, 66); c.restore();
    c.save(); c.translate(W, H); c.rotate(Math.PI); c.scale(sc, sc); branch(c, -20, 70, 400, 320, 60, 330, 8, P.accent, 66); c.restore();
  };
  const cfg = {
    maxW: 620, gap: 30, divider: P.accent,
    guest: { font: F.jost(300), size: 36, color: P.accent },
    head: { font: F.jost(500), size: 24, color: P.accent, ls: 7 },
    name: { font: F.jost(300), size: 86, color: P.ink, lh: 1.15, base: 0.88, upper: true, ls: 12 },
    amp: { font: F.jost(300), size: 46, color: P.accent },
    orn: ornLine(P.accent), ornH: 30,
    body: { font: F.jost(300), size: 34, color: P.ink, lh: 1.5 },
    date: { style: 'line', size: 48, ls: 6, numColor: P.ink, color: P.accent, labelFont: F.jost(400), subFont: F.jost(300) },
    label: { font: F.jost(500), color: P.accent },
    venue: { font: F.jost(300), size: 32, color: P.ink },
    host: { font: F.jost(400), size: 40, color: P.ink }
  };
  const y0 = kind === 'tall' ? 200 : 150;
  return done(ctx, S, D, cfg, fmt, { x: 0, y: y0, w: W, h: H - 2 * y0 }, bg);
}

/* ================= 4. QUVNOQ (bolalar) ================= */
function balloon(ctx, x, y, r, color, sway) {
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y + r * 1.18 + 10);
  ctx.bezierCurveTo(x + sway, y + r * 1.18 + 90, x - sway, y + r * 1.18 + 170, x + sway * 0.4, y + r * 1.18 + 300); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y + r * 1.18 - 2); ctx.lineTo(x - 9, y + r * 1.18 + 14); ctx.lineTo(x + 9, y + r * 1.18 + 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.45, r * 0.16, r * 0.3, 0.5, 0, Math.PI * 2); ctx.fill();
}
function quvnoq(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const wide = kind === 'wide';
  let cx0, cy0, cw, ch;
  if (wide) { cx0 = 190; cy0 = H * 0.07; cw = W - 380; ch = H * 0.78; }
  else if (kind === 'square') { cx0 = 70; cy0 = H * 0.2; cw = W - 140; ch = H * 0.69; }
  else { cx0 = 80; cy0 = H * 0.235; cw = W - 160; ch = H * 0.65; }
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    if (wide) { cloud(c, W * 0.17, H * 0.1, 1.1); cloud(c, W * 0.8, H * 0.09, 1.25); }
    else { cloud(c, W * 0.1, H * 0.2, 1.1); cloud(c, W * 0.74, H * 0.19, 1.25); }
    const r = rng(11);
    for (let i = 0; i < 80; i++) {
      const edge = i > 56;
      let x, y;
      if (wide) { x = r() < 0.5 ? r() * 190 : W - r() * 190; y = r() * H * 0.9; }
      else { x = edge ? (r() < 0.5 ? r() * 90 : W - r() * 90) : r() * W; y = edge ? H * 0.3 + r() * H * 0.55 : r() * H * 0.24; }
      const col = P.conf[(r() * P.conf.length) | 0], kd = (r() * 3) | 0, a = r() * Math.PI;
      c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col;
      if (kd === 0) { circle(c, 0, 0, 6 + r() * 6); c.fill(); }
      else if (kd === 1) { c.fillRect(-5, -11, 10, 22); }
      else { c.beginPath(); c.moveTo(0, -12); c.lineTo(11, 10); c.lineTo(-11, 10); c.closePath(); c.fill(); }
      c.restore();
    }
    const br = Math.min(W, H) * 0.066;
    const fx = wide ? [0.06, 0.11, 0.07, 0.94, 0.89, 0.93] : [0.14, 0.32, 0.5, 0.68, 0.86];
    const fy = wide ? [0.22, 0.52, 0.8, 0.26, 0.56, 0.82] : [0.15, 0.095, 0.17, 0.085, 0.15];
    fx.forEach((x, b) => balloon(c, W * x, H * fy[b], br, P.balls[b % P.balls.length], (b % 2 ? 1 : -1) * 18));
    hill(c, W, H, H * 0.915, 22, 0.5, P.hill1); hill(c, W, H, H * 0.945, 18, 2.2, P.hill2);
    rr(c, cx0, cy0 + 14, cw, ch, 64); c.fillStyle = P.shadow; c.fill();
    rr(c, cx0, cy0, cw, ch, 64); c.fillStyle = P.card; c.fill();
  };
  const cfg = {
    maxW: 700, gap: 28, divider: P.accent,
    guest: { font: F.fred(500), size: 38, color: P.ink },
    head: { font: F.fred(700), size: 30, color: P.accent, ls: 3 },
    name: { font: F.fred(700), size: 112, color: P.accent, lh: 1.05, base: 0.85, upper: false, ls: 0 },
    amp: { font: F.fred(700), size: 60, color: P.ink },
    orn: ornDots([P.balls[0], P.balls[1], P.balls[2]]), ornH: 30,
    body: { font: F.fred(500), size: 36, color: P.ink, lh: 1.4 },
    date: { style: 'split', numFont: F.fred(700), labelFont: F.fred(700), subFont: F.fred(500), color: P.ink, numColor: P.accent, line: P.accent },
    label: { font: F.fred(700), color: P.accent },
    venue: { font: F.fred(500), size: 34, color: P.ink },
    host: { font: F.fred(700), size: 44, color: P.ink }
  };
  return done(ctx, S, D, cfg, fmt, { x: cx0 + 20, y: cy0 + 56, w: cw - 40, h: ch - 112 }, bg);
}

/* ================= 5. SUZANI ================= */
function vine(ctx, x, H, P) {
  ctx.strokeStyle = P.accent; ctx.lineWidth = 3; ctx.beginPath();
  for (let y = 0; y <= H; y += 10) { const xx = x + Math.sin(y / 70) * 16; if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); }
  ctx.stroke();
  for (let yy = 40, n = 0; yy < H; yy += 80, n++) {
    const px = x + Math.sin(yy / 70) * 16, side = n % 2 ? 1 : -1;
    ctx.fillStyle = P.p3; ctx.beginPath(); ctx.ellipse(px + side * 20, yy, 20, 8, side * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.p1; circle(ctx, x + Math.sin((yy + 40) / 70) * 16, yy + 40, 7); ctx.fill();
  }
}
function suzani(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const wide = kind === 'wide';
  const R = wide ? H * 0.12 : (kind === 'square' ? H * 0.15 : H * 0.18);
  const sr = wide ? H * 0.31 : H * 0.085;
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    c.strokeStyle = P.accent; c.lineWidth = 3; c.strokeRect(30, 30, W - 60, H - 60);
    c.lineWidth = 1.5; c.strokeRect(46, 46, W - 92, H - 92);
    if (wide) {
      // gorizontal novdalar: vine() tik chiziladi, shuning uchun diagonal bo'yicha akslantiramiz
      c.save(); c.transform(0, 1, 1, 0, 0, 0); vine(c, 84, W, P); vine(c, H - 84, W, P); c.restore();
    } else { vine(c, 84, H, P); vine(c, W - 84, H, P); }
    medallion(c, 0, H / 2, sr, P); medallion(c, W, H / 2, sr, P);
    medallion(c, W / 2, 0, R, P); medallion(c, W / 2, H, R, P);
  };
  const cfg = {
    maxW: 650, gap: 28, divider: P.accent,
    guest: { font: F.corm(500, true), size: 40, color: P.accent },
    head: { font: F.cinzel(500), size: 27, color: P.accent, ls: 7 },
    name: { font: F.corm(700, true), size: 118, color: P.ink, lh: 1.0, base: 0.82, upper: false, ls: 0 },
    amp: { font: F.corm(500, true), size: 64, color: P.accent },
    orn: ornDiamond(P.accent), ornH: 34,
    body: { font: F.corm(500, false), size: 38, color: P.ink, lh: 1.36 },
    date: { style: 'line', size: 50, ls: 4, numColor: P.ink, color: P.accent, labelFont: F.cinzel(700), subFont: F.corm(600, true) },
    label: { font: F.cinzel(500), color: P.accent },
    venue: { font: F.corm(600, false), size: 36, color: P.ink },
    host: { font: F.corm(700, true), size: 46, color: P.ink }
  };
  let box;
  if (wide) { const m = sr + 30; box = { x: m, y: 150, w: W - 2 * m, h: H - 300 }; }
  else { const y0 = R + 34; box = { x: 0, y: y0, w: W, h: H - 2 * y0 }; }
  return done(ctx, S, D, cfg, fmt, box, bg);
}

/* ================= 6. TADBIR (korporativ) ================= */
function tadbir(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const k = fmt.k, wide = kind === 'wide';
  const L = D.L;
  const cr = wide ? 300 : (kind === 'square' ? 230 : (H < 1500 ? 300 : 360));
  const bg = (c) => {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    c.strokeStyle = P.line; c.lineWidth = 1;
    for (let gx = 90; gx < W; gx += 90) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, H); c.stroke(); }
    for (let gy = 90; gy < H; gy += 90) { c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke(); }
    circle(c, W, 0, cr); c.fillStyle = P.accent; c.fill();
    c.strokeStyle = P.bg; c.lineWidth = 3;
    [cr * 0.72, cr * 0.46].forEach((q) => { circle(c, W, 0, q); c.stroke(); });
    const qr = wide ? 90 : 80;
    circle(c, 0, H, qr); c.fillStyle = P.panel; c.fill();
    c.strokeStyle = P.accent; c.lineWidth = 2; circle(c, 0, H, qr + 28); c.stroke();
  };
  const blocks = [];
  const Lx = 100;
  const colW = wide ? Math.round(W * 0.5) : W - 2 * Lx;
  const nf = S.fonts && S.fonts.name && NAME_FONTS[S.fonts.name];
  const bf = S.fonts && S.fonts.body && BODY_FONTS[S.fonts.body];
  const titleFont = nf ? fnt(S.fonts.name, nf.w, nf.i) : fnt('bric', 800);
  const titleMax = nf ? nf.size : 128;
  const titleUpper = nf ? nf.upper : false;
  const titleLs = nf ? nf.ls : 0;
  const bodyFont = bf ? fnt(S.fonts.body, bf.w, false) : fnt('bric', 500);
  const bodySize = bf ? bf.size : 34;
  const lblFont = fnt('bric', 500);

  const lblY = (H < 1500 || kind !== 'tall') ? 110 : 132;
  blocks.push({
    kind: 'head', y: lblY - 30, h: 40, draw: (c) => {
      c.fillStyle = P.accent; c.fillRect(Lx, lblY - 12, 56, 4);
      text(c, D.head, Lx + 78, lblY, lblFont, 28 * k, P.accent, 'left', { ls: 6, maxW: colW - 100, min: 16 });
    }
  });
  let top = lblY + (kind === 'tall' && H > 1500 ? 58 : 44);
  const g = (S.guest || '').trim();
  if (g) {
    const y = top;
    blocks.push({ kind: 'guest', y, h: 50 * k, draw: (c) => text(c, L.hurmatli + ' ' + g + ',', Lx, y + 34 * k, lblFont, 34 * k, P.ink, 'left', { maxW: colW, min: 18, alpha: 0.9 }) });
    top += 70 * k;
  }

  // pastdan tepaga: tashkilotchi, ma'lumot qatorlari
  const bottomBase = H - (kind === 'tall' && H > 1500 ? 110 : 84);
  const rx0 = wide ? Math.round(W * 0.6) : Lx;
  const rw = wide ? W - rx0 - Lx : W - 2 * Lx;
  let hostTop = bottomBase;
  const host = D.flags.host ? (S.host || '').trim() : '';
  if (host) {
    blocks.push({
      kind: 'host', y: bottomBase - 70 * k, h: 80 * k, draw: (c) => {
        text(c, L.tashkilotchi, rx0, bottomBase - 48 * k, lblFont, 20 * k, P.accent, 'left', { ls: 5 });
        text(c, host, rx0, bottomBase, fnt('bric', 800), 40 * k, P.ink, 'left', { maxW: rw - 20, min: 18 });
      }
    });
    hostTop = bottomBase - 48 * k - 30 * k;
  }
  const valX = rx0 + 230 * k, valW = W - Lx - valX;
  const rows = [];
  if (D.d) rows.push([L.sana, D.d.day + ' ' + D.d.month + ' ' + D.d.year + (D.d.weekday ? ', ' + D.d.weekday : ''), 1]);
  if (S.time && D.flags.time) rows.push([L.vaqt, S.time, 1]);
  if ((S.venue || '').trim() && D.flags.venue) rows.push([L.manzil, S.venue.trim(), 3]);
  const rowFont = fnt('bric', 500);
  const data = rows.map((rw0) => {
    const p = paraFit(ctx, rw0[1], rowFont, 38 * k, 1.3, valW, rw0[2], Math.round(24 * k));
    return { label: rw0[0], p, h: p.lines.length * p.lh + 44 * k };
  });
  const rowsH = data.reduce((a, r) => a + r.h, 0);
  let yy = hostTop - 36 * k - rowsH;
  const rowsTopY = yy;
  data.forEach((r, i) => {
    const y = yy;
    blocks.push({
      kind: 'row', y, h: r.h, draw: (c) => {
        c.strokeStyle = P.rule; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(rx0, y); c.lineTo(W - Lx, y); c.stroke();
        if (i === data.length - 1) { c.beginPath(); c.moveTo(rx0, y + r.h); c.lineTo(W - Lx, y + r.h); c.stroke(); }
        text(c, r.label, rx0, y + 22 * k + r.p.size * 0.82, lblFont, 20 * k, P.accent, 'left', { ls: 5 });
        drawLines(c, r.p, valX, y + 22 * k + r.p.size * 0.88, P.ink, 'left');
      }
    });
    yy += r.h;
  });

  // sarlavha va matn
  const leftBottom = wide ? H - 110 : rowsTopY - 40 * k;
  const ty0 = top + (kind === 'tall' && H > 1500 ? 70 : 40);
  const avail = leftBottom - ty0;
  const msgP = (S.msg || '').trim() ? paraFit(ctx, S.msg.trim(), bodyFont, bodySize * k, 1.4, colW - 60, 3, Math.round(24 * k)) : null;
  const msgH = msgP ? msgP.lines.length * msgP.lh + 36 * k : 0;
  const title = (S.n1 || '').trim();
  let tp = null;
  if (title) {
    const t = titleUpper ? title.toUpperCase() : title;
    let z = Math.round(titleMax * k);
    for (;;) {
      tp = paraFit(ctx, t, titleFont, z, 1.02, colW, 4, z, titleLs * k);
      if (tp.lines.length * tp.lh + msgH <= avail || z <= Math.round(52 * k)) break;
      z -= 6;
    }
  }
  let ty = ty0;
  if (tp) {
    const y = ty, h = tp.lines.length * tp.lh;
    blocks.push({ kind: 'name', y, h, draw: (c) => drawLines(c, tp, Lx, y + tp.size * 0.88, P.ink, 'left') });
    ty += h + 36 * k;
  }
  if (msgP) {
    const y = ty;
    blocks.push({ kind: 'msg', y, h: msgP.lines.length * msgP.lh, draw: (c) => drawLines(c, msgP, Lx, y + msgP.size * 0.88, P.ink, 'left', 0.82) });
  }
  return { bg, extra: null, blocks };
}

/* ================= 7. NAVRO'Z ================= */
function navruz(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const wide = kind === 'wide', tall = kind === 'tall';
  let px, py, pw, ph;
  if (wide) { px = 260; py = 70; pw = W - 520; ph = H - 230; }
  else if (kind === 'square') { px = 60; py = H * 0.22; pw = W - 120; ph = H * 0.62; }
  else { px = 70; py = H * 0.25; pw = W - 140; ph = H * 0.6; }
  const bg = (c) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.sky1); g.addColorStop(1, P.sky2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sx = wide ? W * 0.11 : W / 2, sy = wide ? H * 0.22 : (tall ? H * 0.115 : H * 0.1);
    const sr = wide ? 80 : (tall ? 110 : 80);
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12, a2 = a + Math.PI / 24;
      c.fillStyle = rgba(P.sun, i % 2 ? 0.55 : 0.8);
      c.beginPath(); c.moveTo(sx + Math.cos(a) * sr * 1.15, sy + Math.sin(a) * sr * 1.15);
      c.lineTo(sx + Math.cos((a + a2) / 2) * sr * 1.75, sy + Math.sin((a + a2) / 2) * sr * 1.75);
      c.lineTo(sx + Math.cos(a2) * sr * 1.15, sy + Math.sin(a2) * sr * 1.15); c.closePath(); c.fill();
    }
    circle(c, sx, sy, sr); c.fillStyle = P.sun; c.fill();
    circle(c, sx, sy, sr * 0.72); c.fillStyle = mix(P.sun, '#ffffff', 0.35); c.fill();
    if (wide) { cloud(c, W * 0.28, H * 0.14, 0.9); cloud(c, W * 0.8, H * 0.12, 1.1); }
    else { cloud(c, W * 0.1, H * 0.13, 0.9); cloud(c, W * 0.74, H * 0.16, 1.0); }
    hill(c, W, H, H * 0.9, 22, 0.5, P.hill1); hill(c, W, H, H * 0.935, 18, 2.2, P.hill2);
    rr(c, px, py, pw, ph, 56); c.fillStyle = 'rgba(255,255,255,0.62)'; c.fill();
    c.strokeStyle = rgba(P.accent, 0.35); c.lineWidth = 2; rr(c, px + 14, py + 14, pw - 28, ph - 28, 44); c.stroke();
    const r = rng(5), n = Math.round(W / 105);
    const tf = tall ? (H > 1500 ? 1.25 : 0.95) : 0.7;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * W / n + (r() - 0.5) * 30, y = H - 6 - r() * 28, s = tf * (0.85 + r() * 0.45);
      tulip(c, x, y, s, P.pet[i % P.pet.length], P.leaf, '#ffffff');
    }
  };
  const cfg = {
    maxW: 660, gap: 28, divider: P.accent,
    guest: { font: F.jost(500), size: 36, color: P.ink },
    head: { font: F.jost(500), size: 26, color: P.accent, ls: 8 },
    name: { font: F.fred(700), size: 108, color: P.accent, lh: 1.05, base: 0.85, upper: false, ls: 0 },
    amp: { font: F.fred(700), size: 56, color: P.ink },
    orn: ornDots([P.pet[0], P.pet[1], P.pet[2]]), ornH: 30,
    body: { font: F.jost(400), size: 36, color: P.ink, lh: 1.45 },
    date: { style: 'line', size: 50, ls: 4, numColor: P.ink, color: P.accent, labelFont: F.fred(700), subFont: F.jost(500) },
    label: { font: F.jost(500), color: P.accent },
    venue: { font: F.jost(500), size: 34, color: P.ink },
    host: { font: F.fred(700), size: 44, color: P.ink }
  };
  return done(ctx, S, D, cfg, fmt, { x: px + 20, y: py + 50, w: pw - 40, h: ph - 100 }, bg);
}

/* ================= 8. HAYIT ================= */
function lantern(ctx, x, y, s, P, glow) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = P.gold; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -y / s); ctx.lineTo(0, 0); ctx.stroke();
  const g = ctx.createRadialGradient(0, 70, 4, 0, 70, 60);
  g.addColorStop(0, 'rgba(255,236,170,0.95)'); g.addColorStop(1, rgba(P.gold, 0.15));
  ctx.fillStyle = P.gold; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(26, 18); ctx.lineTo(-26, 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-26, 18); ctx.lineTo(26, 18); ctx.lineTo(36, 70); ctx.lineTo(26, 122); ctx.lineTo(-26, 122); ctx.lineTo(-36, 70); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = P.gold; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-12, 18); ctx.lineTo(-16, 122); ctx.moveTo(12, 18); ctx.lineTo(16, 122); ctx.stroke();
  ctx.fillStyle = P.gold; ctx.beginPath(); ctx.moveTo(-26, 122); ctx.lineTo(26, 122); ctx.lineTo(10, 140); ctx.lineTo(-10, 140); ctx.closePath(); ctx.fill();
  circle(ctx, 0, 148, 6); ctx.fill();
  ctx.restore();
}
function skyline(ctx, W, H, color, wide, f = 1) {
  ctx.fillStyle = color;
  const u = Math.min(W, H) * f;
  const base = H - u * 0.06;
  ctx.fillRect(0, base, W, H - base);
  const dome = (cx, r, h) => {
    ctx.beginPath(); ctx.moveTo(cx - r, base - h); ctx.arc(cx, base - h, r, Math.PI, 0); ctx.lineTo(cx + r, base); ctx.lineTo(cx - r, base); ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - 3, base - h - r - u * 0.04, 6, u * 0.04);
  };
  const minaret = (cx, h) => {
    const w = u * 0.022;
    ctx.fillRect(cx - w, base - h, w * 2, h);
    ctx.beginPath(); ctx.moveTo(cx - w * 1.6, base - h); ctx.lineTo(cx, base - h - u * 0.05); ctx.lineTo(cx + w * 1.6, base - h); ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - w * 1.5, base - h * 0.7, w * 3, u * 0.012);
  };
  const centers = wide ? [W * 0.2, W * 0.5, W * 0.8] : [W / 2];
  centers.forEach((cx) => {
    dome(cx, u * 0.1, u * 0.05);
    dome(cx - u * 0.17, u * 0.05, u * 0.03); dome(cx + u * 0.17, u * 0.05, u * 0.03);
    minaret(cx - u * 0.3, u * 0.14); minaret(cx + u * 0.3, u * 0.14);
  });
}
function hayit(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const wide = kind === 'wide';
  const bg = (c) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.bg1); g.addColorStop(1, P.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // sakkiz qirrali yulduz naqshi
    c.strokeStyle = rgba(P.gold, 0.1); c.lineWidth = 1.5;
    const t = 120;
    for (let y = t / 2; y < H; y += t) for (let x = t / 2; x < W; x += t) {
      c.save(); c.translate(x, y);
      c.strokeRect(-t * 0.3, -t * 0.3, t * 0.6, t * 0.6); c.rotate(Math.PI / 4); c.strokeRect(-t * 0.3, -t * 0.3, t * 0.6, t * 0.6);
      c.restore();
    }
    // yarim oy
    const mx = W / 2, my = wide ? H * 0.2 : H * 0.12, mr = wide ? 70 : (kind === 'square' ? 70 : 105);
    c.save(); c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.clip();
    c.fillStyle = P.gold; c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    c.fillStyle = g; c.beginPath(); c.arc(mx + mr * 0.42, my - mr * 0.1, mr * 0.85, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = P.gold; star(c, mx + mr * 0.75, my - mr * 0.2, mr * 0.2, 5, 0.45); c.fill();
    const r = rng(21);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = rgba('#ffffff', 0.35 + r() * 0.5);
      sparkle(c, r() * W, r() * H * 0.7, 3 + r() * 6); c.fill();
    }
    const lx = wide ? [W * 0.07, W * 0.93] : [W * 0.12, W * 0.88];
    lx.forEach((x, i) => lantern(c, x, H * (i ? 0.1 : 0.14) + 60, wide ? 0.8 : (kind === 'square' ? 0.7 : 1.0), P));
    skyline(c, W, H, P.sil, wide, kind === 'tall' ? 1 : 0.72);
  };
  const cfg = {
    maxW: 650, gap: 28, divider: P.gold,
    guest: { font: F.corm(500, true), size: 40, color: P.gold },
    head: { font: F.cinzel(500), size: 26, color: P.gold, ls: 8 },
    name: { font: fnt('vibes', 400), size: 124, color: P.ink, lh: 1.0, base: 0.78, upper: false, ls: 0 },
    amp: { font: fnt('vibes', 400), size: 64, color: P.gold },
    orn: ornDiamond(P.gold), ornH: 36,
    body: { font: F.corm(500, false), size: 38, color: P.ink, lh: 1.38 },
    date: { style: 'split', numFont: F.cinzel(700), labelFont: F.cinzel(500), subFont: F.corm(600, true), color: P.gold, numColor: P.ink, line: P.gold },
    label: { font: F.cinzel(500), color: P.gold },
    venue: { font: F.corm(600, false), size: 36, color: P.ink },
    host: { font: F.corm(700, true), size: 46, color: P.ink }
  };
  let box;
  if (wide) box = { x: 120, y: H * 0.2, w: W - 240, h: H * 0.62 };
  else if (kind === 'square') box = { x: 0, y: H * 0.23, w: W, h: H * 0.58 };
  else box = { x: 0, y: H * 0.26, w: W, h: H * 0.56 };
  return done(ctx, S, D, cfg, fmt, box, bg);
}

/* ================= 9. YANGI YIL ================= */
function pine(ctx, x, base, h, P, r) {
  const w = h * 0.55;
  [[0.0, 1.0], [0.28, 0.78], [0.52, 0.56]].forEach((t, i) => {
    const y0 = base - h + t[0] * h, ww = w * t[1];
    ctx.fillStyle = i % 2 ? P.tree2 : P.tree1;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + ww / 2, y0 + h * 0.4); ctx.lineTo(x - ww / 2, y0 + h * 0.4); ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle = '#5b3a29'; ctx.fillRect(x - h * 0.04, base - h * 0.08, h * 0.08, h * 0.1);
  for (let i = 0; i < 6; i++) {
    const t = 0.25 + r() * 0.65, yy = base - h + t * h * 0.95, ww = w * (0.15 + t * 0.5);
    circle(ctx, x + (r() - 0.5) * ww, yy, h * 0.025); ctx.fillStyle = P.balls[(r() * P.balls.length) | 0]; ctx.fill();
  }
  ctx.fillStyle = P.gold; star(ctx, x, base - h - h * 0.02, h * 0.07, 5, 0.45); ctx.fill();
}
function yangiyil(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const wide = kind === 'wide';
  const bg = (c) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.bg1); g.addColorStop(1, P.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const gl = c.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, Math.max(W, H) * 0.6);
    gl.addColorStop(0, rgba('#ffffff', 0.12)); gl.addColorStop(1, rgba('#ffffff', 0));
    c.fillStyle = gl; c.fillRect(0, 0, W, H);
    const r = rng(33);
    for (let i = 0; i < 90; i++) { c.fillStyle = rgba('#ffffff', 0.25 + r() * 0.6); circle(c, r() * W, r() * H, 1.5 + r() * 3.2); c.fill(); }
    // garland
    c.strokeStyle = P.tree2; c.lineWidth = 5; c.beginPath(); c.moveTo(-10, 40); c.quadraticCurveTo(W / 2, 40 + H * 0.07, W + 10, 40); c.stroke();
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, mt = 1 - t;
      const x = mt * mt * -10 + 2 * mt * t * (W / 2) + t * t * (W + 10);
      const y = mt * mt * 40 + 2 * mt * t * (40 + H * 0.07) + t * t * 40;
      const col = P.balls[i % P.balls.length];
      c.fillStyle = rgba(col, 0.25); circle(c, x, y + 18, 20); c.fill();
      c.fillStyle = col; c.beginPath(); c.ellipse(x, y + 16, 8, 12, 0, 0, Math.PI * 2); c.fill();
    }
    const base = H + 4, tr = rng(9);
    const n = wide ? 9 : 5;
    const th = wide ? H * 0.2 : H * 0.15;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * W / n + (tr() - 0.5) * 20;
      pine(c, x, base, th * (0.85 + tr() * 0.4), P, tr);
    }
    c.fillStyle = rgba('#ffffff', 0.9); c.fillRect(0, H - 8, W, 8);
  };
  const cfg = {
    maxW: 660, gap: 28, divider: P.gold,
    guest: { font: F.jost(400), size: 36, color: P.gold },
    head: { font: F.jost(500), size: 26, color: P.gold, ls: 8 },
    name: { font: fnt('vibes', 400), size: 128, color: P.ink, lh: 1.0, base: 0.78, upper: false, ls: 0 },
    amp: { font: fnt('vibes', 400), size: 64, color: P.gold },
    orn: ornDots([P.balls[0], P.gold, P.balls[1]]), ornH: 30,
    body: { font: F.jost(300), size: 36, color: P.ink, lh: 1.5 },
    date: { style: 'split', numFont: F.jost(500), labelFont: F.jost(500), subFont: F.jost(300), color: P.gold, numColor: P.ink, line: P.gold },
    label: { font: F.jost(500), color: P.gold },
    venue: { font: F.jost(300), size: 34, color: P.ink },
    host: { font: F.jost(500), size: 42, color: P.ink }
  };
  let box;
  if (wide) box = { x: 120, y: H * 0.14, w: W - 240, h: H * 0.62 };
  else if (kind === 'square') box = { x: 0, y: H * 0.14, w: W, h: H * 0.62 };
  else box = { x: 0, y: H * 0.15, w: W, h: H * 0.6 };
  return done(ctx, S, D, cfg, fmt, box, bg);
}

/* ================= 10. 8-MART ================= */
function daisy(ctx, x, y, R, P) {
  petalRing(ctx, x, y, 22, R * 0.3, R * 0.7, R * 0.2, P.petal2, null, 0, 0);
  petalRing(ctx, x, y, 18, R * 0.25, R * 0.6, R * 0.18, P.petal1, null, 0, Math.PI / 18);
  circle(ctx, x, y, R * 0.3); ctx.fillStyle = P.center; ctx.fill();
  circle(ctx, x, y, R * 0.18); ctx.fillStyle = mix(P.center, '#ffffff', 0.4); ctx.fill();
}
function mimosa(ctx, x0, y0, x1, y1, qx, qy, P) {
  ctx.strokeStyle = P.leaf; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(qx, qy, x1, y1); ctx.stroke();
  const r = rng(77);
  for (let i = 1; i <= 9; i++) {
    const t = i / 10, mt = 1 - t;
    const px = mt * mt * x0 + 2 * mt * t * qx + t * t * x1, py = mt * mt * y0 + 2 * mt * t * qy + t * t * y1;
    for (let j = 0; j < 7; j++) { ctx.fillStyle = P.mimosa; circle(ctx, px + (r() - 0.5) * 70, py + (r() - 0.5) * 70, 9 + r() * 8); ctx.fill(); }
  }
}
function mart8(ctx, S, D, P, fmt) {
  const { w: W, h: H, kind } = fmt;
  const wide = kind === 'wide';
  const u = Math.min(W, H);
  let bx, by, bw, bh;
  if (wide) { bx = 300; by = 80; bw = W - 600; bh = H - 160; }
  else if (kind === 'square') { bx = 90; by = H * 0.14; bw = W - 180; bh = H * 0.72; }
  else { bx = 80; by = H * 0.2; bw = W - 160; bh = H * 0.6; }
  const bg = (c) => {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, P.bg1); g.addColorStop(1, P.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    daisy(c, 0, 0, u * 0.42, P); daisy(c, W, H, u * 0.42, P);
    daisy(c, W, 0, u * 0.2, P); daisy(c, 0, H, u * 0.2, P);
    mimosa(c, -20, u * 0.38, u * 0.42, u * 0.12, u * 0.12, u * 0.14, P);
    c.save(); c.translate(W, H); c.rotate(Math.PI); mimosa(c, -20, u * 0.38, u * 0.42, u * 0.12, u * 0.12, u * 0.14, P); c.restore();
    rr(c, bx, by, bw, bh, 56); c.fillStyle = 'rgba(255,255,255,0.72)'; c.fill();
    c.strokeStyle = rgba(P.accent, 0.4); c.lineWidth = 2; rr(c, bx + 14, by + 14, bw - 28, bh - 28, 44); c.stroke();
  };
  const cfg = {
    maxW: 640, gap: 28, divider: P.accent,
    guest: { font: F.corm(600, true), size: 40, color: P.accent },
    head: { font: F.jost(500), size: 26, color: P.accent, ls: 8 },
    name: { font: fnt('vibes', 400), size: 118, color: P.ink, lh: 1.0, base: 0.78, upper: false, ls: 0 },
    amp: { font: fnt('vibes', 400), size: 64, color: P.accent },
    orn: ornDots([P.petal1, P.mimosa, P.leaf]), ornH: 30,
    body: { font: F.corm(600, false), size: 40, color: P.ink, lh: 1.36 },
    date: { style: 'line', size: 50, ls: 4, numColor: P.ink, color: P.accent, labelFont: F.jost(500), subFont: F.corm(600, true) },
    label: { font: F.jost(500), color: P.accent },
    venue: { font: F.corm(600, false), size: 36, color: P.ink },
    host: { font: F.corm(700, true), size: 46, color: P.ink }
  };
  return done(ctx, S, D, cfg, fmt, { x: bx + 20, y: by + 50, w: bw - 40, h: bh - 100 }, bg);
}

/* ================= ro'yxat ================= */
export const TEMPLATES = {
  atlas: {
    id: 'atlas', name: 'Atlas', tag: 'milliy', fx: 'sparkle', fonts: ['pinyon', 'cinzel', 'corm'], layout: atlas, pals: [
      { bg: '#17134d', panel: '#231c6e', accent: '#ecb64a', alt: '#d63a73', ink: '#fff4dc' },
      { bg: '#0c3d3b', panel: '#14544f', accent: '#f0c05a', alt: '#e2557a', ink: '#fff6e2' },
      { bg: '#5b0f2f', panel: '#7a1840', accent: '#f2c46a', alt: '#3fb7a8', ink: '#fff1e4' }]
  },
  oltin: {
    id: 'oltin', name: 'Oltin', tag: 'klassik', fx: 'sparkle', fonts: ['cinzel', 'corm'], layout: oltin, pals: [
      { bg: '#0c0c0c', panel: '#1c1810', accent: '#d6b04c', ink: '#f4ebd3' },
      { bg: '#0a1a38', panel: '#143262', accent: '#e2bb5e', ink: '#f7f0de' },
      { bg: '#f1ead8', panel: '#fffaf0', accent: '#9c7424', ink: '#2b2519' },
      { bg: '#0b2a22', panel: '#15473a', accent: '#dcba68', ink: '#f5eedb' }]
  },
  minimal: {
    id: 'minimal', name: 'Minimal', tag: 'zamonaviy', fx: 'dust', fonts: ['jost'], layout: minimal, pals: [
      { bg: '#edf0e8', accent: '#6c8d72', ink: '#25362a' },
      { bg: '#f7ece9', accent: '#c1858a', ink: '#4a2c31' },
      { bg: '#e8eef5', accent: '#5d82b0', ink: '#1b2b3f' },
      { bg: '#17211e', accent: '#9ec4a4', ink: '#e8efe9' }]
  },
  quvnoq: {
    id: 'quvnoq', name: 'Quvnoq', tag: 'bolalar', fx: 'confetti', fonts: ['fred'], layout: quvnoq, pals: [
      { bg: '#5cc7f0', card: '#fffdf4', shadow: '#2f9fcb', accent: '#f0407c', ink: '#3b2f63', hill1: '#6fd16c', hill2: '#3fb455', balls: ['#ffd23f', '#f0407c', '#7a5cff', '#ff8a3d', '#27c4b3'], conf: ['#ffd23f', '#f0407c', '#ffffff', '#7a5cff'] },
      { bg: '#8de0c4', card: '#ffffff', shadow: '#52b99b', accent: '#ff5f5f', ink: '#23424a', hill1: '#ffd166', hill2: '#f4b73f', balls: ['#ff6b6b', '#4d96ff', '#ffd166', '#9b5de5', '#06d6a0'], conf: ['#ff6b6b', '#ffffff', '#4d96ff', '#ffd166'] },
      { bg: '#8f6cf3', card: '#fffaf6', shadow: '#6544c9', accent: '#ff4f8b', ink: '#33265e', hill1: '#ffcf5c', hill2: '#ffb52e', balls: ['#ff4f8b', '#ffcf5c', '#46d9c0', '#4aa3ff', '#ff8a5c'], conf: ['#ffcf5c', '#ffffff', '#ff4f8b', '#46d9c0'] }]
  },
  suzani: {
    id: 'suzani', name: 'Suzani', tag: 'milliy', fx: 'petal', fonts: ['corm', 'cinzel'], layout: suzani, pals: [
      { bg: '#6e0f2a', p1: '#e4577f', p2: '#f6a5b9', p3: '#2f9e6b', accent: '#f3c969', ink: '#fff1e6' },
      { bg: '#0c4a3b', p1: '#f08aa0', p2: '#f7d1a6', p3: '#e9b44c', accent: '#f3c969', ink: '#fff6e6' },
      { bg: '#2e1560', p1: '#ff7aa8', p2: '#ffc2d6', p3: '#4cc9a7', accent: '#ffd166', ink: '#fff3ea' }]
  },
  tadbir: {
    id: 'tadbir', name: 'Tadbir', tag: 'korporativ', fx: 'dust', fonts: ['bric'], layout: tadbir, pals: [
      { bg: '#07323b', panel: '#0c4652', accent: '#f0c674', ink: '#f2f6f5', line: 'rgba(255,255,255,.06)', rule: 'rgba(255,255,255,.22)' },
      { bg: '#0f172a', panel: '#172544', accent: '#7cc4ff', ink: '#eef3fb', line: 'rgba(255,255,255,.06)', rule: 'rgba(255,255,255,.22)' },
      { bg: '#f2f4f9', panel: '#dfe6f3', accent: '#2f5bea', ink: '#0b1530', line: 'rgba(11,21,48,.07)', rule: 'rgba(11,21,48,.2)' }]
  },
  navruz: {
    id: 'navruz', name: "Navro'z", tag: 'bahor', fx: 'petal', fonts: ['fred', 'jost'], layout: navruz, pals: [
      { sky1: '#bfe9ff', sky2: '#eaf8d4', sun: '#ffc93c', hill1: '#7ed36f', hill2: '#4db85d', pet: ['#ff5c8a', '#ffb703', '#ff7b54', '#c77dff'], leaf: '#2f9e44', ink: '#1f4d3a', accent: '#c2255c', bg: '#bfe9ff' },
      { sky1: '#ffe0ee', sky2: '#fff4c9', sun: '#ff9f1c', hill1: '#a3e08a', hill2: '#6cc66a', pet: ['#ef476f', '#ffd166', '#06d6a0', '#8338ec'], leaf: '#2b9348', ink: '#3b2347', accent: '#d6336c', bg: '#ffe0ee' },
      { sky1: '#d5f3ff', sky2: '#fff7d6', sun: '#ffd23f', hill1: '#8fd9a8', hill2: '#52b788', pet: ['#ff6f91', '#ff9671', '#ffc75f', '#845ec2'], leaf: '#2d6a4f', ink: '#0d3b4c', accent: '#0a7e8c', bg: '#d5f3ff' }]
  },
  hayit: {
    id: 'hayit', name: 'Hayit', tag: 'bayram', fx: 'twinkle', fonts: ['vibes', 'cinzel', 'corm'], layout: hayit, pals: [
      { bg1: '#06382d', bg2: '#0b5a46', gold: '#e9c46a', ink: '#fff6df', sil: '#042a22', bg: '#06382d', accent: '#e9c46a' },
      { bg1: '#0b1230', bg2: '#1c2f66', gold: '#f1d27a', ink: '#f4f6ff', sil: '#070d22', bg: '#0b1230', accent: '#f1d27a' },
      { bg1: '#2b0f3f', bg2: '#521d6b', gold: '#f4c27a', ink: '#fff0e6', sil: '#1d0a2c', bg: '#2b0f3f', accent: '#f4c27a' }]
  },
  yangiyil: {
    id: 'yangiyil', name: 'Yangi yil', tag: 'bayram', fx: 'snow', fonts: ['vibes', 'jost'], layout: yangiyil, pals: [
      { bg1: '#0b1a3d', bg2: '#17306b', gold: '#f6d365', ink: '#ffffff', tree1: '#1b6b4a', tree2: '#14543a', balls: ['#e63946', '#f6d365', '#4cc9f0', '#ff9f1c'], bg: '#0b1a3d', accent: '#f6d365' },
      { bg1: '#0d2b21', bg2: '#17503b', gold: '#f2c14e', ink: '#fff8ee', tree1: '#2d8a5b', tree2: '#1f6b46', balls: ['#d62828', '#f2c14e', '#fcbf49', '#ffffff'], bg: '#0d2b21', accent: '#f2c14e' },
      { bg1: '#e5f3ff', bg2: '#bcdcf7', gold: '#c0392b', ink: '#10304f', tree1: '#2b7a5b', tree2: '#1e6049', balls: ['#e63946', '#ffb703', '#457b9d', '#8338ec'], bg: '#e5f3ff', accent: '#c0392b' }]
  },
  mart8: {
    id: 'mart8', name: '8-mart', tag: 'bayram', fx: 'petal', fonts: ['vibes', 'jost', 'corm'], layout: mart8, pals: [
      { bg1: '#ffd6e5', bg2: '#ffb3cf', petal1: '#ffffff', petal2: '#ffe3ee', center: '#ffc233', leaf: '#4c9a5d', mimosa: '#ffd23f', ink: '#5a1a3f', accent: '#d6336c', bg: '#ffd6e5' },
      { bg1: '#e9ddff', bg2: '#cdb6ff', petal1: '#ffffff', petal2: '#f1e8ff', center: '#ffd166', leaf: '#4f9d7b', mimosa: '#ffd23f', ink: '#3b1f66', accent: '#8e44ad', bg: '#e9ddff' },
      { bg1: '#ffe5cf', bg2: '#ffc9a3', petal1: '#ffffff', petal2: '#fff0e1', center: '#ff9f1c', leaf: '#5a9a4d', mimosa: '#ffcf33', ink: '#5b2a14', accent: '#e07a1f', bg: '#ffe5cf' }]
  }
};
export const TEMPLATE_ORDER = ['atlas', 'suzani', 'oltin', 'minimal', 'quvnoq', 'tadbir', 'navruz', 'hayit', 'yangiyil', 'mart8'];


/* ================= MAXSUS SHABLONLAR (admin yuklagan rasm/video fon) ================= */
function customBgSrc(t, kind) {
  const b = t.bg;
  if (t.kind === 'video') return b.poster || b.tall;
  if (kind === 'square') return b.square || b.tall || b.poster;
  if (kind === 'wide') return b.wide || b.tall || b.poster;
  return b.tall || b.poster;
}
function makeCustomLayout(t) {
  return function custom(ctx, S, D, P, fmt) {
    const { w: W, h: H, kind } = fmt;
    const src = customBgSrc(t, kind);
    const bg = (c, o = {}) => {
      if (!o.noBase) {
        c.fillStyle = '#15121c'; c.fillRect(0, 0, W, H);
        const img = getImage(src);
        if (img) drawCover(c, img, img.naturalWidth || img.width, img.naturalHeight || img.height, W, H);
      }
      if (t.scrim > 0) { c.save(); c.globalAlpha = t.scrim; c.fillStyle = t.scrimColor; c.fillRect(0, 0, W, H); c.restore(); }
    };
    const nf = NAME_FONTS[t.nameFont] || NAME_FONTS.corm, bf = BODY_FONTS[t.bodyFont] || BODY_FONTS.corm;
    const nameFont = fnt(t.nameFont, nf.w, nf.i), bodyFont = fnt(t.bodyFont, bf.w, false);
    const sub = fnt('jost', 400), lab = fnt('jost', 500);
    const cfg = {
      maxW: 900, gap: 28, divider: P.accent,
      guest: { font: bodyFont, size: 36, color: P.accent },
      head: { font: lab, size: 24, color: P.accent, ls: 7 },
      name: { font: nameFont, size: nf.size, color: P.ink, lh: nf.lh, base: nf.base, upper: nf.upper, ls: nf.ls },
      amp: { font: nameFont, size: 46, color: P.accent },
      orn: ornDiamond(P.accent), ornH: 30,
      body: { font: bodyFont, size: bf.size, color: P.ink, lh: bf.lh },
      date: { style: 'line', size: 50, ls: 5, numColor: P.ink, color: P.accent, labelFont: lab, subFont: sub },
      label: { font: lab, color: P.accent },
      venue: { font: bodyFont, size: 32, color: P.ink },
      host: { font: nameFont, size: 40, color: P.ink }
    };
    const r = t.region[kind] || t.region.tall;
    const box = { x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H };
    cfg.maxW = Math.max(300, box.w * 0.96);
    return done(ctx, S, D, cfg, { ...fmt, k: fmt.k * (t.textScale || 1) }, box, bg);
  };
}

/** Server bergan maxsus shablonlarni ro'yxatga qo'shadi (avval qo'shilganlari yangilanadi). */
export function registerCustomTemplates(list) {
  for (const id of Object.keys(TEMPLATES)) if (TEMPLATES[id].custom) { delete TEMPLATES[id]; const i = TEMPLATE_ORDER.indexOf(id); if (i >= 0) TEMPLATE_ORDER.splice(i, 1); }
  (list || []).forEach((t) => {
    if (!t || !t.id || !t.bg) return;
    TEMPLATES[t.id] = {
      id: t.id, name: t.name, tag: t.tag || 'maxsus', fx: t.fx === 'none' ? null : t.fx, fonts: [t.nameFont, t.bodyFont, 'jost'],
      layout: makeCustomLayout(t), custom: true, video: t.kind === 'video' ? t.bg.video : null,
      assets: [t.bg.tall, t.bg.square, t.bg.wide, t.bg.poster].filter(Boolean),
      pals: [{ bg: t.scrimColor || '#000000', accent: t.accent, ink: t.ink }]
    };
    TEMPLATE_ORDER.push(t.id);
  });
}
export function loadTemplateAssets(id) {
  const T = TEMPLATES[id];
  if (!T || !T.custom) return Promise.resolve();
  return Promise.all(T.assets.map((src) => new Promise((res) => { getImage(src); whenImage(src, res); })));
}
export function loadAllCustomAssets() {
  return Promise.all(Object.keys(TEMPLATES).filter((i) => TEMPLATES[i].custom).map(loadTemplateAssets));
}
