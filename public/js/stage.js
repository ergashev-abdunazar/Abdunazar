// Ko'rinish oynasi: chizish, elementlarni tanlash/surish/kattalashtirish/burish (sichqoncha va barmoq).
import { core } from './core.js';
import { FORMATS, renderStatic, resolvePalette } from './render.js';
import { itemDims, hitTest } from './items.js';

export function initStage(canvas, box) {
  const ctx = canvas.getContext('2d');
  let raf = 0, view = { scale: 1, css: 1 };
  const fmt = () => FORMATS[core.S.fmt] || FORMATS.story;

  function fit() {
    const f = fmt();
    const bw = box.clientWidth - 20, bh = box.clientHeight - 20;
    if (bw <= 0 || bh <= 0) return;
    const s = Math.min(bw / f.w, bh / f.h);
    const cssW = Math.max(60, Math.floor(f.w * s)), cssH = Math.max(60, Math.floor(f.h * s));
    canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sc = Math.min(1, (cssW * dpr) / f.w);
    const W = Math.round(f.w * sc), H = Math.round(f.h * sc);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    view = { scale: sc, css: cssW / f.w };
  }

  function draw() {
    raf = 0;
    fit();
    const f = fmt(), S = core.S;
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    try { renderStatic(ctx, S, f, {}); } catch (e) { console.error(e); }
    // tanlangan element ramkasi
    const it = S.items[core.sel];
    if (it) {
      const { w, h } = itemDims(it, f);
      const u = 1 / view.css; // ekrandagi 1px = u birlik
      ctx.save();
      ctx.translate(it.fx * f.w, it.fy * f.h); ctx.rotate((it.rot || 0) * Math.PI / 180);
      ctx.setLineDash([8 * u, 6 * u]); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 3 * u;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.setLineDash([]); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#7b1f4f'; ctx.lineWidth = 1.2 * u; ctx.strokeRect(-w / 2, -h / 2, w, h);
      const r = 13 * u;
      const hnd = [[w / 2, h / 2, '⤡'], [w / 2, -h / 2, '✕']];
      hnd.forEach(([x, y, g]) => {
        ctx.fillStyle = g === '✕' ? '#c0262d' : '#7b1f4f'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 * u;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `700 ${15 * u}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(g, x, y + 1 * u);
      });
      ctx.restore();
    }
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };

  core.on((src) => { schedule(); });
  new ResizeObserver(schedule).observe(box);
  schedule();

  /* ---- sichqoncha / barmoq ---- */
  const pts = new Map();
  let drag = null, pinch = null;
  const toF = (e) => {
    const r = canvas.getBoundingClientRect(); const f = fmt();
    return { x: (e.clientX - r.left) / r.width * f.w, y: (e.clientY - r.top) / r.height * f.h };
  };
  function handleAt(p) {
    const it = core.S.items[core.sel]; if (!it) return null;
    const f = fmt(); const { w, h } = itemDims(it, f); const a = (it.rot || 0) * Math.PI / 180;
    const r = 18 / view.css;
    for (const [lx, ly, name] of [[w / 2, h / 2, 'scale'], [w / 2, -h / 2, 'del']]) {
      const x = it.fx * f.w + lx * Math.cos(a) - ly * Math.sin(a), y = it.fy * f.h + lx * Math.sin(a) + ly * Math.cos(a);
      if (Math.hypot(p.x - x, p.y - y) <= r) return name;
    }
    return null;
  }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = toF(e); const f = fmt();
    if (pts.size === 2 && core.sel >= 0) {
      const [a, b] = [...pts.values()]; const it = core.S.items[core.sel];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), size: it.size, rot: it.rot || 0 };
      drag = null; return;
    }
    const hd = handleAt(p);
    if (hd === 'del') { core.removeItem(core.sel); return; }
    if (hd === 'scale') { drag = { mode: 'scale' }; return; }
    const items = core.S.items;
    for (let i = items.length - 1; i >= 0; i--) {
      if (hitTest(items[i], p.x, p.y, f)) {
        core.sel = i; core.emit('select');
        drag = { mode: 'move', dx: p.x - items[i].fx * f.w, dy: p.y - items[i].fy * f.h };
        schedule(); return;
      }
    }
    if (core.sel !== -1) { core.sel = -1; core.emit('select'); schedule(); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const i = core.sel;
    if (pinch && pts.size >= 2 && i >= 0) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      core.updateItem(i, { size: Math.max(0.03, Math.min(1.2, pinch.size * d / pinch.d)), rot: pinch.rot + (ang - pinch.ang) * 180 / Math.PI }, 'pinch');
      return;
    }
    if (!drag || i < 0) {
      // sichqoncha kursori
      const p = toF(e); const f = fmt();
      const hd = handleAt(p);
      canvas.style.cursor = hd === 'scale' ? 'nwse-resize' : hd === 'del' ? 'pointer' : core.S.items.some((it) => hitTest(it, p.x, p.y, f)) ? 'move' : 'default';
      return;
    }
    const f = fmt(); const p = toF(e); const it = core.S.items[i];
    if (drag.mode === 'move') {
      core.updateItem(i, { fx: Math.max(-0.1, Math.min(1.1, (p.x - drag.dx) / f.w)), fy: Math.max(-0.1, Math.min(1.1, (p.y - drag.dy) / f.h)) }, 'drag' + i);
    } else if (drag.mode === 'scale') {
      const cx = it.fx * f.w, cy = it.fy * f.h; const dx = p.x - cx, dy = p.y - cy;
      const { w, h } = itemDims(it, f); const asp = h / w;
      const base = Math.min(f.w, f.h);
      const newW = (2 * Math.hypot(dx, dy)) / Math.sqrt(1 + asp * asp);
      const size = Math.max(0.03, Math.min(1.2, newW / base));
      const rot = (Math.atan2(dy, dx) - Math.atan2(asp, 1)) * 180 / Math.PI;
      core.updateItem(i, { size, rot: Math.round(rot) }, 'scale' + i);
    }
  });
  const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (pts.size === 0) drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => {
    const i = core.sel; if (i < 0) return;
    e.preventDefault();
    const it = core.S.items[i];
    core.updateItem(i, { size: Math.max(0.03, Math.min(1.2, it.size * (e.deltaY < 0 ? 1.06 : 0.94))) }, 'wheel' + i);
  }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    const i = core.sel; if (i < 0) return;
    const it = core.S.items[i]; const st = e.shiftKey ? 0.02 : 0.005;
    if (e.key === 'Delete' || e.key === 'Backspace') { core.removeItem(i); e.preventDefault(); }
    else if (e.key.startsWith('Arrow')) {
      const d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      core.updateItem(i, { fx: it.fx + d[0], fy: it.fy + d[1] }, 'key' + i); e.preventDefault();
    }
  });
  return { schedule };
}
