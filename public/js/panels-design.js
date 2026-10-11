// Panellar: Shablon, Matn, Dizayn.
import { core } from './core.js';
import { h, debounce } from './ui.js';
import { TEMPLATES, TEMPLATE_ORDER } from './templates.js';
import { TYPES, TYPE_GROUPS, LANGS, typeMsgs } from './i18n.js';
import { renderStatic, FORMATS, resolvePalette } from './render.js';
import { NAME_FONTS, BODY_FONTS } from './layout.js';
import { loadAllCustomAssets } from './templates.js';

const QUICK = [['navruz', "Navro'z"], ['iftor', 'Ramazon'], ['hayit', 'Hayit'], ['yangiyil', 'Yangi yil'], ['mart8', '8-mart'], ['bitiruv', 'Bitiruv'], ['ustozlar', 'Ustozlar kuni'], ['mavlud', 'Mavlud'], ['tugilgan', "Tug'ilgan kun"], ['nikoh', "Nikoh to'yi"]];

/* ---------------- Shablon ---------------- */
export function templatePanel() {
  const el = h('div');
  const sel = h('select', { class: 'input', 'aria-label': 'Tadbir turi', onchange: (e) => core.setType(e.target.value) },
    TYPE_GROUPS.map((g) => h('optgroup', { label: g.label }, Object.entries(TYPES).filter(([, t]) => t.group === g.id).map(([id, t]) => h('option', { value: id }, t.label)))));
  const quick = h('div', { class: 'chips' }, QUICK.filter(([id]) => TYPES[id]).map(([id, l]) => h('button', { class: 'chip', 'data-t': id, onclick: () => core.setType(id) }, l)));
  const grid = h('div', { class: 'tpl-grid' });
  const cells = {};
  TEMPLATE_ORDER.forEach((id) => {
    const c = h('canvas', { width: 150, height: 267 });
    const b = h('button', { class: 'tpl', 'aria-label': TEMPLATES[id].name, onclick: () => core.set({ tpl: id, pal: 0, custom: {} }) }, c, TEMPLATES[id].name, h('small', null, TEMPLATES[id].tag));
    cells[id] = { b, c }; grid.appendChild(b);
  });
  el.append(
    h('div', { class: 'field' }, h('label', null, 'Tadbir turi'), sel),
    h('div', { class: 'field' }, h('label', null, 'Tez tanlash (mavsumiy)'), quick),
    h('div', { class: 'lbl', style: { margin: '6px 0 8px' } }, 'Shablon'), grid,
    h('p', { class: 'hint', style: { marginTop: '12px' } }, 'Istalgan shablonni istalgan tadbir turi bilan ishlatishingiz mumkin — matn avtomatik moslashadi.'));

  function thumbs() {
    const S = core.S; const f = FORMATS.story; const scale = 150 / f.w;
    TEMPLATE_ORDER.forEach((id) => {
      const { c } = cells[id]; const x = c.getContext('2d');
      x.setTransform(scale, 0, 0, scale, 0, 0);
      try { renderStatic(x, { ...S, tpl: id, pal: 0, custom: {}, items: [], fonts: {} }, f, {}); } catch (e) { /* */ }
    });
  }
  const thumbsD = debounce(thumbs, 250);
  loadAllCustomAssets().then(() => thumbsD());
  let lastKey = '';
  function refresh(src) {
    const S = core.S;
    sel.value = S.type;
    $$$(quick, '.chip').forEach((b) => b.classList.toggle('on', b.dataset.t === S.type));
    TEMPLATE_ORDER.forEach((id) => cells[id].b.classList.toggle('on', id === S.tpl));
    const key = [S.type, S.lang, S.n1, S.n2, S.date, S.time, S.venue, S.msg, S.host].join('|');
    if (src === 'fonts' || key !== lastKey) { lastKey = key; thumbsD(); }
  }
  return { el, refresh, onShow: thumbs };
}
const $$$ = (r, s) => [...r.querySelectorAll(s)];

/* ---------------- Matn ---------------- */
export function textPanel() {
  const el = h('div');
  const inp = (field, o = {}) => {
    const i = h(o.area ? 'textarea' : 'input', { class: 'input', type: o.type || 'text', maxLength: o.max || 80, rows: o.area ? 3 : undefined, placeholder: o.ph || '', autocomplete: 'off',
      oninput: (e) => core.set({ [field]: e.target.value }, 'txt-' + field) });
    return i;
  };
  const f = {
    n1: inp('n1'), n2: inp('n2'), guest: inp('guest', { ph: 'Masalan: Aziz Karimov' }), host: inp('host', { max: 90 }),
    date: inp('date', { type: 'date' }), time: inp('time', { type: 'time' }), venue: inp('venue', { area: true, max: 200 }), msg: inp('msg', { area: true, max: 400 })
  };
  const lbl = {}; const wrap = {};
  const field = (k, label, extra) => { lbl[k] = h('label', null, label); wrap[k] = h('div', { class: 'field' }, lbl[k], f[k], extra); return wrap[k]; };
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Yozuv tili' }, LANGS.map((l) => h('button', { 'data-l': l.id, onclick: () => core.setLang(l.id) }, l.label)));
  const msgChips = h('div', { class: 'chips' });
  const dt = h('div', { class: 'grid2' });
  el.append(
    h('div', { class: 'field' }, h('label', null, 'Yozuv tili (matn avtomatik tarjima/o\'giriladi)'), seg),
    field('n1', ''), field('n2', ''), field('guest', 'Mehmon ismi (ixtiyoriy)', h('div', { class: 'hint' }, 'Ko\'p mehmon uchun "Yuklash → ZIP" bo\'limidan foydalaning.')),
    field('host', 'Taklif qiluvchi'),
    (() => { dt.append(field('date', 'Sana'), field('time', 'Vaqt')); return dt; })(),
    field('venue', 'Manzil'),
    field('msg', 'Taklif matni', msgChips));
  function refresh() {
    const S = core.S, T = TYPES[S.type];
    $$$(seg, 'button').forEach((b) => b.classList.toggle('on', b.dataset.l === S.lang));
    lbl.n1.textContent = T.l1; lbl.n2.textContent = T.l2 || ''; wrap.n2.hidden = !T.l2;
    wrap.host.hidden = !T.flags.host; wrap.venue.hidden = !T.flags.venue; dt.hidden = !(T.flags.date || T.flags.time);
    wrap.date.hidden = !T.flags.date; wrap.time.hidden = !T.flags.time;
    for (const k of Object.keys(f)) if (document.activeElement !== f[k] && f[k].value !== (S[k] || '')) f[k].value = S[k] || '';
    msgChips.replaceChildren(...typeMsgs(S.type, S.lang).map((m, i) => h('button', { class: 'chip' + (S.msg === m ? ' on' : ''), title: m, onclick: () => core.set({ msg: m }) }, 'Variant ' + (i + 1))));
  }
  return { el, refresh };
}

/* ---------------- Dizayn ---------------- */
export function designPanel() {
  const el = h('div');
  const pals = h('div', { class: 'pal-row' });
  const colors = {
    bg: h('input', { type: 'color', 'aria-label': 'Fon rangi', oninput: (e) => setCustom('bg', e.target.value) }),
    accent: h('input', { type: 'color', 'aria-label': 'Bezak rangi', oninput: (e) => setCustom('accent', e.target.value) }),
    ink: h('input', { type: 'color', 'aria-label': 'Matn rangi', oninput: (e) => setCustom('ink', e.target.value) })
  };
  const setCustom = (k, v) => core.set({ custom: { ...core.S.custom, [k]: v } }, 'col-' + k);
  const nameSel = h('select', { class: 'input', 'aria-label': 'Ism shrifti', onchange: (e) => core.set({ fonts: { ...core.S.fonts, name: e.target.value || undefined } }) },
    h('option', { value: '' }, 'Shablon bo\'yicha'), Object.entries(NAME_FONTS).map(([k, v]) => h('option', { value: k }, v.label)));
  const bodySel = h('select', { class: 'input', 'aria-label': 'Matn shrifti', onchange: (e) => core.set({ fonts: { ...core.S.fonts, body: e.target.value || undefined } }) },
    h('option', { value: '' }, 'Shablon bo\'yicha'), Object.entries(BODY_FONTS).map(([k, v]) => h('option', { value: k }, v.label)));
  const reset = h('button', { class: 'btn small', onclick: () => core.set({ custom: {}, fonts: {} }) }, 'Asl holiga qaytarish');
  el.append(
    h('div', { class: 'field' }, h('label', null, 'Rang uslubi'), pals),
    h('div', { class: 'field' }, h('label', null, 'O\'z ranglaringiz'),
      h('div', { class: 'row' },
        h('div', null, colors.bg, h('div', { class: 'hint' }, 'Fon')), h('div', null, colors.accent, h('div', { class: 'hint' }, 'Bezak')), h('div', null, colors.ink, h('div', { class: 'hint' }, 'Matn')))),
    h('div', { class: 'field' }, h('label', null, 'Ism shrifti'), nameSel),
    h('div', { class: 'field' }, h('label', null, 'Matn shrifti'), bodySel),
    reset,
    h('p', { class: 'hint', style: { marginTop: '12px' } }, 'Format (Story, Post, Gorizontal, Chop etish) ko\'rinish oynasi tagidagi tugmalar orqali tanlanadi.'));
  function refresh() {
    const S = core.S, T = TEMPLATES[S.tpl];
    pals.replaceChildren(...T.pals.map((p, i) => {
      const bg = p.bg || p.sky1 || p.bg1 || '#999', ac = p.accent || p.gold || '#fc0';
      return h('button', { class: 'sw' + (i === S.pal && !Object.keys(S.custom).length ? ' on' : ''), style: { background: bg }, 'aria-label': 'Uslub ' + (i + 1), onclick: () => core.set({ pal: i, custom: {} }) }, h('i', { style: { background: ac } }));
    }));
    const P = resolvePalette(S);
    for (const k of ['bg', 'accent', 'ink']) { const v = /^#[0-9a-f]{6}$/i.test(P[k] || '') ? P[k] : '#888888'; if (document.activeElement !== colors[k]) colors[k].value = v; }
    nameSel.value = S.fonts.name || ''; bodySel.value = S.fonts.body || '';
  }
  return { el, refresh };
}
