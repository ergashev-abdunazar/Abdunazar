// Admin paneli: shablon muharriri (rasm/video fon), qo'shiqlar, promokodlar, taklifnomalar, statistika.
import { h, $, toast, modal, fmtMoney } from './ui.js';
import { registerCustomTemplates, loadTemplateAssets, TEMPLATES } from './templates.js';
import { newState, normalizeState } from './state.js';
import { renderStatic, FORMATS } from './render.js';
import { createAnimator } from './anim.js';
import { NAME_FONTS, BODY_FONTS } from './layout.js';
import { TYPES } from './i18n.js';
import { ensureFonts } from './fonts.js';

/* ---------------- API ---------------- */
async function call(url, method = 'GET', body) {
  const opt = { method, credentials: 'same-origin', headers: {} };
  if (method !== 'GET') opt.headers['X-Requested-With'] = 'admin';
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  let d = null; try { d = await r.json(); } catch (e) { /* */ }
  if (!r.ok) { const e = new Error((d && d.error) || 'Xato ' + r.status); e.status = r.status; throw e; }
  return d;
}
async function upload(file, kind) {
  const r = await fetch('/api/admin/upload?kind=' + kind, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'admin', 'Content-Type': file.type || 'application/octet-stream' }, body: file });
  let d = null; try { d = await r.json(); } catch (e) { /* */ }
  if (!r.ok) throw new Error((d && d.error) || 'Yuklab bo\'lmadi');
  return d.url;
}
const pick = (accept) => new Promise((res) => {
  const i = h('input', { type: 'file', accept, style: { display: 'none' } });
  i.addEventListener('change', () => { res(i.files[0] || null); i.remove(); }); document.body.appendChild(i); i.click();
});

/** Katta rasmlarni (telefon suratlari) 2400 px gacha kichraytiradi. */
async function prepImage(file, max = 2400) {
  if (file.size < 1.2e6 && /jpeg|png|webp/.test(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Rasmni o\'qib bo\'lmadi')); i.src = url; });
    const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
  } finally { URL.revokeObjectURL(url); }
}
/** Videodan birinchi kadrni (poster) JPEG qilib oladi. */
async function videoPoster(file) {
  const url = URL.createObjectURL(file);
  try {
    const v = h('video', { muted: true, playsInline: true, preload: 'auto', src: url });
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('Videoni o\'qib bo\'lmadi (MP4/H.264 yoki WebM bo\'lsin)')); setTimeout(() => rej(new Error('Video juda sekin ochildi')), 15000); });
    v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
    await new Promise((res) => { v.onseeked = res; setTimeout(res, 2000); });
    const sc = Math.min(1, 1920 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    return { blob: await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9)), w: v.videoWidth, h: v.videoHeight };
  } finally { URL.revokeObjectURL(url); }
}

/* ---------------- kirish ---------------- */
async function boot() {
  let ok = true;
  try { await call('/api/admin/stats'); } catch (e) { ok = false; }
  if (!ok) {
    $('#login').hidden = false;
    $('#loginForm').onsubmit = async (e) => {
      e.preventDefault(); $('#loginErr').textContent = '';
      try { await call('/api/admin/login', 'POST', { password: $('#pw').value }); location.reload(); } catch (err) { $('#loginErr').textContent = err.message; }
    };
    return;
  }
  $('#app').hidden = false;
  $('#logout').onclick = async () => { await call('/api/admin/logout', 'POST'); location.reload(); };
  const tabs = [['tpl', 'Shablonlar', tplTab], ['trk', 'Qo\'shiqlar', trackTab], ['promo', 'Promokodlar', promoTab], ['inv', 'Taklifnomalar', invTab], ['acc', 'Hisoblar', accTab], ['stat', 'Statistika', statTab], ['set', 'Sozlamalar', setTab]];
  const bar = $('#tabs'), main = $('#main'); let cur = localStorage.getItem('adm:tab') || 'tpl';
  const btns = {};
  const show = async (id) => {
    cur = id; try { localStorage.setItem('adm:tab', id); } catch (e) { /* */ }
    Object.entries(btns).forEach(([k, b]) => b.classList.toggle('on', k === id));
    main.replaceChildren(h('div', { class: 'hint' }, 'Yuklanmoqda…'));
    try { main.replaceChildren(await tabs.find((t) => t[0] === id)[2]()); } catch (e) { main.replaceChildren(h('div', { class: 'lock-note' }, e.message)); }
  };
  tabs.forEach(([id, label]) => { btns[id] = h('button', { class: 'tab', onclick: () => show(id) }, label); bar.appendChild(btns[id]); });
  show(tabs.some((t) => t[0] === cur) ? cur : 'tpl');
}

/* ---------------- statistika ---------------- */
async function statTab() {
  const s = await call('/api/admin/stats');
  const st = (n, l) => h('div', { class: 'stat' }, h('b', null, String(n)), h('span', null, l));
  return h('div', null, h('h2', null, 'Statistika'),
    h('div', { class: 'stat-grid' }, st(s.users, 'Tashrif buyuruvchilar'), st(s.invites, 'Jonli taklifnomalar'), st(s.views, 'Taklifnoma ko\'rishlari'), st(s.rsvps, 'RSVP javoblari'),
      st(s.unlocks.img, 'Ochilgan rasm/PDF'), st(s.unlocks.video, 'Ochilgan video'), st(s.unlocks.bulk, 'Ochilgan ZIP'), st(s.templates, 'Maxsus shablonlar'), st(s.tracks, 'Qo\'shiqlar'), st(s.storageMB + ' MB', 'Yuklangan fayllar')),
    h('p', { class: 'hint', style: { marginTop: '14px' } }, `ffmpeg: ${s.ffmpeg ? 'bor ✓ (MP4 konvertatsiya ishlaydi)' : 'yo\'q (video WebM bo\'lib qoladi)'} · Demo to'lov: ${s.demoPay ? 'YOQILGAN — productionda o\'chiring!' : 'o\'chiq'}`));
}

/* ---------------- qo'shiqlar ---------------- */
async function trackTab() {
  const root = h('div'); const list = h('div', { class: 'list' });
  async function load() {
    const { tracks } = await call('/api/tracks');
    list.replaceChildren(...(tracks.length ? tracks.map((t) => h('div', { class: 'li' }, h('span', { class: 'grow' }, '🎵 ' + t.title), h('audio', { controls: true, preload: 'none', src: t.url, style: { height: '34px', maxWidth: '220px' } }),
      h('button', { class: 'btn small', style: { color: 'var(--err)' }, onclick: async () => { if (!confirm(`"${t.title}" o'chirilsinmi?`)) return; await call('/api/admin/tracks/' + t.id, 'DELETE'); load(); } }, '🗑'))) : [h('div', { class: 'hint' }, 'Hozircha yuklangan qo\'shiq yo\'q.')]));
  }
  const title = h('input', { class: 'input', placeholder: 'Qo\'shiq nomi (masalan: Navro\'z kuyi)', maxLength: 60 });
  const btn = h('button', { class: 'btn primary', onclick: async () => {
    const f = await pick('audio/*'); if (!f) return;
    btn.disabled = true; btn.textContent = 'Yuklanmoqda…';
    try { const url = await upload(f, 'audio'); await call('/api/admin/tracks', 'POST', { title: title.value || f.name.replace(/\.[^.]+$/, ''), url }); title.value = ''; toast('Qo\'shiq qo\'shildi', 'ok'); load(); }
    catch (e) { toast(e.message, 'err'); } finally { btn.disabled = false; btn.textContent = '＋ Audio fayl tanlash va yuklash'; }
  } }, '＋ Audio fayl tanlash va yuklash');
  root.append(h('h2', null, 'Qo\'shiqlar kutubxonasi'), h('p', { class: 'hint' }, 'Bu yerga yuklangan qo\'shiqlar hamma foydalanuvchining video va jonli taklifnoma musiqa ro\'yxatida ko\'rinadi. MP3, M4A, WAV, OGG (25 MB gacha). Mualliflik huquqi sizda bo\'lgan musiqalarni yuklang.'),
    h('div', { class: 'card' }, h('div', { class: 'field' }, h('label', null, 'Nomi'), title), btn), list);
  await load(); return root;
}

/* ---------------- promokodlar ---------------- */
async function promoTab() {
  const root = h('div'); const list = h('div');
  async function load() {
    const { promos, env } = await call('/api/admin/promos');
    list.replaceChildren(h('table', { class: 'table' }, h('thead', null, h('tr', null, ['Kod', 'Rasm', 'Video', 'ZIP', 'Ishlatilgan', ''].map((x) => h('th', null, x)))),
      h('tbody', null, promos.map((p) => h('tr', null, h('td', null, h('b', null, p.code)), h('td', null, p.credits.img), h('td', null, p.credits.video), h('td', null, p.credits.bulk), h('td', null, `${p.used || 0}${p.maxUses ? ' / ' + p.maxUses : ''}`),
        h('td', null, h('button', { class: 'btn small', style: { color: 'var(--err)' }, onclick: async () => { await call('/api/admin/promos/' + p.code, 'DELETE'); load(); } }, '🗑')))))),
      env.length ? h('p', { class: 'hint' }, 'Server muhitidagi (PROMO_CODES) kodlar: ' + env.join(', ')) : null);
  }
  const f = { code: h('input', { class: 'input', placeholder: 'KOD2026', maxLength: 24 }), img: h('input', { class: 'input', type: 'number', min: 0, value: 1 }), video: h('input', { class: 'input', type: 'number', min: 0, value: 0 }), bulk: h('input', { class: 'input', type: 'number', min: 0, value: 0 }), maxUses: h('input', { class: 'input', type: 'number', min: 0, value: 0 }) };
  const field = (l, el) => h('div', { class: 'field' }, h('label', null, l), el);
  root.append(h('h2', null, 'Promokodlar'), h('p', { class: 'hint' }, 'Kod bergan kredit foydalanuvchiga rasm/video/ZIP ni bepul ochish imkonini beradi (1 kredit = 1 ta taklifnoma). "Limit" 0 bo\'lsa — cheksiz.'),
    h('div', { class: 'card' }, h('div', { class: 'grid2' }, field('Kod', f.code), field('Limit (necha kishi)', f.maxUses)), h('div', { class: 'grid2' }, field('Rasm krediti', f.img), field('Video krediti', f.video)), field('ZIP krediti', f.bulk),
      h('button', { class: 'btn primary', onclick: async () => { try { await call('/api/admin/promos', 'POST', { code: f.code.value, img: +f.img.value, video: +f.video.value, bulk: +f.bulk.value, maxUses: +f.maxUses.value }); f.code.value = ''; toast('Saqlandi', 'ok'); load(); } catch (e) { toast(e.message, 'err'); } } }, 'Kod yaratish')), list);
  await load(); return root;
}

/* ---------------- taklifnomalar ---------------- */
async function invTab() {
  const { invites } = await call('/api/admin/invites'); const root = h('div');
  const body = h('tbody', null, invites.map((i) => h('tr', null, h('td', null, h('a', { href: '/i/' + i.slug, target: '_blank' }, i.slug)), h('td', null, i.title), h('td', null, i.views), h('td', null, i.rsvps), h('td', null, new Date(i.created).toLocaleDateString('uz')),
    h('td', null, h('button', { class: 'btn small', style: { color: 'var(--err)' }, onclick: async (e) => { if (!confirm(`"${i.slug}" o'chirilsinmi? Havola ishlamay qoladi.`)) return; await call('/api/admin/invites/' + i.id, 'DELETE'); e.currentTarget.closest('tr').remove(); } }, '🗑')))));
  root.append(h('h2', null, 'Jonli taklifnomalar'), invites.length ? h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'table' }, h('thead', null, h('tr', null, ['Havola', 'Nomi', 'Ko\'rish', 'RSVP', 'Sana', ''].map((x) => h('th', null, x)))), body)) : h('div', { class: 'hint' }, 'Hali taklifnoma yo\'q.'));
  return root;
}

/* ---------------- hisoblar ---------------- */
async function accTab() {
  const { accounts } = await call('/api/admin/accounts'); const root = h('div');
  const body = h('tbody', null, accounts.map((a) => h('tr', null, h('td', null, a.email), h('td', null, a.invites), h('td', null, new Date(a.created).toLocaleDateString('uz')),
    h('td', null, h('button', { class: 'btn small', onclick: async () => {
      const pw = prompt(`"${a.email}" uchun yangi parol (kamida 8 ta belgi):`); if (!pw) return;
      try { await call('/api/admin/accounts/reset', 'POST', { email: a.email, password: pw }); toast('Parol almashtirildi', 'ok'); } catch (e) { toast(e.message, 'err'); }
    } }, 'Parolni tiklash')))));
  root.append(h('h2', null, 'Foydalanuvchi hisoblari'), h('p', { class: 'hint' }, 'Email tasdiqlash va emailga parol yuborish yo\'q. Foydalanuvchi parolini unutsa, shu yerdan yangi parol bering.'),
    accounts.length ? h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'table' }, h('thead', null, h('tr', null, ['Email', 'Taklifnoma', 'Sana', ''].map((x) => h('th', null, x)))), body)) : h('div', { class: 'hint' }, 'Hali hisob ochilmagan.'));
  return root;
}

/* ---------------- sozlamalar ---------------- */
async function setTab() {
  const o = h('input', { class: 'input', type: 'password', autocomplete: 'current-password' }), n = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'kamida 10 ta belgi' });
  return h('div', null, h('h2', null, 'Parolni o\'zgartirish'), h('div', { class: 'card', style: { maxWidth: '420px' } },
    h('div', { class: 'field' }, h('label', null, 'Eski parol'), o), h('div', { class: 'field' }, h('label', null, 'Yangi parol'), n),
    h('button', { class: 'btn primary', onclick: async () => { try { await call('/api/admin/password', 'POST', { old: o.value, new: n.value }); toast('Parol o\'zgartirildi', 'ok'); o.value = n.value = ''; } catch (e) { toast(e.message, 'err'); } } }, 'Saqlash')));
}

/* ================= SHABLONLAR ================= */
const blank = () => ({
  id: null, name: '', tag: 'maxsus', kind: 'image', bg: {}, ink: '#ffffff', accent: '#f3c969', nameFont: 'corm', bodyFont: 'corm', scrim: 0.25, scrimColor: '#000000', fx: 'none', textScale: 1, active: true, order: 0,
  region: { tall: { x: 0.08, y: 0.2, w: 0.84, h: 0.6 }, square: { x: 0.08, y: 0.1, w: 0.84, h: 0.8 }, wide: { x: 0.05, y: 0.1, w: 0.9, h: 0.8 } }
});
const DRAFT_ID = 'c_draft0000';
const KIND_OF = { story: 'tall', square: 'square', wide: 'wide' };

async function tplTab() {
  let saved = (await call('/api/admin/templates')).templates;
  let draft = blank(); let fmtId = 'story', sampleType = 'nikoh'; let anim = null, raf = 0, t0 = 0;
  const root = h('div');
  const listBox = h('div', { class: 'adm-tpls' });
  const canvas = h('canvas'); const ctx = canvas.getContext('2d');
  const prevBox = h('div', { class: 'adm-preview' }, canvas);
  const msg = h('div', { class: 'hint', style: { marginTop: '8px' } });

  const regionKey = () => KIND_OF[fmtId];
  const hasBg = () => !!(draft.bg.tall || draft.bg.poster);

  /* ---- chizish ---- */
  async function render() {
    cancelAnimationFrame(raf); raf = 0; anim = null;
    const fmt = FORMATS[fmtId];
    const maxH = Math.min(innerHeight - 160, 640), maxW = Math.min(prevBox.clientWidth - 24 || 480, 760);
    const s = Math.min(maxW / fmt.w, maxH / fmt.h); canvas.style.width = Math.round(fmt.w * s) + 'px'; canvas.style.height = Math.round(fmt.h * s) + 'px';
    const sc = Math.min(1, 900 / Math.max(fmt.w, fmt.h)); canvas.width = Math.round(fmt.w * sc); canvas.height = Math.round(fmt.h * sc);
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    if (!hasBg()) { ctx.fillStyle = '#2a2236'; ctx.fillRect(0, 0, fmt.w, fmt.h); ctx.fillStyle = '#fff'; ctx.font = `600 ${fmt.w * 0.04}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('Avval fon rasm yuklang', fmt.w / 2, fmt.h / 2); return; }
    registerCustomTemplates([...saved, { ...draft, id: DRAFT_ID }]);
    await loadTemplateAssets(DRAFT_ID);
    const S = normalizeState({ ...newState(sampleType, 'lat'), tpl: DRAFT_ID });
    await ensureFonts(S);
    renderStatic(ctx, S, fmt, {});
    overlay(fmt);
  }
  function overlay(fmt) {
    const r = draft.region[regionKey()]; const u = fmt.w / canvas.clientWidth;
    const x = r.x * fmt.w, y = r.y * fmt.h, w = r.w * fmt.w, hh = r.h * fmt.h;
    ctx.save(); ctx.fillStyle = 'rgba(80,160,255,.12)'; ctx.fillRect(x, y, w, hh);
    ctx.setLineDash([10 * u, 6 * u]); ctx.lineWidth = 2.5 * u; ctx.strokeStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4 * u; ctx.strokeRect(x, y, w, hh);
    ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.fillStyle = '#2f7bff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * u;
    [[x, y], [x + w, y], [x, y + hh], [x + w, y + hh]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, 9 * u, 0, 7); ctx.fill(); ctx.stroke(); });
    ctx.restore();
  }
  async function playAnim(on) {
    cancelAnimationFrame(raf); raf = 0; anim = null;
    if (!on) return render();
    if (!hasBg()) return;
    const fmt = FORMATS[fmtId];
    registerCustomTemplates([...saved, { ...draft, id: DRAFT_ID }]);
    await loadTemplateAssets(DRAFT_ID);
    const S = normalizeState({ ...newState(sampleType, 'lat'), tpl: DRAFT_ID }); await ensureFonts(S);
    anim = createAnimator(S, fmt, { loop: true, duration: 60, reveal: 3.5 }); await anim.ready(); anim.start(); t0 = performance.now();
    const sc = canvas.width / fmt.w; const tick = () => { ctx.setTransform(sc, 0, 0, sc, 0, 0); anim.draw(ctx, (performance.now() - t0) / 1000); raf = requestAnimationFrame(tick); }; tick();
  }

  /* ---- hudud (region) sudrab belgilash ---- */
  let drag = null;
  const toFrac = (e) => { const b = canvas.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }; };
  canvas.addEventListener('pointerdown', (e) => {
    if (anim || !hasBg()) return;
    const p = toFrac(e); const r = draft.region[regionKey()]; const hr = 16 / canvas.clientWidth, hv = 16 / canvas.clientHeight;
    const corners = { tl: [r.x, r.y], tr: [r.x + r.w, r.y], bl: [r.x, r.y + r.h], br: [r.x + r.w, r.y + r.h] };
    for (const [k, [cx, cy]] of Object.entries(corners)) if (Math.abs(p.x - cx) < hr && Math.abs(p.y - cy) < hv) { drag = { mode: k, r: { ...r } }; canvas.setPointerCapture(e.pointerId); return; }
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { drag = { mode: 'move', dx: p.x - r.x, dy: p.y - r.y }; canvas.setPointerCapture(e.pointerId); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toFrac(e); const r = draft.region[regionKey()]; const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    if (drag.mode === 'move') { r.x = cl(p.x - drag.dx, 0, 1 - r.w); r.y = cl(p.y - drag.dy, 0, 1 - r.h); }
    else {
      const o = drag.r; let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
      if (drag.mode.includes('l')) x0 = cl(p.x, 0, x1 - 0.1); else x1 = cl(p.x, x0 + 0.1, 1);
      if (drag.mode.includes('t')) y0 = cl(p.y, 0, y1 - 0.1); else y1 = cl(p.y, y0 + 0.1, 1);
      r.x = x0; r.y = y0; r.w = x1 - x0; r.h = y1 - y0;
    }
    schedule();
  });
  canvas.addEventListener('pointerup', () => { drag = null; }); canvas.addEventListener('pointercancel', () => { drag = null; });
  let pend = 0; const schedule = () => { if (pend) return; pend = requestAnimationFrame(() => { pend = 0; render(); }); };

  /* ---- forma ---- */
  const inp = (k, o = {}) => h('input', { class: 'input', value: draft[k] ?? '', ...o, oninput: (e) => { draft[k] = e.target.value; schedule(); } });
  const color = (k, label) => h('div', null, h('input', { type: 'color', value: draft[k], 'aria-label': label, oninput: (e) => { draft[k] = e.target.value; schedule(); } }), h('div', { class: 'hint' }, label));
  const nameIn = inp('name', { placeholder: 'Masalan: Oltin gul', maxLength: 40 }), tagIn = inp('tag', { placeholder: 'maxsus', maxLength: 20 });
  const kindSel = h('select', { class: 'input', onchange: (e) => { draft.kind = e.target.value; refreshForm(); schedule(); } }, h('option', { value: 'image' }, 'Rasm fon'), h('option', { value: 'video' }, 'Video fon (animatsiyali)'));
  const sel = (k, map, label) => h('div', { class: 'field' }, h('label', null, label), h('select', { class: 'input', onchange: (e) => { draft[k] = e.target.value; schedule(); } }, Object.entries(map).map(([v, l]) => h('option', { value: v, selected: draft[k] === v }, l))));
  const fxSel = h('select', { class: 'input', onchange: (e) => { draft.fx = e.target.value; schedule(); } }, [['none', 'Yo\'q'], ['sparkle', 'Yaltiroq yulduzlar'], ['dust', 'Chang zarralari'], ['confetti', 'Konfetti'], ['petal', 'Gul barglari'], ['twinkle', 'Miltillovchi yulduzlar'], ['snow', 'Qor']].map(([v, l]) => h('option', { value: v }, l)));
  const slider = (label, min, max, step, get, set, fmt = (v) => v) => { const out = h('span', { class: 'hint' }, fmt(get())); return h('div', { class: 'field' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('label', null, label), out), h('input', { type: 'range', min, max, step, value: get(), oninput: (e) => { set(+e.target.value); out.textContent = fmt(+e.target.value); schedule(); } })); };

  const dropBg = { tall: h('div', { class: 'drop' }), square: h('div', { class: 'drop' }), wide: h('div', { class: 'drop' }), video: h('div', { class: 'drop' }) };
  const dropLabel = { tall: 'Vertikal rasm (Story 9:16 / 4:5 / chop) — asosiy', square: 'Kvadrat rasm (1:1) — ixtiyoriy', wide: 'Gorizontal rasm (16:9) — ixtiyoriy', video: 'Video fayl (MP4/WebM, 90 MB gacha)' };
  async function chooseImage(slot) {
    const f = await pick('image/*'); if (!f) return;
    msg.textContent = 'Rasm yuklanmoqda…';
    try { const b = await prepImage(f); draft.bg[slot] = await upload(b, 'image'); msg.textContent = ''; refreshForm(); render(); } catch (e) { msg.textContent = ''; toast(e.message, 'err'); }
  }
  async function chooseVideo() {
    const f = await pick('video/mp4,video/webm,video/quicktime'); if (!f) return;
    msg.textContent = 'Video tekshirilmoqda…';
    try {
      let p = null; try { p = await videoPoster(f); } catch (e) { p = null; }
      msg.textContent = `Video yuklanmoqda (${(f.size / 1e6).toFixed(1)} MB)…`; draft.bg.video = await upload(f, 'video');
      msg.textContent = 'Poster tayyorlanmoqda…';
      if (p) draft.bg.poster = await upload(p.blob, 'image');
      else { try { draft.bg.poster = (await call('/api/admin/poster', 'POST', { video: draft.bg.video })).url; } catch (e) { throw new Error('Brauzer videoni o\'qiy olmadi va serverda ffmpeg yo\'q. Poster rasmini qo\'lda yuklang yoki H.264 MP4 ishlating.'); } }
      if (!draft.bg.tall) draft.bg.tall = draft.bg.poster;
      if (!p) p = { w: 0, h: 0 };
      msg.textContent = ''; refreshForm(); render();
      toast(p.w > p.h ? 'Gorizontal video: 16:9 formatda yaxshi ko\'rinadi, Story da qirqiladi' : 'Vertikal video yuklandi', 'ok');
    } catch (e) { msg.textContent = ''; toast(e.message, 'err'); }
  }
  function refreshDrops() {
    const slots = draft.kind === 'video' ? ['video', 'tall'] : ['tall', 'square', 'wide'];
    const wrap = h('div', { style: { display: 'grid', gap: '10px' } });
    slots.forEach((slot) => {
      const d = dropBg[slot]; const url = slot === 'video' ? draft.bg.video : draft.bg[slot];
      const label = slot === 'tall' && draft.kind === 'video' ? 'Poster (video yuklanganda avtomatik; almashtirish mumkin)' : dropLabel[slot];
      d.replaceChildren(...[h('div', { class: 'lbl' }, label),
        url ? (slot === 'video' ? h('video', { src: url, muted: true, loop: true, autoplay: true, playsInline: true }) : h('img', { src: url, alt: '' })) : null,
        h('button', { class: 'btn small', style: { marginTop: '8px' }, onclick: () => (slot === 'video' ? chooseVideo() : chooseImage(slot)) }, url ? 'Almashtirish' : 'Yuklash'),
        url && slot !== 'tall' ? h('button', { class: 'btn small', style: { marginTop: '8px', marginLeft: '6px' }, onclick: () => { delete draft.bg[slot]; refreshForm(); render(); } }, 'Olib tashlash') : null].filter(Boolean));
      wrap.appendChild(d);
    });
    return wrap;
  }

  const formBox = h('div');
  function refreshForm() {
    nameIn.value = draft.name; tagIn.value = draft.tag; kindSel.value = draft.kind; fxSel.value = draft.fx;
    const presets = h('div', { class: 'chips' }, [['Markaz', { y: 0.2, h: 0.6 }], ['Tepada', { y: 0.05, h: 0.45 }], ['Pastda', { y: 0.5, h: 0.45 }], ['To\'liq', { y: 0.05, h: 0.9 }]].map(([l, v]) => h('button', { class: 'chip', onclick: () => { Object.assign(draft.region[regionKey()], v); render(); } }, l)));
    const fmtChips = h('div', { class: 'chips' }, [['story', 'Story / 4:5 / chop'], ['square', '1:1'], ['wide', '16:9']].map(([k, l]) => h('button', { class: 'chip' + (fmtId === k ? ' on' : ''), onclick: () => { fmtId = k; refreshForm(); render(); } }, l)));
    const typeSel = h('select', { class: 'input', onchange: (e) => { sampleType = e.target.value; render(); } }, Object.entries(TYPES).map(([id, t]) => h('option', { value: id, selected: sampleType === id }, t.label)));
    formBox.replaceChildren(
      h('div', { class: 'card' }, h('h4', null, '1. Asosiy'), h('div', { class: 'grid2' }, h('div', { class: 'field' }, h('label', null, 'Shablon nomi'), nameIn), h('div', { class: 'field' }, h('label', null, 'Teg (kategoriya)'), tagIn)), h('div', { class: 'field' }, h('label', null, 'Fon turi'), kindSel)),
      h('div', { class: 'card' }, h('h4', null, '2. Fon fayllari'), refreshDrops()),
      h('div', { class: 'card' }, h('h4', null, '3. Matn joyi'), h('p', { class: 'hint', style: { marginTop: 0 } }, 'Ko\'rinish oynasidagi ko\'k to\'rtburchakni sudrab joylashtiring, burchaklaridan tortib o\'lchamini o\'zgartiring. Har bir format uchun alohida belgilanadi.'),
        h('div', { class: 'field' }, h('label', null, 'Qaysi format uchun'), fmtChips), h('div', { class: 'field' }, h('label', null, 'Tez joylashtirish'), presets),
        slider('Matn kattaligi', 50, 150, 5, () => Math.round(draft.textScale * 100), (v) => { draft.textScale = v / 100; }, (v) => v + '%')),
      h('div', { class: 'card' }, h('h4', null, '4. Ranglar va shrift'), h('div', { class: 'row', style: { marginBottom: '10px' } }, color('ink', 'Matn rangi'), color('accent', 'Bezak rangi'), color('scrimColor', 'Qoplama rangi')),
        slider('Qoplama (matn o\'qilishi uchun fonni qoraytirish)', 0, 80, 5, () => Math.round(draft.scrim * 100), (v) => { draft.scrim = v / 100; }, (v) => v + '%'),
        sel('nameFont', Object.fromEntries(Object.entries(NAME_FONTS).map(([k, v]) => [k, v.label])), 'Ism shrifti'), sel('bodyFont', Object.fromEntries(Object.entries(BODY_FONTS).map(([k, v]) => [k, v.label])), 'Matn shrifti'),
        h('div', { class: 'field' }, h('label', null, 'Animatsiya effekti'), fxSel)),
      h('div', { class: 'card' }, h('h4', null, '5. Sinov va saqlash'), h('div', { class: 'field' }, h('label', null, 'Namuna matn (tadbir turi)'), typeSel),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: draft.active, onchange: (e) => { draft.active = e.target.checked; } }), 'Foydalanuvchilarga ko\'rinsin'),
        h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn primary', onclick: save }, draft.id ? 'O\'zgarishlarni saqlash' : 'Shablonni saqlash'), h('button', { class: 'btn', onclick: () => { draft = blank(); refreshForm(); render(); } }, 'Yangi shablon')), msg));
  }
  async function save() {
    try {
      const { template } = await call('/api/admin/templates', 'POST', draft);
      draft = JSON.parse(JSON.stringify(template)); saved = (await call('/api/admin/templates')).templates; toast('Shablon saqlandi — foydalanuvchilarga ko\'rinadi', 'ok'); refreshForm(); renderList(); render();
    } catch (e) { toast(e.message, 'err'); }
  }
  async function renderList() {
    registerCustomTemplates(saved);
    await Promise.all(saved.map((t) => loadTemplateAssets(t.id)));
    await ensureFonts({ tpl: 'atlas', lang: 'lat', fonts: {} }, true);
    listBox.replaceChildren(...(saved.length ? saved.map((t) => {
      const c = h('canvas', { width: 200, height: 356 });
      const S = normalizeState({ ...newState('nikoh', 'lat'), tpl: t.id }); const x = c.getContext('2d'); x.setTransform(200 / 1080, 0, 0, 200 / 1080, 0, 0);
      try { renderStatic(x, S, FORMATS.story, {}); } catch (e) { /* */ }
      return h('div', { class: 'adm-tpl' + (t.active ? '' : ' off') }, c, h('b', null, t.name), h('span', { class: 'hint' }, `${t.kind === 'video' ? '🎬 video' : '🖼 rasm'} · ${t.tag}${t.active ? '' : ' · yashirin'}`),
        h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { draft = JSON.parse(JSON.stringify(t)); fmtId = 'story'; refreshForm(); render(); scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Tahrirlash'),
          h('button', { class: 'btn small', style: { color: 'var(--err)' }, onclick: async () => { if (!confirm(`"${t.name}" o'chirilsinmi? Shu shablondan foydalangan taklifnomalar standart shablonga o'tadi.`)) return; await call('/api/admin/templates/' + t.id, 'DELETE'); saved = saved.filter((x) => x.id !== t.id); if (draft.id === t.id) draft = blank(); renderList(); refreshForm(); render(); } }, '🗑')));
    }) : [h('div', { class: 'hint' }, 'Hali maxsus shablon yo\'q. Yuqoridagi muharrirda birinchisini yarating.')]));
  }
  const animBtn = h('button', { class: 'btn small', onclick: () => { const on = !anim; animBtn.textContent = on ? '■ To\'xtatish' : '▶ Animatsiyani ko\'rish'; playAnim(on); } }, '▶ Animatsiyani ko\'rish');
  root.append(h('h2', null, 'Maxsus shablonlar'), h('p', { class: 'hint' }, 'O\'zingizning rasm yoki videongizni fon qilib shablon yarating. Matn (ism, sana, manzil…) foydalanuvchi tomonidan tahrirlanadi, fon esa sizniki bo\'ladi. Rasm ichida matn bo\'sh joy qoldiring.'),
    h('div', { class: 'adm-split' }, h('div', { class: 'sticky' }, prevBox, h('div', { class: 'row', style: { marginTop: '8px', justifyContent: 'center' } }, animBtn)), formBox),
    h('h3', { style: { marginTop: '28px' } }, 'Yaratilgan shablonlar'), listBox);
  refreshForm(); await renderList(); setTimeout(render, 50);
  return root;
}

boot();
