// Panel: Ulashish (jonli havola, QR, tarmoqlarga yuborish, shaxsiy havolalar, RSVP).
import { core } from './core.js';
import { api } from './api.js';
import { h, toast, debounce, dataUrlToBlob } from './ui.js';
import { makeQR, drawQR } from './qr.js';
import { guestsCard } from './panels-guests.js';
import { renderToCanvas, canvasToBlob, slugify, shareLinks, parseGuests, guestLink, saveBlob, canShareFiles, shareFiles, prepare, fileBase } from './exporters.js';

const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast('Nusxalandi', 'ok'); } catch (e) { toast('Nusxalab bo\'lmadi — qo\'lda belgilang', 'err'); } };

export function sharePanel(exp) {
  const el = h('div');
  const slugIn = h('input', { class: 'input', placeholder: 'anvar-va-dilnoza', maxLength: 40, autocapitalize: 'none', autocomplete: 'off', 'aria-label': 'Havola nomi',
    oninput: (e) => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); checkSlug(); } });
  const slugMsg = h('div', { class: 'hint' });
  const pubBtn = h('button', { class: 'btn primary block', onclick: (e) => run(e.currentTarget, () => publish()) }, '');
  const out = h('div');
  const noServer = h('div', { class: 'lock-note' }, 'Jonli havola serverni talab qiladi. Hozir server bilan aloqa yo\'q — rasm, video va PDF yuklash ishlayveradi.');
  let slugOk = false;
  const checkSlug = debounce(async () => {
    const s = slugIn.value; if (core.pub) return;
    if (s.length < 3) { slugMsg.textContent = '3 ta belgidan kam bo\'lmasin'; slugMsg.style.color = ''; slugOk = false; return; }
    try { const r = await api.slugCheck(s); slugOk = r.ok; slugMsg.textContent = r.ok ? '✓ Bo\'sh: ' + location.host + '/i/' + s : r.reason; slugMsg.style.color = r.ok ? 'var(--ok)' : 'var(--err)'; } catch (e) { slugMsg.textContent = ''; }
  }, 350);
  const run = async (btn, fn) => { const t = btn.textContent; btn.disabled = true; btn.textContent = 'Kuting…'; try { await fn(); } catch (e) { toast(e.message || 'Xato', 'err'); console.error(e); } finally { btn.disabled = false; btn.textContent = t; refresh(); } };

  async function uploadAll() {
    const S = core.S;
    const items = await Promise.all(S.items.map(async (it) => {
      if (it.kind === 'photo' && it.src && it.src.startsWith('data:')) { const r = await api.upload(dataUrlToBlob(it.src), 'image'); return { ...it, src: r.url }; }
      return it;
    }));
    const music = { ...S.music };
    if (core.media.file) { const r = await api.upload(core.media.file, 'audio'); music.file = r.url; }
    if (core.media.voice) { const r = await api.upload(core.media.voice, 'audio'); music.voice = r.url; }
    return { items, music };
  }
  async function ogImage() {
    try {
      await prepare(core.S);
      const c = renderToCanvas({ ...core.S, items: core.S.items }, 'wide', { scale: 0.625 });
      const b = await canvasToBlob(c, 'image/jpeg', 0.85);
      return (await api.upload(b, 'image')).url;
    } catch (e) { return undefined; }
  }
  async function publish() {
    if (!core.serverOk) throw new Error('Server bilan aloqa yo\'q');
    const { items, music } = await uploadAll();
    const state = { ...core.S, items, music };
    const og = await ogImage();
    if (!core.pub) {
      const slug = slugIn.value; if (!slugOk) throw new Error('Havola nomi band yoki noto\'g\'ri');
      const r = await api.publish({ slug, state, og });
      core.pub = { id: r.id, slug: r.slug, token: r.token };
    } else {
      await api.update(core.pub.id, core.pub.token, { state, og });
    }
    core.set({ items, music, link: core.linkFor() });
    core.saveNow();
    toast('Jonli havola tayyor ✓', 'ok');
  }

  function qrCanvas(size, quiet = 2) {
    const link = core.linkFor(); const c = document.createElement('canvas'); c.width = c.height = size;
    const qr = makeQR(link, 'M'); drawQR(c.getContext('2d'), qr, 0, 0, size, { dark: '#111111', light: '#ffffff', quiet });
    return c;
  }
  const text = () => `${core.title()} — sizni taklif qilamiz!`;

  async function shareStory(btn) {
    const r = await exp.shareImage();
    const f = new File([r.blob], r.name, { type: 'image/png' });
    if (canShareFiles([f])) { try { await shareFiles([f], text() + ' ' + core.linkFor()); } catch (e) { /* bekor */ } }
    else { saveBlob(r.blob, r.name); toast('Rasm yuklandi. Instagram ilovasini ochib, Story ga qo\'shing.'); }
  }

  function buildPublished() {
    const link = core.linkFor(); const frag = [];
    const qrc = qrCanvas(220, 2); qrc.style.width = '180px'; qrc.style.height = '180px';
    frag.push(h('div', { class: 'card' },
      h('h4', null, '🔗 Jonli taklifnoma'),
      h('div', { class: 'row' }, h('input', { class: 'input grow', readOnly: true, value: link, onfocus: (e) => e.target.select(), 'aria-label': 'Havola' }), h('button', { class: 'btn', onclick: () => copy(link) }, 'Nusxalash')),
      h('div', { class: 'row', style: { marginTop: '10px' } }, h('a', { class: 'btn small', href: link, target: '_blank', rel: 'noopener' }, 'Ochib ko\'rish ↗'), h('button', { class: 'btn small', onclick: (e) => run(e.currentTarget, publish) }, '⟳ O\'zgarishlarni yangilash')),
      h('p', { class: 'hint', style: { marginBottom: 0 } }, 'Matn yoki rasmni o\'zgartirsangiz, "yangilash" tugmasini bosing — havola o\'sha-o\'sha qoladi.')));
    frag.push(h('div', { class: 'card' },
      h('h4', null, '📲 Yuborish'),
      h('div', { class: 'row' },
        h('a', { class: 'btn small', href: shareLinks.telegram(link, text()), target: '_blank', rel: 'noopener' }, 'Telegram'),
        h('a', { class: 'btn small', href: shareLinks.whatsapp(link, text()), target: '_blank', rel: 'noopener' }, 'WhatsApp'),
        h('button', { class: 'btn small', onclick: (e) => run(e.currentTarget, () => shareStory()) }, 'Instagram (Story)'),
        h('a', { class: 'btn small', href: shareLinks.facebook(link), target: '_blank', rel: 'noopener' }, 'Facebook'),
        h('a', { class: 'btn small', href: shareLinks.sms(link, text()) }, 'SMS'),
        navigator.share ? h('button', { class: 'btn small', onclick: () => navigator.share({ title: core.title(), text: text(), url: link }).catch(() => {}) }, 'Boshqa…') : null),
      h('p', { class: 'hint', style: { marginBottom: 0 } }, 'Instagram faqat telefonlarda to\'g\'ridan-to\'g\'ri yuboriladi (rasm ulashish oynasi orqali). Kompyuterda rasm yuklanadi — uni Instagram\'ga qo\'lda joylang.')));
    frag.push(h('div', { class: 'card' },
      h('h4', null, 'QR kod'),
      h('div', { class: 'row', style: { alignItems: 'flex-start' } }, h('div', { class: 'qr-box' }, qrc),
        h('div', { class: 'grow' }, h('p', { class: 'hint', style: { marginTop: 0 } }, 'Qog\'oz taklifnomaga yoki ekranga qo\'ying — mehmon skaner qilib jonli sahifani ochadi. Rasmning ichiga ham QR qo\'shish mumkin (Elementlar → QR kod).'),
          h('button', { class: 'btn small', onclick: async () => saveBlob(await canvasToBlob(qrCanvas(1024, 4)), fileBase(core.S) + '-qr.png') }, 'QR ni yuklab olish (PNG)')))));
    frag.push(guestsCard(link, text));
    return frag;
  }

  function guestCard(link) {
    const ta = h('textarea', { class: 'input', rows: 4, placeholder: 'Mehmonlar (har qatorda bitta ism)', oninput: () => build() });
    const list = h('div', { class: 'list', style: { marginTop: '10px' } });
    function build() {
      const g = parseGuests(ta.value);
      list.replaceChildren(...g.slice(0, 40).map((n) => {
        const l = guestLink(link, n);
        return h('div', { class: 'li' }, h('span', { class: 'grow' }, n),
          h('a', { class: 'btn small', href: shareLinks.whatsapp(l, `Hurmatli ${n}! ${text()}`), target: '_blank', rel: 'noopener' }, 'WhatsApp'),
          h('a', { class: 'btn small', href: shareLinks.telegram(l, `Hurmatli ${n}! ${text()}`), target: '_blank', rel: 'noopener' }, 'Telegram'),
          h('button', { class: 'btn small', onclick: () => copy(l) }, '⧉'));
      }));
      if (g.length > 40) list.appendChild(h('div', { class: 'hint' }, `…va yana ${g.length - 40} ta (hammasi CSV da)`));
    }
    return h('div', { class: 'card' }, h('h4', null, '👥 Shaxsiy havolalar'),
      h('p', { class: 'hint', style: { marginTop: 0 } }, 'Har bir mehmonga alohida havola: sahifada "Hurmatli Aziz" deb ochiladi.'), ta,
      h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn small', onclick: () => {
        const g = parseGuests(ta.value); if (!g.length) return toast('Mehmonlar ro\'yxati bo\'sh');
        const csv = '﻿mehmon,havola\n' + g.map((n) => `"${n.replace(/"/g, '""')}","${guestLink(link, n)}"`).join('\n');
        saveBlob(new Blob([csv], { type: 'text/csv' }), fileBase(core.S) + '-havolalar.csv');
      } }, 'CSV yuklab olish')), list);
  }

  function rsvpCard() {
    const box = h('div', { class: 'list' }); const sum = h('div', { class: 'row' });
    async function load() {
      try {
        const r = await api.rsvpList(core.pub.id, core.pub.token);
        const tot = { yes: 0, no: 0, maybe: 0 }; r.rsvps.forEach((x) => { tot[x.status] += x.count || 1; });
        sum.replaceChildren(h('span', { class: 'badge ok' }, `Keladi: ${tot.yes}`), h('span', { class: 'badge warn' }, `Balki: ${tot.maybe}`), h('span', { class: 'badge' }, `Kelmaydi: ${tot.no}`), h('span', { class: 'badge' }, `Ko'rishlar: ${r.views}`));
        box.replaceChildren(...(r.rsvps.length ? r.rsvps.slice().reverse().map((x) => h('div', { class: 'li' }, h('span', { class: 'grow' }, `${x.name}${x.count > 1 ? ' (' + x.count + ')' : ''}${x.note ? ' — ' + x.note : ''}`), h('span', { class: 'badge ' + (x.status === 'yes' ? 'ok' : x.status === 'maybe' ? 'warn' : '') }, { yes: 'Keladi', no: 'Kelmaydi', maybe: 'Balki' }[x.status]))) : [h('div', { class: 'hint' }, 'Hali javoblar yo\'q.')]));
      } catch (e) { box.replaceChildren(h('div', { class: 'hint' }, 'Javoblarni yuklab bo\'lmadi')); }
    }
    load();
    return h('div', { class: 'card' }, h('h4', null, '✅ Mehmonlar javobi (RSVP)'), sum, h('div', { style: { height: '8px' } }), box, h('div', { style: { marginTop: '8px' } }, h('button', { class: 'btn small', onclick: load }, '⟳ Yangilash')));
  }

  el.append(out);
  let built = '';
  function refresh() {
    out.replaceChildren();
    const S = core.S;
    if (!core.serverOk) { out.append(noServer); return; }
    if (!core.pub) {
      built = '';
      if (!slugIn.value) { const base = slugify([S.n1, S.n2].filter(Boolean).join(' va ')) || 'taklifnoma'; slugIn.value = base.slice(0, 32); checkSlug(); }
      pubBtn.textContent = '🌐 Jonli havola yaratish';
      out.append(h('div', { class: 'card' }, h('h4', null, '🔗 Jonli taklifnoma havolasi'),
        h('p', { class: 'hint', style: { marginTop: 0 } }, 'Animatsiyali sahifa: konvert ochilishi, musiqa, belgilangan sanagacha sanoq, xarita, kalendar va mehmonlar javobi (RSVP). Bepul.'),
        h('div', { class: 'field' }, h('label', null, 'Havola nomi'), slugIn, slugMsg), pubBtn));
    } else {
      pubBtn.textContent = '';
      const key = core.pub.slug; // qayta qurilishni kamaytirish uchun
      out.append(...buildPublished());
    }
  }
  return { el, refresh, onShow: refresh, manual: true };
}
