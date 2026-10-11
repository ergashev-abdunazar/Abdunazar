// Jonli taklifnoma sahifasi: konvert, animatsiya, musiqa, sanoq, xarita, kalendar, RSVP.
import { api } from './api.js';
import { normalizeState } from './state.js';
import { createAnimator } from './anim.js';
import { FORMATS, resolvePalette } from './render.js';
import { deriveText, latToCyr, TYPES } from './i18n.js';
import { ensureFonts } from './fonts.js';
import { loadImages } from './items.js';
import { renderMusic } from './audio.js';
import { mix, luminance } from './draw.js';
import { h, $, toast } from './ui.js';
import { shareLinks } from './exporters.js';
import { loadCustomTemplates } from './custom.js';

const UI_LAT = {
  envTitle: 'Sizga taklifnoma', envSub: 'Ochish uchun bosing', open: 'Ochish', until: 'Tadbirgacha', d: 'kun', h: 'soat', m: 'daqiqa', s: 'soniya',
  started: 'Tadbir boshlandi', passed: 'Tadbir o\'tdi', when: 'Sana va vaqt', venue: 'Manzil', map: 'Xaritada ochish', cal: 'Kalendarga qo\'shish', ics: 'Faylni yuklash (.ics)',
  rsvp: 'Ishtirokingizni tasdiqlang', name: 'Ismingiz', yes: 'Kelaman', no: 'Kela olmayman', maybe: 'Balki', count: 'Necha kishi', note: 'Izoh (ixtiyoriy)', send: 'Yuborish',
  thanks: 'Rahmat! Javobingiz qabul qilindi.', program: 'Dastur', dress: 'Kiyim kodi', gallery: 'Suratlar', wish: 'Tilak va sovg\'a', contact: 'Aloqa', call: 'Qo\'ng\'iroq qilish', share: 'Do\'stlarga ulashish', made: 'Bu kabi taklifnomani o\'zingiz ham yarating', scroll: 'Pastga suring ↓', nameReq: 'Ismingizni kiriting', copy: 'Havolani nusxalash', copied: 'Nusxalandi'
};
const UI_RU = {
  envTitle: 'Вам приглашение', envSub: 'Нажмите, чтобы открыть', open: 'Открыть', until: 'До события', d: 'дн.', h: 'час.', m: 'мин.', s: 'сек.',
  started: 'Событие началось', passed: 'Событие прошло', when: 'Дата и время', venue: 'Адрес', map: 'Открыть на карте', cal: 'Добавить в календарь', ics: 'Скачать файл (.ics)',
  rsvp: 'Подтвердите участие', name: 'Ваше имя', yes: 'Приду', no: 'Не смогу', maybe: 'Возможно', count: 'Сколько человек', note: 'Комментарий (необязательно)', send: 'Отправить',
  thanks: 'Спасибо! Ваш ответ принят.', program: 'Программа', dress: 'Дресс-код', gallery: 'Фотографии', wish: 'Пожелания', contact: 'Контакты', call: 'Позвонить', share: 'Поделиться с друзьями', made: 'Создайте такое же приглашение', scroll: 'Листайте вниз ↓', nameReq: 'Введите имя', copy: 'Скопировать ссылку', copied: 'Скопировано'
};
const slug = decodeURIComponent(location.pathname.split('/')[2] || '');

async function main() {
  let data;
  try { [data] = await Promise.all([api.get(slug), loadCustomTemplates()]); } catch (e) { $('#nf').hidden = false; return; }
  const S = normalizeState({ ...data.state });
  const g = new URLSearchParams(location.search).get('g');
  if (g) S.guest = g.slice(0, 60);
  S.link = `${location.origin}/i/${slug}`;
  const tz = (data.site && data.site.tz) || '+05:00';
  const UI = S.lang === 'ru' ? UI_RU : S.lang === 'cyr' ? Object.fromEntries(Object.entries(UI_LAT).map(([k, v]) => [k, latToCyr(v)])) : UI_LAT;
  const D = deriveText(S); const T = TYPES[S.type];
  const P = resolvePalette(S);
  document.documentElement.lang = S.lang === 'ru' ? 'ru' : 'uz';

  // mavzu ranglari
  const dark = luminance(P.bg || '#000') < 0.45;
  const root = document.documentElement.style;
  root.setProperty('--pb', dark ? P.bg : mix(P.bg, '#ffffff', 0.65));
  root.setProperty('--pc', dark ? mix(P.bg, '#ffffff', 0.1) : '#ffffff');
  root.setProperty('--pi', /^#/.test(P.ink || '') ? (dark ? P.ink : P.ink) : (dark ? '#fff' : '#231c33'));
  root.setProperty('--pa', P.accent || '#7b1f4f'); root.setProperty('--hb', P.bg || '#000');
  root.setProperty('--ev1', mix(P.bg, '#ffffff', 0.08)); root.setProperty('--ev2', mix(P.bg, '#000000', 0.55));
  root.setProperty('--eb', mix(P.accent || '#d9a441', '#ffffff', 0.78)); root.setProperty('--ef', mix(P.accent || '#d9a441', '#ffffff', 0.6));
  root.setProperty('--ef2', mix(P.accent || '#d9a441', '#ffffff', 0.7)); root.setProperty('--es', P.accent || '#b3243f');

  const title = [S.n1, S.n2].filter(Boolean).join(' & ') || 'Taklifnoma';
  document.title = title;
  $('#envTitle').textContent = UI.envTitle + (S.guest ? ': ' + S.guest : '');
  $('#envSub').textContent = title; $('#hint').textContent = UI.scroll;
  $('#env').hidden = false; $('#app').hidden = false;

  /* ---- animator ---- */
  const cv = $('#cv'); const cx = cv.getContext('2d');
  let anim = null, fmtId = '', t0 = 0, started = false, visible = true, scale = 1;
  const pickFmt = () => { const a = innerWidth / innerHeight; return a > 1.25 ? 'wide' : a > 0.7 ? 'portrait' : 'story'; };
  async function build() {
    await ensureFonts(S); await loadImages(S.items);
    fmtId = pickFmt(); const fmt = FORMATS[fmtId];
    anim = createAnimator(S, fmt, { loop: true, duration: 60, reveal: 4.6 });
    layout();
  }
  function layout() {
    if (!anim) return;
    const fmt = anim.fmt; const s = Math.min(innerWidth / fmt.w, innerHeight / fmt.h);
    const cssW = Math.floor(fmt.w * s), cssH = Math.floor(fmt.h * s);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    const dpr = Math.min(devicePixelRatio || 1, 2);
    scale = Math.min(1, (cssW * dpr) / fmt.w, 1400 / Math.max(fmt.w, fmt.h) * 1.0);
    cv.width = Math.round(fmt.w * scale); cv.height = Math.round(fmt.h * scale);
  }
  addEventListener('resize', () => { if (anim && pickFmt() !== fmtId) { build(); } else layout(); });
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.01 }).observe($('#hero'));
  function frame() {
    requestAnimationFrame(frame);
    if (!anim || !started || !visible || document.hidden) return;
    cx.setTransform(scale, 0, 0, scale, 0, 0);
    anim.draw(cx, (performance.now() - t0) / 1000);
  }
  requestAnimationFrame(frame);

  /* ---- musiqa ---- */
  const preset = (S.music && S.music.preset) || 'nozik';
  let actx = null, master = null, voiceEl = null, musicBuf = null, fileEl = null, muted = false;
  const wantMusic = preset !== 'none' || (S.music && (S.music.file || S.music.voice));
  function prepMusic() {
    if (S.music && S.music.file) { fileEl = new Audio(S.music.file); fileEl.loop = true; fileEl.preload = 'auto'; }
    else if (preset !== 'none') { try { musicBuf = renderMusic(preset, 32, { loop: true }); } catch (e) { console.error(e); } }
    if (S.music && S.music.voice) { voiceEl = new Audio(S.music.voice); voiceEl.preload = 'auto'; }
  }
  function playMusic() {
    try {
      if (musicBuf) {
        const AC = window.AudioContext || window.webkitAudioContext; actx = new AC({ sampleRate: musicBuf.sampleRate });
        const b = actx.createBuffer(2, musicBuf.L.length, musicBuf.sampleRate); b.copyToChannel(musicBuf.L, 0); b.copyToChannel(musicBuf.R, 1);
        const src = actx.createBufferSource(); src.buffer = b; src.loop = true; master = actx.createGain(); master.gain.value = 0.0;
        src.connect(master); master.connect(actx.destination); src.start(); if (actx.state === 'suspended') actx.resume();
        master.gain.linearRampToValueAtTime(0.75, actx.currentTime + 1.5);
      }
      if (fileEl) { fileEl.volume = 0.8; fileEl.play().catch(() => {}); }
      if (voiceEl) setTimeout(() => { duck(true); voiceEl.onended = () => duck(false); voiceEl.play().catch(() => duck(false)); }, 1500);
    } catch (e) { console.error(e); }
  }
  function duck(on) {
    const v = on ? 0.3 : 0.75;
    if (master && actx) master.gain.linearRampToValueAtTime(muted ? 0 : v, actx.currentTime + 0.4);
    if (fileEl) fileEl.volume = muted ? 0 : (on ? 0.25 : 0.8);
  }
  const muteBtn = $('#mute');
  muteBtn.onclick = () => {
    muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊';
    if (master && actx) master.gain.value = muted ? 0 : 0.75; if (fileEl) fileEl.volume = muted ? 0 : 0.8; if (voiceEl) voiceEl.muted = muted;
  };

  const openBtn = $('#openBtn'); openBtn.textContent = '…';
  setTimeout(async () => { prepMusic(); await build(); openBtn.disabled = false; openBtn.textContent = UI.open; }, 60);
  openBtn.onclick = () => {
    const env = $('#env'); env.classList.add('open');
    started = true; t0 = performance.now(); if (anim) anim.start();
    if (wantMusic) { playMusic(); muteBtn.hidden = false; }
    setTimeout(() => env.classList.add('gone'), 700);
    setTimeout(() => { env.hidden = true; }, 1600);
  };

  /* ---- pastki bo'limlar ---- */
  const inner = $('#in'); const card = (title, ...k) => h('div', { class: 'sec-card' }, title ? h('h3', null, title) : null, ...k);
  const hasWhen = T.flags.date && S.date;
  const when = hasWhen ? new Date(`${S.date}T${S.time || '00:00'}:00${tz}`) : null;
  if (when && !isNaN(when)) {
    const cells = ['d', 'h', 'm', 's'].map((k) => ({ k, b: h('b', null, '00') }));
    const msg = h('div', { class: 'hint', style: { marginTop: '10px', color: '#7a7388' } });
    inner.append(card(UI.until, h('div', { class: 'count' }, cells.map((c) => h('div', null, c.b, h('span', null, UI[c.k])))), msg));
    const tick = () => {
      let diff = when - Date.now();
      if (diff <= 0) { cells.forEach((c) => { c.b.textContent = '00'; }); msg.textContent = Date.now() - when < 6 * 3600e3 ? UI.started : UI.passed; return; }
      const dd = Math.floor(diff / 864e5); diff -= dd * 864e5; const hh = Math.floor(diff / 36e5); diff -= hh * 36e5; const mm = Math.floor(diff / 6e4); diff -= mm * 6e4; const ss = Math.floor(diff / 1000);
      [dd, hh, mm, ss].forEach((v, i) => { cells[i].b.textContent = String(v).padStart(2, '0'); });
    };
    tick(); setInterval(tick, 1000);
  }
  if (hasWhen) {
    inner.append(card(UI.when, h('div', { style: { fontSize: '22px', fontWeight: 800 } }, D.d ? `${+D.d.day} ${D.d.month} ${D.d.year}` : ''), h('div', { style: { color: '#7a7388', margin: '2px 0 12px' } }, D.sub),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('a', { class: 'btn small', target: '_blank', rel: 'noopener', href: gcal() }, UI.cal + ' · Google'),
        h('button', { class: 'btn small', onclick: downloadIcs }, UI.ics))));
  }
  if (T.flags.venue && S.venue) {
    const q = encodeURIComponent(S.venue);
    inner.append(card(UI.venue, h('div', { style: { fontSize: '17px', fontWeight: 700, marginBottom: '12px' } }, S.venue),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('a', { class: 'btn small', target: '_blank', rel: 'noopener', href: `https://yandex.com/maps/?text=${q}` }, 'Yandex Maps'),
        h('a', { class: 'btn small', target: '_blank', rel: 'noopener', href: `https://www.google.com/maps/search/?api=1&query=${q}` }, 'Google Maps'),
        h('a', { class: 'btn small', target: '_blank', rel: 'noopener', href: `https://2gis.uz/search/${q}` }, '2GIS'))));
  }
  const X = S.extra || {};
  if (X.program && X.program.length) {
    inner.append(card(UI.program, h('div', { class: 'timeline' }, X.program.map((r) => h('div', { class: 'tl-row' }, h('b', null, r.t || '•'), h('span', null, r.x))))));
  }
  if (X.dress) inner.append(card(UI.dress, h('div', { style: { fontSize: '17px', fontWeight: 700 } }, X.dress)));
  if (X.gallery && X.gallery.length) {
    const lb = h('div', { class: 'lightbox', hidden: true, onclick: () => { lb.hidden = true; } }, h('img', { alt: '' }));
    document.body.append(lb);
    inner.append(card(UI.gallery, h('div', { class: 'gal' }, X.gallery.map((u) => h('img', { src: u, alt: '', loading: 'lazy', onclick: () => { lb.firstChild.src = u; lb.hidden = false; } })))));
  }
  if (X.wish) inner.append(card(UI.wish, h('div', { style: { fontSize: '16px', lineHeight: '1.5' } }, X.wish)));
  if (X.phone) {
    const digits = X.phone.replace(/\D/g, '');
    inner.append(card(UI.contact, X.cname ? h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, X.cname) : null, h('div', { style: { color: '#7a7388', marginBottom: '12px' } }, X.phone),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('a', { class: 'btn small', href: 'tel:+' + digits.replace(/^\+/, '') }, UI.call),
        h('a', { class: 'btn small', target: '_blank', rel: 'noopener', href: 'https://wa.me/' + digits }, 'WhatsApp'))));
  }
  function fmtUtc(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function gcal() {
    const end = new Date(when.getTime() + 4 * 3600e3);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + fmtUtc(when) + '/' + fmtUtc(end) + '&details=' + encodeURIComponent((S.msg || '') + '\n' + S.link) + '&location=' + encodeURIComponent(S.venue || '');
  }
  function downloadIcs() {
    const end = new Date(when.getTime() + 4 * 3600e3); const esc = (s) => String(s || '').replace(/[\;,]/g, '\\$&').replace(/\n/g, '\\n');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taklifnoma//UZ', 'BEGIN:VEVENT', `UID:${slug}@${location.host}`, `DTSTAMP:${fmtUtc(new Date())}`, `DTSTART:${fmtUtc(when)}`, `DTEND:${fmtUtc(end)}`,
      `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc((S.msg || '') + ' ' + S.link)}`, `LOCATION:${esc(S.venue)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = h('a', { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: slug + '.ics' }); document.body.appendChild(a); a.click(); a.remove();
  }

  if (T.flags.date) {
    const done = (() => { try { return localStorage.getItem('rsvp:' + slug); } catch (e) { return null; } })();
    const name = h('input', { class: 'input', value: S.guest || '', placeholder: UI.name, maxLength: 60, 'aria-label': UI.name });
    let status = 'yes';
    const seg = h('div', { class: 'seg', role: 'group' }, [['yes', UI.yes], ['maybe', UI.maybe], ['no', UI.no]].map(([v, l]) => h('button', { type: 'button', class: v === 'yes' ? 'on' : '', onclick: (e) => { status = v; [...seg.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, l)));
    const count = h('select', { class: 'input', 'aria-label': UI.count }, Array.from({ length: 10 }, (_, i) => h('option', { value: i + 1 }, `${UI.count}: ${i + 1}`)));
    const note = h('input', { class: 'input', placeholder: UI.note, maxLength: 200, 'aria-label': UI.note });
    const msg = h('div', { style: { minHeight: '20px', marginTop: '8px', fontWeight: 700 } }, done ? UI.thanks : '');
    const send = h('button', { class: 'btn primary block', type: 'button', onclick: async (e) => {
      const btn = e.currentTarget;
      if (!name.value.trim()) { msg.textContent = UI.nameReq; msg.style.color = '#c0262d'; return; }
      btn.disabled = true;
      try { await api.rsvp(slug, { name: name.value, status, count: +count.value, note: note.value }); msg.textContent = UI.thanks; msg.style.color = '#1f8a5b'; try { localStorage.setItem('rsvp:' + slug, '1'); } catch (er) { /* */ } }
      catch (err) { msg.textContent = err.message; msg.style.color = '#c0262d'; }
      btn.disabled = false;
    } }, UI.send);
    inner.append(card(UI.rsvp, h('div', { style: { display: 'grid', gap: '10px', textAlign: 'left' } }, name, h('div', { style: { textAlign: 'center' } }, seg), count, note, send, msg)));
  }
  inner.append(card(UI.share, h('div', { class: 'row', style: { justifyContent: 'center' } },
    h('a', { class: 'btn small', target: '_blank', rel: 'noopener', href: shareLinks.telegram(S.link, title) }, 'Telegram'),
    h('a', { class: 'btn small', target: '_blank', rel: 'noopener', href: shareLinks.whatsapp(S.link, title) }, 'WhatsApp'),
    h('button', { class: 'btn small', onclick: () => { (navigator.clipboard ? navigator.clipboard.writeText(S.link) : Promise.reject()).then(() => toast(UI.copied), () => {}); } }, UI.copy))));
  inner.append(h('div', { class: 'made' }, h('a', { href: '/' }, (data.site && data.site.name) ? `${UI.made} — ${data.site.name}` : UI.made)));
}
main().catch((e) => { console.error(e); $('#nf').hidden = false; });
