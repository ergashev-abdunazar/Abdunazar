// Statik chizish (PNG/JPG/PDF uchun va muharrir ko'rinishi uchun).
import { TEMPLATES } from './templates.js';
import { deriveText } from './i18n.js';
import { drawItems, getImage } from './items.js';
import { makeQR } from './qr.js';
import { mix, luminance, text as drawText, rr } from './draw.js';

export { FORMATS } from './layout.js';

/** Tanlangan palitra + foydalanuvchi bergan ranglar. */
export function resolvePalette(S) {
  const T = TEMPLATES[S.tpl];
  const P = { ...(T.pals[S.pal] || T.pals[0]) };
  const c = S.custom || {};
  if (c.bg) {
    const dark = luminance(c.bg) < 0.4;
    P.bg = c.bg;
    if ('panel' in P) P.panel = mix(c.bg, dark ? '#ffffff' : '#000000', 0.1);
    if ('sky1' in P) { P.sky1 = c.bg; P.sky2 = mix(c.bg, '#ffffff', 0.55); }
    if ('bg1' in P) { P.bg1 = c.bg; P.bg2 = mix(c.bg, dark ? '#ffffff' : '#000000', 0.18); }
    if ('card' in P) P.shadow = mix(c.bg, '#000000', 0.25);
  }
  if (c.accent) {
    P.accent = c.accent;
    if ('gold' in P) P.gold = c.accent;
  }
  if (c.ink) P.ink = c.ink;
  return P;
}

export function buildLayout(ctx, S, fmt) {
  const T = TEMPLATES[S.tpl];
  const P = resolvePalette(S);
  const D = deriveText(S);
  const lay = T.layout(ctx, S, D, P, fmt);
  return { T, P, D, ...lay };
}

const qrCache = new Map();
export function getQR(link) {
  if (!link) return null;
  let q = qrCache.get(link);
  if (!q) { try { q = makeQR(link, 'M'); } catch (e) { q = null; } qrCache.set(link, q); }
  return q;
}
export function itemEnv(S) {
  return { getQR: () => getQR(S.link) };
}

export function drawWatermark(ctx, fmt, site) {
  const { w, h } = fmt;
  const u = Math.min(w, h) / 1080;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  const label = (site && site.domain ? site.domain : 'taklifnoma.uz') + '   ·   bepul variant';
  ctx.font = `700 ${Math.round(46 * u)}px Manrope, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const step = 250 * u, diag = Math.hypot(w, h);
  for (let y = -diag / 2; y < diag / 2; y += step) {
    for (let x = -diag / 2; x < diag / 2; x += ctx.measureText(label).width + 120 * u) {
      ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 5 * u; ctx.strokeText(label, x + ctx.measureText(label).width / 2, y);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillText(label, x + ctx.measureText(label).width / 2, y);
    }
  }
  ctx.restore();
}

/**
 * Taklifnomani to'liq chizadi.
 * o: { transparent, watermark, site, noItems, layout }
 */
export function renderStatic(ctx, S, fmt, o = {}) {
  const lay = o.layout || buildLayout(ctx, S, fmt);
  ctx.save();
  ctx.clearRect(0, 0, fmt.w, fmt.h);
  if (!o.transparent) {
    lay.bg(ctx);
    if (lay.extra) lay.extra(ctx);
  }
  lay.blocks.forEach((b) => b.draw(ctx, b.y));
  if (!o.noItems) drawItems(ctx, S.items, fmt, lay.P, itemEnv(S));
  if (o.watermark) drawWatermark(ctx, fmt, o.site);
  ctx.restore();
  return lay;
}

/** Yangi holat uchun boshlang'ich ma'lumot. */
export { getImage };
