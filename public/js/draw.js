// Canvas chizish yordamchilari: shriftlar, matn, o'ram, shakllar, ranglar.

export const LS_OK = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;
export function setLS(ctx, px) { if (LS_OK) ctx.letterSpacing = px + 'px'; }

/* Har bir oilada lotin harflari uchun asosiy shrift, kirill uchun zaxira shrift ko'rsatilgan:
   brauzer har bir belgi uchun mos shriftni o'zi tanlaydi. */
export const FF = {
  pinyon: '"Pinyon Script","Great Vibes","Marck Script",cursive',
  vibes: '"Great Vibes","Marck Script",cursive',
  cinzel: 'Cinzel,Forum,"Times New Roman",serif',
  forum: 'Forum,"Times New Roman",serif',
  corm: '"Cormorant Garamond",Georgia,"Times New Roman",serif',
  play: '"Playfair Display",Georgia,serif',
  jost: 'Jost,Manrope,"Helvetica Neue",Arial,sans-serif',
  fred: 'Fredoka,Comfortaa,"Trebuchet MS",sans-serif',
  bric: '"Bricolage Grotesque",Manrope,"Helvetica Neue",Arial,sans-serif',
  unb: 'Unbounded,Manrope,"Helvetica Neue",Arial,sans-serif',
  manr: 'Manrope,"Helvetica Neue",Arial,sans-serif'
};

/** fnt('corm',500,true) -> (size)=>"italic 500 40px ..." */
export function fnt(fam, weight = 400, italic = false) {
  const stack = FF[fam];
  return (s) => `${italic ? 'italic ' : ''}${weight} ${Math.round(s)}px ${stack}`;
}

export function text(ctx, s, x, y, fontFn, size, color, align = 'center', o = {}) {
  const ls = o.ls || 0;
  let z = Math.round(size);
  setLS(ctx, ls);
  ctx.font = fontFn(z);
  if (o.maxW) {
    while (ctx.measureText(s).width > o.maxW && z > (o.min || 14)) { z -= 2; ctx.font = fontFn(z); }
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const xx = (ls && align === 'center' && LS_OK) ? x + ls / 2 : x;
  ctx.fillText(s, xx, y);
  ctx.globalAlpha = 1;
  setLS(ctx, 0);
  return z;
}

export function wrapLines(ctx, s, maxW) {
  const out = [];
  s.split(/\n/).forEach((par) => {
    const words = par.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); return; }
    let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = w; } else { cur = t; }
    });
    out.push(cur);
  });
  return out;
}

export function paraFit(ctx, s, fontFn, size, lhRatio, maxW, maxLines, min, ls = 0) {
  let z = Math.round(size);
  let lines;
  for (;;) {
    setLS(ctx, ls);
    ctx.font = fontFn(z);
    lines = wrapLines(ctx, s, maxW);
    // bitta so'z bo'lsa ham sig'masligi mumkin: kichraytiramiz
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    if ((lines.length <= maxLines && widest <= maxW + 1) || z <= min) break;
    z -= 2;
  }
  setLS(ctx, 0);
  return { lines, size: z, lh: z * lhRatio, font: fontFn(z), ls };
}

export function drawLines(ctx, p, x, yBase, color, align = 'center', alpha) {
  setLS(ctx, p.ls || 0);
  ctx.font = p.font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (alpha != null) ctx.globalAlpha = alpha;
  const xx = (p.ls && align === 'center' && LS_OK) ? x + p.ls / 2 : x;
  p.lines.forEach((l, i) => ctx.fillText(l, xx, yBase + i * p.lh));
  ctx.globalAlpha = 1;
  setLS(ctx, 0);
}

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
export function diamond(ctx, cx, cy, rx, ry) {
  ctx.beginPath(); ctx.moveTo(cx, cy - ry); ctx.lineTo(cx + rx, cy); ctx.lineTo(cx, cy + ry); ctx.lineTo(cx - rx, cy); ctx.closePath();
}
export function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

export function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- ranglar ---------- */
export function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(f, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = {
  out: (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3),
  inOut: (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  back: (t) => { t = clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
};

/* ---------- umumiy bezaklar ---------- */
export function petalRing(ctx, cx, cy, n, r0, len, wid, fill, stroke, lw, rot) {
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot + i * 2 * Math.PI / n);
    ctx.beginPath(); ctx.ellipse(r0 + len / 2, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    ctx.restore();
  }
}
export function medallion(ctx, cx, cy, R, P) {
  petalRing(ctx, cx, cy, 16, R * 0.62, R * 0.38, R * 0.14, P.p3, null, 0, Math.PI / 16);
  petalRing(ctx, cx, cy, 16, R * 0.42, R * 0.5, R * 0.26, P.p1, P.accent, Math.max(1.5, R * 0.01), 0);
  petalRing(ctx, cx, cy, 12, R * 0.26, R * 0.34, R * 0.2, P.p2, P.accent, Math.max(1, R * 0.006), Math.PI / 12);
  petalRing(ctx, cx, cy, 8, R * 0.12, R * 0.2, R * 0.14, P.accent, null, 0, 0);
  circle(ctx, cx, cy, R * 0.14); ctx.fillStyle = P.p3; ctx.fill();
  ctx.strokeStyle = P.accent; ctx.lineWidth = Math.max(1.5, R * 0.01); ctx.stroke();
  circle(ctx, cx, cy, R * 0.05); ctx.fillStyle = P.p2; ctx.fill();
}
export function branch(ctx, x0, y0, x1, y1, qx, qy, n, color, leaf, lw = 3) {
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(qx, qy, x1, y1); ctx.stroke();
  for (let i = 1; i <= n + 1; i++) {
    const t = i / (n + 1), mt = 1 - t;
    const px = mt * mt * x0 + 2 * mt * t * qx + t * t * x1, py = mt * mt * y0 + 2 * mt * t * qy + t * t * y1;
    const tx = 2 * mt * (qx - x0) + 2 * t * (x1 - qx), ty = 2 * mt * (qy - y0) + 2 * t * (y1 - qy);
    const a = Math.atan2(ty, tx), s = leaf * (1 - t * 0.45);
    const sides = i === n + 1 ? [0] : [-1, 1];
    sides.forEach((side) => {
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + side * 0.85);
      ctx.beginPath(); ctx.ellipse(s * 0.55, 0, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.globalAlpha = 0.88; ctx.fill(); ctx.restore();
    });
  }
  ctx.globalAlpha = 1;
}
export function ikat(ctx, cx, cy, r, c1, c2, c3) {
  diamond(ctx, cx, cy, r, r * 1.3); ctx.fillStyle = c1; ctx.fill();
  diamond(ctx, cx, cy, r * 0.62, r * 0.8); ctx.fillStyle = c2; ctx.fill();
  diamond(ctx, cx, cy, r * 0.26, r * 0.34); ctx.fillStyle = c3; ctx.fill();
  [-1, 1].forEach((s) => {
    diamond(ctx, cx + s * r * 1.18, cy, r * 0.22, r * 0.3); ctx.fillStyle = c1; ctx.fill();
    diamond(ctx, cx + s * r * 1.42, cy, r * 0.09, r * 0.14); ctx.fillStyle = c2; ctx.fill();
  });
}
export function star(ctx, cx, cy, r, n = 5, inner = 0.45, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner, a = rot + i * Math.PI / n;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
export function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
}
export function tulip(ctx, x, y, s, color, leaf, hi) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = leaf; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -60, 0, -118); ctx.stroke();
  ctx.fillStyle = leaf;
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.bezierCurveTo(-46, -20, -52, -70, -34, -96); ctx.bezierCurveTo(-30, -56, -14, -30, 0, -4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.bezierCurveTo(44, -24, 52, -62, 38, -88); ctx.bezierCurveTo(28, -52, 12, -30, 0, -4); ctx.fill();
  ctx.translate(0, -112);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.bezierCurveTo(-30, -6, -36, -52, -26, -90); ctx.lineTo(-11, -62); ctx.lineTo(0, -96);
  ctx.lineTo(11, -62); ctx.lineTo(26, -90); ctx.bezierCurveTo(36, -52, 30, -6, 0, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = hi; ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.bezierCurveTo(-8, -30, -6, -60, 0, -92); ctx.bezierCurveTo(6, -60, 8, -30, 0, -4); ctx.fill();
  ctx.restore();
}
export function archPathE(ctx, x0, x1, top, bot, ry) {
  const rx = (x1 - x0) / 2, cx = (x0 + x1) / 2;
  ctx.beginPath(); ctx.moveTo(x0, bot); ctx.lineTo(x0, top + ry);
  ctx.ellipse(cx, top + ry, rx, ry, 0, Math.PI, 0, false);
  ctx.lineTo(x1, bot); ctx.closePath();
}

/** Rasm/video kadrini [0,0,W,H] ga "cover" tarzida chizadi. */
export function drawCover(c, el, iw, ih, W, H) {
  if (!iw || !ih) return;
  const s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
  c.drawImage(el, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
