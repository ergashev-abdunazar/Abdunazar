// Mehmonlar boshqaruvi: ro'yxat, shaxsiy havolalar, RSVP holati, eslatmalar, CSV.
import { core } from './core.js';
import { api } from './api.js';
import { h, toast } from './ui.js';
import { parseGuests, guestLink, shareLinks, saveBlob, fileBase } from './exporters.js';

const STATUS = { yes: 'Keladi', maybe: 'Balki', no: 'Kelmaydi', wait: 'Kutilmoqda' };
const ls = { get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* */ } } };
const copy = async (t, msg = 'Nusxalandi') => { try { await navigator.clipboard.writeText(t); toast(msg, 'ok'); } catch (e) { toast('Nusxalab bo\'lmadi', 'err'); } };

export function guestsCard(link, text) {
  const key = 'tk:g:' + core.pub.id;
  const ta = h('textarea', { class: 'input', rows: 4, placeholder: 'Mehmonlar (har qatorda bitta ism)', 'aria-label': 'Mehmonlar ro\'yxati', oninput: () => { ls.set(key, ta.value); render(); } });
  ta.value = ls.get(key);
  const sum = h('div', { class: 'row' }); const list = h('div', { class: 'list' });
  let rsvps = [], views = 0, filter = 'all';
  const chipsEl = h('div', { class: 'chips', style: { margin: '8px 0' } });
  const remind = (n, l) => (core.S.lang === 'ru'
    ? `Здравствуйте, ${n}! Ждём вашего ответа на приглашение. Пожалуйста, подтвердите участие: ${l}`
    : `Hurmatli ${n}! Taklifnomamizga javobingizni kutamiz. Iltimos, ishtirokingizni tasdiqlang: ${l}`);

  function rows() {
    const guests = parseGuests(ta.value);
    const map = new Map(rsvps.map((r) => [r.name.toLowerCase(), r]));
    const out = [];
    guests.forEach((n) => { const r = map.get(n.toLowerCase()); out.push({ name: n, status: r ? r.status : 'wait', count: r ? r.count : 0, note: r ? r.note : '', listed: true }); map.delete(n.toLowerCase()); });
    [...map.values()].reverse().forEach((r) => out.push({ name: r.name, status: r.status, count: r.count, note: r.note, listed: false }));
    return out;
  }
  function render() {
    const all = rows();
    const tot = { yes: 0, maybe: 0, no: 0 }; all.forEach((x) => { if (tot[x.status] !== undefined) tot[x.status] += x.count || 1; });
    const waiting = all.filter((x) => x.status === 'wait').length;
    sum.replaceChildren(h('span', { class: 'badge ok' }, `Keladi: ${tot.yes}`), h('span', { class: 'badge warn' }, `Balki: ${tot.maybe}`), h('span', { class: 'badge' }, `Kelmaydi: ${tot.no}`),
      waiting ? h('span', { class: 'badge warn' }, `Javob kutilmoqda: ${waiting}`) : null, h('span', { class: 'badge' }, `Ko'rishlar: ${views}`));
    chipsEl.replaceChildren(...[['all', 'Hammasi'], ['yes', 'Keladi'], ['maybe', 'Balki'], ['no', 'Kelmaydi'], ['wait', 'Kutilmoqda']].map(([k, l]) => h('button', { class: 'chip' + (filter === k ? ' on' : ''), onclick: () => { filter = k; render(); } }, l)));
    const shown = all.filter((x) => filter === 'all' || x.status === filter);
    list.replaceChildren(...(shown.length ? shown.slice(0, 120).map((x) => {
      const l = guestLink(link, x.name);
      return h('div', { class: 'li' }, h('span', { class: 'grow' }, `${x.name}${x.count > 1 ? ' (' + x.count + ')' : ''}${x.note ? ' — ' + x.note : ''}`),
        h('span', { class: 'badge ' + (x.status === 'yes' ? 'ok' : x.status === 'wait' || x.status === 'maybe' ? 'warn' : '') }, STATUS[x.status]),
        x.listed ? h('a', { class: 'btn small', href: shareLinks.whatsapp(l, x.status === 'wait' ? remind(x.name, l) : `Hurmatli ${x.name}! ${text()}`), target: '_blank', rel: 'noopener', title: x.status === 'wait' ? 'Eslatma yuborish' : 'Yuborish' }, 'WhatsApp') : null,
        x.listed ? h('a', { class: 'btn small', href: shareLinks.telegram(l, x.status === 'wait' ? remind(x.name, l) : `Hurmatli ${x.name}! ${text()}`), target: '_blank', rel: 'noopener' }, 'Telegram') : null,
        x.listed ? h('button', { class: 'btn small', 'aria-label': 'Havolani nusxalash', onclick: () => copy(l) }, '⧉') : null);
    }) : [h('div', { class: 'hint' }, all.length ? 'Bu holatda mehmon yo\'q.' : 'Hali mehmonlar va javoblar yo\'q. Yuqoridagi maydonga ismlarni yozing.')]));
    if (shown.length > 120) list.appendChild(h('div', { class: 'hint' }, `…va yana ${shown.length - 120} ta (hammasi CSV da)`));
  }
  async function load(quiet) {
    try { const r = await api.rsvpList(core.pub.id, core.pub.token); rsvps = r.rsvps; views = r.views; render(); }
    catch (e) { if (!quiet) toast('Javoblarni yuklab bo\'lmadi', 'err'); }
  }
  function csv() {
    const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const lines = rows().map((x) => [x.name, STATUS[x.status], x.count || '', x.note, x.listed ? guestLink(link, x.name) : ''].map(q).join(','));
    saveBlob(new Blob(['﻿' + ['Mehmon,Holat,Kishi soni,Izoh,Shaxsiy havola', ...lines].join('\n')], { type: 'text/csv' }), fileBase(core.S) + '-mehmonlar.csv');
  }
  load(true);
  const timer = setInterval(() => { if (!card.isConnected) { clearInterval(timer); return; } if (!card.closest('[hidden]')) load(true); }, 30000);
  render();
  const card = h('div', { class: 'card' }, h('h4', null, '👥 Mehmonlar boshqaruvi'),
    h('p', { class: 'hint', style: { marginTop: 0 } }, 'Mehmon ismlarini yozing — har biriga shaxsiy havola chiqadi ("Hurmatli Aziz"). Javob bermaganlarga eslatma yuborasiz, javoblar avtomatik yangilanadi. Ro\'yxat faqat shu qurilmada saqlanadi.'),
    ta, sum, chipsEl, list,
    h('div', { class: 'row', style: { marginTop: '10px' } },
      h('button', { class: 'btn small', onclick: () => load(false) }, '⟳ Yangilash'),
      h('button', { class: 'btn small', onclick: csv }, 'CSV yuklab olish'),
      h('button', { class: 'btn small', onclick: () => { const y = rows().filter((x) => x.status === 'yes').map((x) => x.name + (x.count > 1 ? ' (' + x.count + ')' : '')); y.length ? copy(y.join('\n'), `${y.length} ta nom nusxalandi`) : toast('Hali keladiganlar yo\'q'); } }, 'Keladiganlar ro\'yxati'),
      h('button', { class: 'btn small', onclick: () => copy(remind('mehmon', link).replace('mehmon', '…'), 'Eslatma matni nusxalandi') }, 'Eslatma matni')));
  return card;
}
