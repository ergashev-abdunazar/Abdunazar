// Foydalanuvchidan kelgan holatni (state) tozalash: faqat ma'lum maydonlar, uzunlik va format cheklovlari.
const HEX = /^#[0-9a-fA-F]{6}$/;
const UPATH = /^\/u\/[a-z0-9._-]{8,80}$/;
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const num = (v, a, b, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d);

export const TPLS = ['atlas', 'oltin', 'minimal', 'quvnoq', 'suzani', 'tadbir', 'navruz', 'hayit', 'yangiyil', 'mart8'];
const FMTS = ['story', 'portrait', 'square', 'wide', 'print'];
const LANGS = ['lat', 'cyr', 'ru'];
const KINDS = ['sticker', 'photo', 'qr'];
const SHAPES = ['circle', 'oval', 'arch', 'rounded', 'heart'];
const MUSIC = ['none', 'file', 'nozik', 'milliy', 'quvnoq', 'tantanali', 'sokin'];

export function sanitizeState(s, isTpl = (id) => TPLS.includes(id)) {
  if (!s || typeof s !== 'object') throw new Error('Noto\'g\'ri ma\'lumot');
  const out = {
    v: 1,
    id: str(s.id, 24).replace(/[^a-z0-9]/gi, '') || undefined,
    lang: LANGS.includes(s.lang) ? s.lang : 'lat',
    type: str(s.type, 20).replace(/[^a-z0-9]/gi, '') || 'nikoh',
    tpl: isTpl(s.tpl) ? s.tpl : 'atlas',
    pal: Math.round(num(s.pal, 0, 9)),
    custom: {},
    fonts: {},
    fmt: FMTS.includes(s.fmt) ? s.fmt : 'story',
    n1: str(s.n1, 60), n2: str(s.n2, 60), guest: str(s.guest, 60), host: str(s.host, 90),
    date: /^\d{4}-\d{2}-\d{2}$/.test(s.date || '') ? s.date : '',
    time: /^\d{2}:\d{2}$/.test(s.time || '') ? s.time : '',
    venue: str(s.venue, 200), msg: str(s.msg, 400),
    items: [],
    link: null,
    music: { preset: 'nozik' }
  };
  ['bg', 'accent', 'ink'].forEach((k) => { if (s.custom && HEX.test(s.custom[k] || '')) out.custom[k] = s.custom[k]; });
  ['name', 'body'].forEach((k) => { if (s.fonts && /^[a-z]{3,8}$/.test(s.fonts[k] || '')) out.fonts[k] = s.fonts[k]; });
  (Array.isArray(s.items) ? s.items.slice(0, 40) : []).forEach((it) => {
    if (!it || !KINDS.includes(it.kind)) return;
    const o = { kind: it.kind, fx: num(it.fx, -0.2, 1.2, 0.5), fy: num(it.fy, -0.2, 1.2, 0.5), size: num(it.size, 0.03, 1.2, 0.15), rot: num(it.rot, -360, 360, 0) };
    if (it.flip) o.flip = true;
    if (it.kind === 'sticker') {
      o.sid = str(it.sid, 20).replace(/[^a-z0-9]/gi, '');
      if (HEX.test(it.color || '')) o.color = it.color;
      if (HEX.test(it.color2 || '')) o.color2 = it.color2;
    } else if (it.kind === 'photo') {
      if (!UPATH.test(it.src || '')) return;
      o.src = it.src; o.shape = SHAPES.includes(it.shape) ? it.shape : 'circle';
      o.zoom = num(it.zoom, 1, 4, 1); o.px = num(it.px, -1, 1, 0); o.py = num(it.py, -1, 1, 0);
      if (it.border === false) o.border = false;
      if (it.shadow === false) o.shadow = false;
      if (HEX.test(it.color || '')) o.color = it.color;
    } else if (it.kind === 'qr') {
      if (HEX.test(it.dark || '')) o.dark = it.dark;
    }
    out.items.push(o);
  });
  if (s.music && typeof s.music === 'object') {
    out.music = { preset: MUSIC.includes(s.music.preset) ? s.music.preset : 'nozik' };
    if (UPATH.test(s.music.file || '')) out.music.file = s.music.file;
    if (UPATH.test(s.music.voice || '')) out.music.voice = s.music.voice;
    out.music.voiceAt = num(s.music.voiceAt, 0, 30, 1);
  }
  return out;
}

export const RESERVED = new Set(['api', 'i', 'u', 'editor', 'js', 'css', 'admin', 'static', 'assets', 'login', 'new', 'studio', 'index', 'invite', 'og']);
export function validSlug(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug) || slug.endsWith('-') || slug.includes('--')) return 'Havola 3–40 belgi: kichik lotin harflari, raqam va tire';
  if (RESERVED.has(slug)) return 'Bu nom band qilingan';
  return null;
}
