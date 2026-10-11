// Holat (state) modeli: yaratish, tilni almashtirish, ID.
import { TYPES, typeText, typeMsgs, convertText, latToCyr } from './i18n.js';
import { TEMPLATES } from './templates.js';

export const DEFAULT_DATE = '2026-12-20';

export function uid(n = 10) {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  const buf = new Uint8Array(n);
  (globalThis.crypto || { getRandomValues: (b) => b.map(() => Math.random() * 256) }).getRandomValues(buf);
  for (let i = 0; i < n; i++) s += a[buf[i] % a.length];
  return s;
}

const VENUE = {
  lat: "«Sharq» to'yxonasi, Toshkent sh., Chilonzor tumani",
  ru: 'Банкетный зал «Шарк», г. Ташкент, Чиланзарский район'
};
const HOST = { lat: 'Karimovlar oilasi', ru: 'Семья Каримовых' };
const CORP_HOST = { lat: 'Texnopark MChJ', ru: 'ООО «Технопарк»' };

function pick(map, lang) {
  if (lang === 'ru') return map.ru;
  if (lang === 'cyr') return latToCyr(map.lat);
  return map.lat;
}

/** Tur va til uchun standart matnlar. */
export function defaultsFor(type, lang) {
  const T = TYPES[type];
  return {
    n1: typeText(type, 'n1', lang),
    n2: T.l2 ? typeText(type, 'n2', lang) : '',
    host: pick(type === 'korp' ? CORP_HOST : HOST, lang),
    venue: T.flags.venue ? pick(VENUE, lang) : '',
    msg: typeMsgs(type, lang)[0]
  };
}

export function newState(type = 'nikoh', lang = 'lat') {
  const T = TYPES[type];
  const d = defaultsFor(type, lang);
  return {
    v: 1,
    id: uid(10),
    lang,
    type,
    tpl: T.tpl,
    pal: 0,
    custom: {},
    fonts: {},
    fmt: 'story',
    n1: d.n1,
    n2: d.n2,
    guest: '',
    host: d.host,
    date: T.flags.date ? DEFAULT_DATE : '',
    time: T.flags.time ? '18:00' : '',
    venue: d.venue,
    msg: d.msg,
    items: [],
    link: null,
    music: { preset: 'nozik' }
  };
}

function isDefaultOf(field, value) {
  for (const type of Object.keys(TYPES)) {
    for (const lang of ['lat', 'cyr', 'ru']) {
      const d = defaultsFor(type, lang);
      if (field === 'msg') { if (typeMsgs(type, lang).includes(value)) return { type, lang }; }
      else if (d[field] === value) return { type, lang };
    }
  }
  return null;
}

/** Yozuv tilini almashtiradi: standart matnlar to'liq tarjima qilinadi, qolganlari o'tkaziladi. */
export function switchLang(S, to) {
  const from = S.lang;
  if (from === to) return S;
  const next = { ...S, lang: to };
  ['n1', 'n2', 'host', 'venue', 'msg', 'guest'].forEach((f) => {
    const v = S[f] || '';
    if (!v) return;
    const hit = isDefaultOf(f, v);
    if (hit) {
      if (f === 'msg') {
        const idx = typeMsgs(hit.type, hit.lang).indexOf(v);
        next.msg = typeMsgs(hit.type, to)[idx] || v;
      } else {
        next[f] = defaultsFor(hit.type, to)[f];
      }
      return;
    }
    next[f] = convertText(v, from, to);
  });
  return next;
}

/** Tadbir turini o'zgartiradi: standart matnlar yangilanadi, shablon tavsiya qilinadi. */
export function switchType(S, type) {
  const T = TYPES[type];
  const old = defaultsFor(S.type, S.lang);
  const nw = defaultsFor(type, S.lang);
  const next = { ...S, type, tpl: T.tpl, pal: 0 };
  ['n1', 'n2', 'host', 'venue'].forEach((f) => {
    if (!S[f] || S[f] === old[f] || isDefaultOf(f, S[f])) next[f] = nw[f];
  });
  if (!S.msg || isDefaultOf('msg', S.msg)) next.msg = nw.msg;
  if (T.flags.date && !S.date) next.date = DEFAULT_DATE;
  if (T.flags.time && !S.time) next.time = '18:00';
  if (!TEMPLATES[next.tpl]) next.tpl = 'atlas';
  return next;
}

/** Eski/yaroqsiz holatni tuzatish. */
export function normalizeState(raw) {
  const base = newState(raw && TYPES[raw.type] ? raw.type : 'nikoh', raw && raw.lang ? raw.lang : 'lat');
  const S = { ...base, ...(raw || {}) };
  if (!TEMPLATES[S.tpl]) S.tpl = base.tpl;
  if (!Array.isArray(S.items)) S.items = [];
  if (!S.custom) S.custom = {};
  if (!S.fonts) S.fonts = {};
  if (!S.music) S.music = { preset: 'nozik' };
  const pals = TEMPLATES[S.tpl].pals.length;
  if (!(S.pal >= 0 && S.pal < pals)) S.pal = 0;
  return S;
}
