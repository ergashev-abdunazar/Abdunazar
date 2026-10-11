// Animatsiya: bloklar ketma-ket paydo bo'ladi, zarrachalar (fx) va sekin yaqinlashish (Ken Burns).
// Video eksporti va jonli sahifa shu bir xil animatordan foydalanadi.
import { buildLayout, drawWatermark, itemEnv } from './render.js';
import { drawItem } from './items.js';
import { rng, clamp, ease, luminance, sparkle, drawCover } from './draw.js';

const mk = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};

function fxColors(P) {
  if (P.conf) return P.conf;
  if (P.pet) return P.pet;
  if (P.petal1) return [P.petal1, P.petal2, P.accent, P.mimosa || P.accent];
  if (P.p1) return [P.p1, P.p2, P.accent];
  if (P.balls) return P.balls;
  return [P.accent || '#ffd27a', '#ffffff'];
}

/** Deterministik zarrachalar. Har biri vaqt funksiyasi bo'lgani uchun kadr tushib qolsa ham silliq. */
function makeParticles(kind, w, h, P, seed) {
  const r = rng(seed);
  const area = (w * h) / (1080 * 1920);
  const cols = fxColors(P);
  const u = Math.min(w, h) / 1080;
  const base = { sparkle: 26, twinkle: 46, dust: 38, confetti: 46, petal: 24, snow: 70 }[kind] || 20;
  const n = Math.max(10, Math.round(base * Math.sqrt(area) * (area > 1 ? 1 : 1) * (w > h ? 1.2 : 1)));
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      x: r(), y: r(), s: 0.5 + r() * 1.0, ph: r() * Math.PI * 2, sp: 0.5 + r() * 1.0,
      c: cols[Math.floor(r() * cols.length)], rot: r() * Math.PI * 2, vr: (r() - 0.5) * 3, sw: 0.5 + r()
    });
  }
  return { kind, arr, u, w, h, P };
}

function drawParticles(ctx, F, t, alpha = 1) {
  const { kind, arr, u, w, h, P } = F;
  const gold = P.accent || P.gold || '#ffd27a';
  ctx.save();
  for (const p of arr) {
    if (kind === 'sparkle' || kind === 'twinkle') {
      const f = 0.5 + 0.5 * Math.sin(t * (kind === 'twinkle' ? 2.2 : 1.6) * p.sp + p.ph);
      const a = Math.pow(f, kind === 'twinkle' ? 2.2 : 3) * alpha;
      if (a < 0.03) continue;
      const x = p.x * w, y = p.y * h;
      ctx.globalAlpha = a * (kind === 'twinkle' ? 0.9 : 0.85);
      ctx.fillStyle = kind === 'twinkle' ? (p.s > 1.1 ? gold : '#ffffff') : (p.s > 1 ? gold : '#fffbe8');
      if (kind === 'twinkle' && p.s < 1.1) { ctx.beginPath(); ctx.arc(x, y, (1.6 + p.s * 1.2) * u, 0, 7); ctx.fill(); }
      else { sparkle(ctx, x, y, (9 + p.s * 13) * u * (0.6 + 0.4 * f)); ctx.fill(); }
    } else if (kind === 'dust') {
      const y = ((p.y - t * 0.012 * p.sp) % 1 + 1) % 1;
      const x = p.x + Math.sin(t * 0.3 * p.sp + p.ph) * 0.02;
      const f = 0.5 + 0.5 * Math.sin(t * 0.8 + p.ph);
      ctx.globalAlpha = (0.12 + 0.28 * f) * alpha * Math.min(1, y * 6, (1 - y) * 6);
      ctx.fillStyle = p.s > 1.1 ? gold : P.ink || '#ffffff';
      ctx.beginPath(); ctx.arc(x * w, y * h, (2 + p.s * 3) * u, 0, 7); ctx.fill();
    } else if (kind === 'snow') {
      const sp = 0.025 + 0.03 * p.sp;
      const y = ((p.y + t * sp) % 1 + 1) % 1;
      const x = p.x + Math.sin(t * 0.7 * p.sw + p.ph) * 0.025;
      ctx.globalAlpha = (0.55 + 0.35 * p.s * 0.5) * alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(((x % 1) + 1) % 1 * w, y * h, (2.5 + p.s * 4.2) * u, 0, 7); ctx.fill();
    } else if (kind === 'confetti') {
      const sp = 0.05 + 0.06 * p.sp;
      const y = ((p.y + t * sp) % 1.1 + 1.1) % 1.1 - 0.05;
      const x = p.x + Math.sin(t * 1.1 * p.sw + p.ph) * 0.03;
      ctx.globalAlpha = 0.95 * alpha;
      ctx.fillStyle = p.c;
      ctx.save();
      ctx.translate(((x % 1) + 1) % 1 * w, y * h);
      ctx.rotate(p.rot + t * p.vr);
      const sc = Math.abs(Math.cos(t * 2 * p.sp + p.ph)) * 0.8 + 0.2;
      ctx.scale(1, sc);
      ctx.fillRect(-7 * u * p.s, -4 * u * p.s, 14 * u * p.s, 8 * u * p.s);
      ctx.restore();
    } else if (kind === 'petal') {
      const sp = 0.03 + 0.035 * p.sp;
      const y = ((p.y + t * sp) % 1.1 + 1.1) % 1.1 - 0.05;
      const x = p.x + Math.sin(t * 0.8 * p.sw + p.ph) * 0.05 + t * 0.004;
      ctx.globalAlpha = 0.88 * alpha;
      ctx.fillStyle = p.c;
      ctx.save();
      ctx.translate(((x % 1) + 1) % 1 * w, y * h);
      ctx.rotate(p.rot + Math.sin(t * p.sp + p.ph) * 1.2 + t * p.vr * 0.3);
      const L = (10 + p.s * 9) * u;
      ctx.scale(1, 0.45 + 0.4 * Math.abs(Math.sin(t * 1.3 * p.sp + p.ph)));
      ctx.beginPath(); ctx.moveTo(0, -L); ctx.bezierCurveTo(L * 0.9, -L * 0.4, L * 0.7, L * 0.6, 0, L); ctx.bezierCurveTo(-L * 0.7, L * 0.6, -L * 0.9, -L * 0.4, 0, -L); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * Animator yaratadi. Shriftlar oldindan yuklangan bo'lishi kerak.
 * o: { duration=15, loop=false, watermark=false, site, fx=true, zoom=0.035 }
 */
export function createAnimator(S, fmt, o = {}) {
  const { w, h } = fmt;
  const duration = o.duration || 15;
  const u = Math.min(w, h) / 1080;
  const scratch = mk(8, 8).getContext('2d');
  const lay = buildLayout(scratch, S, fmt);
  const P = lay.P;

  // 1) fon (bir marta)
  const bgC = mk(w, h);
  const bctx = bgC.getContext('2d');
  lay.bg(bctx);
  if (lay.extra) lay.extra(bctx);
  const dark = luminance(P.bg || '#000000') < 0.5;

  // video fon (maxsus shablon): kadrlar videodan olinadi, ustiga yarim shaffof qoplama va bezaklar
  let vid = null, overC = null;
  if (lay.T && lay.T.custom && lay.T.video && o.video !== false && typeof document !== 'undefined') {
    vid = document.createElement('video');
    vid.muted = true; vid.loop = true; vid.playsInline = true; vid.preload = 'auto'; vid.setAttribute('playsinline', ''); vid.src = lay.T.video;
    overC = mk(w, h); const oc = overC.getContext('2d'); lay.bg(oc, { noBase: true }); if (lay.extra) lay.extra(oc);
    vid.load();
  }

  // 2) bloklar (sprite)
  const pad = 70 * u;
  const sprites = lay.blocks.map((b) => {
    const sh = Math.ceil(b.h + pad * 2);
    const c = mk(w, sh);
    const x = c.getContext('2d');
    x.translate(0, -(b.y - pad));
    b.draw(x, b.y);
    return { c, y: b.y - pad, h: sh, cy: b.y + b.h / 2 };
  });

  const revealTotal = o.reveal || Math.min(5.2, Math.max(1.6, duration * 0.5));
  const n = sprites.length;
  const t0 = 0.35;
  const step = n > 1 ? Math.min(0.42, (revealTotal - t0 - 0.9) / (n - 1)) : 0;
  const blockStart = (i) => t0 + i * Math.max(0.08, step);
  const itemsStart = t0 + (n - 1) * Math.max(0.08, step) + 0.6;
  const env = itemEnv(S);
  const kind0 = o.fx === false ? null : (o.fxKind || (lay.T && lay.T.fx));
  const kind = kind0 && kind0 !== 'none' ? kind0 : null;
  const F = kind ? makeParticles(kind, w, h, P, (S.id || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 7)) : null;
  const wmC = o.watermark ? (() => { const c = mk(w, h); drawWatermark(c.getContext('2d'), fmt, o.site); return c; })() : null;
  const kb = o.zoom == null ? 0.035 : o.zoom;

  function draw(ctx, t) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    const zt = o.loop ? 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 28) : clamp(t / duration, 0, 1);
    const z = 1 + kb * zt;
    ctx.translate(w / 2, h / 2); ctx.scale(z, z); ctx.translate(-w / 2, -h / 2);
    if (vid && vid.readyState >= 2 && vid.videoWidth) { drawCover(ctx, vid, vid.videoWidth, vid.videoHeight, w, h); ctx.drawImage(overC, 0, 0); } else ctx.drawImage(bgC, 0, 0);

    // sekin yorug'lik oqimi (qorong'i fonlarda)
    if (dark && kb > 0) {
      const ph = ((t % 9) / 9);
      const gx = (ph * 1.6 - 0.3) * w;
      const g = ctx.createLinearGradient(gx - w * 0.25, 0, gx + w * 0.25, h * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }

    const behind = F && (kind === 'sparkle' || kind === 'twinkle' || kind === 'dust');
    if (behind) drawParticles(ctx, F, t, clamp(t / 1.2, 0, 1));
    const rise = 38 * u;
    sprites.forEach((s, i) => {
      const p = ease.out(clamp((t - blockStart(i)) / 0.9, 0, 1));
      if (p <= 0) return;
      const float = Math.sin(t * 0.7 + i * 1.3) * 2.2 * u * clamp((t - blockStart(i) - 1) / 1.5, 0, 1);
      ctx.globalAlpha = p;
      const dy = (1 - p) * rise + float;
      // kichik "ochilish" masshtabi blok markazi atrofida
      const sc = 0.965 + 0.035 * p;
      ctx.save();
      ctx.translate(w / 2, s.cy + dy); ctx.scale(sc, sc); ctx.translate(-w / 2, -s.cy);
      ctx.drawImage(s.c, 0, s.y);
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    (S.items || []).forEach((it, i) => {
      const p = clamp((t - itemsStart - i * 0.25) / 0.7, 0, 1);
      if (p <= 0) return;
      const e = ease.back(p);
      const cx = it.fx * w, cy = it.fy * h;
      ctx.save();
      ctx.globalAlpha = clamp(p * 1.5, 0, 1);
      ctx.translate(cx, cy + Math.sin(t * 0.9 + i) * 3 * u * p);
      ctx.scale(e, e);
      ctx.translate(-cx, -cy);
      drawItem(ctx, it, fmt, P, env);
      ctx.restore();
    });

    if (F && !behind) drawParticles(ctx, F, t, clamp(t / 1.2, 0, 1));
    ctx.restore();

    if (wmC) ctx.drawImage(wmC, 0, 0);
    if (!o.loop && o.fadeOut !== false) {
      const left = duration - t;
      if (left < 0.7) { ctx.save(); ctx.globalAlpha = clamp(1 - left / 0.7, 0, 1) * 0.9; ctx.fillStyle = P.bg || '#000'; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    }
  }

  const ready = () => new Promise((res) => {
    if (!vid || vid.readyState >= 2) return res();
    const done = () => res(); vid.addEventListener('loadeddata', done, { once: true }); vid.addEventListener('error', done, { once: true }); setTimeout(res, 5000);
  });
  const start = () => { if (vid) { try { vid.currentTime = 0; vid.play().catch(() => {}); } catch (e) { /* */ } } };
  const stop = () => { if (vid) { try { vid.pause(); } catch (e) { /* */ } } };
  return { fmt, w, h, duration, revealEnd: itemsStart + 1, draw, layout: lay, P, ready, start, stop, hasVideo: !!vid };
}
