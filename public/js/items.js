// Stikerlar, rasm ramkalari va QR bloki: foydalanuvchi sudrab joylashtiradigan qatlam elementlari.
import { tulip, medallion, branch, ikat, star, sparkle, diamond, circle, rr, mix, rng, petalRing } from './draw.js';
import { drawQR } from './qr.js';

/* ---------- stikerlar: [-100..100] kvadratda chiziladi ---------- */
function heartPath(c, s = 1) {
  c.beginPath();
  c.moveTo(0, 80 * s);
  c.bezierCurveTo(-110 * s, -5 * s, -60 * s, -80 * s, 0, -30 * s);
  c.bezierCurveTo(60 * s, -80 * s, 110 * s, -5 * s, 0, 80 * s);
  c.closePath();
}

export const STICKERS = [
  { id: 'lola', label: 'Lola', draw: (c, a, b) => tulip(c, 0, 100, 0.95, a, b, '#ffffff') },
  {
    id: 'anor', label: 'Anor', draw: (c, a, b) => {
      c.fillStyle = a; circle(c, 0, 14, 62); c.fill();
      c.fillStyle = mix(a, '#ffffff', 0.35); c.globalAlpha = 0.5; c.beginPath(); c.ellipse(-20, -8, 14, 24, 0.5, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      c.fillStyle = mix(a, '#000000', 0.25);
      c.beginPath(); c.moveTo(-20, -44); c.lineTo(-26, -76); c.lineTo(-9, -58); c.lineTo(0, -84); c.lineTo(9, -58); c.lineTo(26, -76); c.lineTo(20, -44); c.closePath(); c.fill();
      c.fillStyle = b; c.beginPath(); c.ellipse(34, -72, 24, 9, -0.5, 0, Math.PI * 2); c.fill();
    }
  },
  {
    id: 'paxta', label: 'Paxta', draw: (c, a, b) => {
      c.strokeStyle = b; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 100); c.quadraticCurveTo(-6, 30, 0, -10); c.moveTo(0, 40); c.quadraticCurveTo(40, 20, 62, -34); c.moveTo(0, 55); c.quadraticCurveTo(-42, 30, -62, -26); c.stroke();
      [[0, -40], [62, -52], [-62, -46]].forEach(([x, y]) => {
        c.fillStyle = b; star(c, x, y + 26, 30, 5, 0.5); c.fill();
        [[0, -4], [-18, 6], [18, 6], [-9, -20], [9, -20]].forEach(([dx, dy]) => { c.fillStyle = a; circle(c, x + dx, y + dy, 17); c.fill(); });
      });
    }
  },
  {
    id: 'gul', label: 'Gul', draw: (c, a, b) => medallion(c, 0, 0, 96, { p1: a, p2: mix(a, '#ffffff', 0.55), p3: b, accent: '#f3c969' })
  },
  {
    id: 'yulduz8', label: 'Yulduz', draw: (c, a, b) => {
      c.fillStyle = a; star(c, 0, 0, 96, 8, 0.72); c.fill();
      c.strokeStyle = b; c.lineWidth = 5; star(c, 0, 0, 96, 8, 0.72); c.stroke();
      c.fillStyle = b; circle(c, 0, 0, 24); c.fill();
      c.fillStyle = a; circle(c, 0, 0, 12); c.fill();
    }
  },
  {
    id: 'hilol', label: 'Hilol', draw: (c, a) => {
      const R = 80, r = 66, d = 26;
      const x = (d * d + R * R - r * r) / (2 * d), y = Math.sqrt(R * R - x * x);
      const t1 = Math.atan2(-y, x), t2 = Math.atan2(y, x - d);
      c.fillStyle = a; c.beginPath(); c.moveTo(x, -y);
      c.arc(0, 0, R, t1, -t1, true);
      c.arc(d, 0, r, t2, -t2 + Math.PI * 2, false);
      c.closePath(); c.fill();
      star(c, 52, -34, 20, 5, 0.45); c.fill();
    }
  },
  { id: 'yurak', label: 'Yurak', draw: (c, a) => { c.fillStyle = a; heartPath(c); c.fill(); c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(-38, -24, 14, 24, 0.7, 0, Math.PI * 2); c.fill(); } },
  { id: 'ikat', label: 'Ikat', draw: (c, a, b) => ikat(c, 0, 0, 62, a, b, '#ffffff') },
  { id: 'barg', label: 'Novda', draw: (c, a) => branch(c, -92, 74, 90, -44, -70, -52, 6, a, 40) },
  {
    id: 'balon', label: 'Shar', draw: (c, a) => {
      c.strokeStyle = 'rgba(120,120,120,.8)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, 62); c.bezierCurveTo(14, 78, -14, 90, 0, 104); c.stroke();
      c.fillStyle = a; c.beginPath(); c.ellipse(0, -18, 54, 68, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(0, 48); c.lineTo(-9, 64); c.lineTo(9, 64); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-20, -40, 9, 18, 0.5, 0, Math.PI * 2); c.fill();
    }
  },
  {
    id: 'halqa', label: 'Uzuklar', draw: (c, a, b) => {
      c.lineWidth = 12;
      c.strokeStyle = a; circle(c, -26, 8, 50); c.stroke();
      c.strokeStyle = b; circle(c, 26, 8, 50); c.stroke();
      c.strokeStyle = a; c.beginPath(); c.arc(-26, 8, 50, -0.9, 0.9); c.stroke();
      c.fillStyle = '#ffffff'; diamond(c, -26, -60, 12, 15); c.fill();
      c.strokeStyle = b; c.lineWidth = 3; diamond(c, -26, -60, 12, 15); c.stroke();
    }
  },
  { id: 'yaltiroq', label: 'Yaltiroq', draw: (c, a, b) => { c.fillStyle = a; sparkle(c, 0, 0, 92); c.fill(); c.fillStyle = b; sparkle(c, 58, -62, 34); c.fill(); sparkle(c, -62, 58, 28); c.fill(); } },
  {
    id: 'burchak', label: 'Burchak', draw: (c, a, b) => {
      c.strokeStyle = a; c.lineWidth = 6;
      [150, 104, 58].forEach((r, i) => { c.strokeStyle = i === 1 ? b : a; c.lineWidth = i === 1 ? 3 : 6; c.beginPath(); c.arc(-96, -96, r, 0, Math.PI / 2); c.stroke(); });
      c.fillStyle = a; diamond(c, -96, -96, 14, 14); c.fill();
    }
  },
  {
    id: 'ramka', label: 'Ramka', draw: (c, a, b) => {
      c.strokeStyle = a; c.lineWidth = 8; rr(c, -92, -92, 184, 184, 20); c.stroke();
      c.strokeStyle = b; c.lineWidth = 3; rr(c, -76, -76, 152, 152, 12); c.stroke();
      c.fillStyle = a; [[-92, -92], [92, -92], [-92, 92], [92, 92]].forEach(([x, y]) => { diamond(c, x, y, 13, 13); c.fill(); });
    }
  },
  {
    id: 'konfetti', label: 'Konfetti', draw: (c, a, b) => {
      const r = rng(4);
      for (let i = 0; i < 28; i++) {
        c.save(); c.translate((r() - 0.5) * 190, (r() - 0.5) * 190); c.rotate(r() * 3);
        c.fillStyle = i % 3 === 0 ? a : (i % 3 === 1 ? b : mix(a, b, 0.5));
        if (i % 2) c.fillRect(-5, -10, 10, 20); else { circle(c, 0, 0, 7); c.fill(); }
        c.restore();
      }
    }
  }
];
export const STICKER_MAP = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

/* ---------- rasm ramkalari ---------- */
export const SHAPES = {
  circle: { label: 'Doira', aspect: 1 },
  oval: { label: 'Oval', aspect: 1.3 },
  arch: { label: 'Mehrob', aspect: 1.3 },
  rounded: { label: 'Kvadrat', aspect: 1.15 },
  heart: { label: 'Yurak', aspect: 0.92 }
};
function shapePath(c, shape, w, h) {
  c.beginPath();
  if (shape === 'circle') c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === 'oval') c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === 'arch') {
    c.moveTo(-w / 2, h / 2); c.lineTo(-w / 2, -h / 2 + w / 2);
    c.ellipse(0, -h / 2 + w / 2, w / 2, w / 2, 0, Math.PI, 0, false);
    c.lineTo(w / 2, h / 2); c.closePath();
  } else if (shape === 'heart') {
    c.save(); c.scale(w / 220, h / 200); c.translate(0, 8);
    c.moveTo(0, 80); c.bezierCurveTo(-110, -5, -60, -80, 0, -30); c.bezierCurveTo(60, -80, 110, -5, 0, 80);
    c.restore();
  } else {
    const r = w * 0.12;
    c.moveTo(-w / 2 + r, -h / 2); c.lineTo(w / 2 - r, -h / 2); c.arcTo(w / 2, -h / 2, w / 2, -h / 2 + r, r);
    c.lineTo(w / 2, h / 2 - r); c.arcTo(w / 2, h / 2, w / 2 - r, h / 2, r);
    c.lineTo(-w / 2 + r, h / 2); c.arcTo(-w / 2, h / 2, -w / 2, h / 2 - r, r);
    c.lineTo(-w / 2, -h / 2 + r); c.arcTo(-w / 2, -h / 2, -w / 2 + r, -h / 2, r); c.closePath();
  }
}

/* ---------- rasm keshi ---------- */
const imgCache = new Map();
export function getImage(src) {
  if (!src) return null;
  let e = imgCache.get(src);
  if (!e) {
    e = { img: new Image(), ok: false, cbs: [] };
    e.img.onload = () => { e.ok = true; e.cbs.splice(0).forEach((f) => f()); };
    e.img.onerror = () => { e.cbs.splice(0).forEach((f) => f()); };
    e.img.src = src;
    imgCache.set(src, e);
  }
  return e.ok ? e.img : null;
}
export function whenImage(src, cb) {
  const e = imgCache.get(src);
  if (!e) { getImage(src); return whenImage(src, cb); }
  if (e.ok) cb(); else e.cbs.push(cb);
}
export function loadImages(items) {
  const srcs = (items || []).filter((i) => i.kind === 'photo' && i.src).map((i) => i.src);
  return Promise.all(srcs.map((s) => new Promise((res) => { getImage(s); whenImage(s, res); })));
}

/* ---------- element o'lchamlari va chizish ---------- */
export function itemDims(it, fmt) {
  const base = Math.min(fmt.w, fmt.h);
  if (it.kind === 'photo') {
    const w = it.size * base, h = w * (SHAPES[it.shape] || SHAPES.circle).aspect;
    return { w, h };
  }
  const s = it.size * base;
  return { w: s, h: s };
}

export function drawItem(ctx, it, fmt, P, env = {}) {
  const { w, h } = itemDims(it, fmt);
  ctx.save();
  ctx.translate(it.fx * fmt.w, it.fy * fmt.h);
  ctx.rotate((it.rot || 0) * Math.PI / 180);
  if (it.flip) ctx.scale(-1, 1);
  if (it.kind === 'sticker') {
    const st = STICKER_MAP[it.sid];
    if (st) {
      const s = w / 200;
      ctx.scale(s, s);
      const a = it.color || P.accent || '#d4af37';
      const b = it.color2 || P.ink || '#ffffff';
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      st.draw(ctx, a, b);
    }
  } else if (it.kind === 'photo') {
    const accent = it.color || P.accent || '#d4af37';
    if (it.shadow !== false) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = w * 0.08; ctx.shadowOffsetY = w * 0.025;
      shapePath(ctx, it.shape, w, h); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
    }
    const img = getImage(it.src);
    ctx.save();
    shapePath(ctx, it.shape, w, h); ctx.clip();
    if (img) {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const sc = Math.max(w / iw, h / ih) * (it.zoom || 1);
      const dw = iw * sc, dh = ih * sc;
      const dx = -dw / 2 + (it.px || 0) * (dw - w) / 2, dy = -dh / 2 + (it.py || 0) * (dh - h) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = '#d8d8dc'; ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
    if (it.border !== false) {
      shapePath(ctx, it.shape, w, h); ctx.strokeStyle = accent; ctx.lineWidth = Math.max(4, w * 0.03); ctx.stroke();
      ctx.save(); ctx.scale(1.045, 1.045); shapePath(ctx, it.shape, w, h); ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.5, w * 0.008); ctx.stroke(); ctx.restore();
    }
  } else if (it.kind === 'qr') {
    const qr = env.getQR ? env.getQR(it) : null;
    const pad = w * 0.06;
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = w * 0.06;
    rr(ctx, -w / 2, -h / 2, w, h, w * 0.08); ctx.fillStyle = it.light || '#ffffff'; ctx.fill();
    ctx.shadowColor = 'transparent';
    if (qr) drawQR(ctx, qr, -w / 2 + pad, -h / 2 + pad, w - pad * 2, { dark: it.dark || '#111111', light: null, quiet: 0 });
    else { ctx.fillStyle = '#111'; ctx.font = `600 ${w * 0.09}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('QR', 0, 0); }
  }
  ctx.restore();
}

export function drawItems(ctx, items, fmt, P, env) {
  (items || []).forEach((it) => drawItem(ctx, it, fmt, P, env));
}

/** Nuqta (canvas koordinatalarida) element ichidami? */
export function hitTest(it, px, py, fmt) {
  const { w, h } = itemDims(it, fmt);
  const cx = it.fx * fmt.w, cy = it.fy * fmt.h;
  const a = -(it.rot || 0) * Math.PI / 180;
  const dx = px - cx, dy = py - cy;
  const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2;
}

/** Stiker rasmini kichik canvasga chizadi (panel uchun). */
export function drawStickerThumb(canvas, id, a = '#c2255c', b = '#1d1b3a') {
  const s = canvas.width;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, s, s);
  c.save(); c.translate(s / 2, s / 2); c.scale(s / 210, s / 210);
  const st = STICKER_MAP[id];
  if (st) { c.lineJoin = 'round'; c.lineCap = 'round'; st.draw(c, a, b); }
  c.restore();
}
