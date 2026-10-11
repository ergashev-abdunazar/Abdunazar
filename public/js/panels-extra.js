// Panel: Sahifa (jonli taklifnoma qo'shimchalari): dastur, kiyim kodi, aloqa, tilak, galereya.
import { core } from './core.js';
import { api } from './api.js';
import { h, toast, pickFile, shrinkImage, dataUrlToBlob } from './ui.js';
import { latToCyr } from './i18n.js';

const SAMPLE = {
  lat: [['17:30', 'Mehmonlarni kutib olish'], ['18:00', 'Tantanali qism'], ['19:00', 'Ziyofat'], ['21:00', 'Raqs va tort']],
  ru: [['17:30', 'Встреча гостей'], ['18:00', 'Торжественная часть'], ['19:00', 'Праздничный ужин'], ['21:00', 'Танцы и торт']]
};
const WISH = {
  lat: 'Eng yaxshi sovg\'a — sizning ishtirokingiz. Gul va sovg\'a o\'rniga yangi oilamizga duo qiling.',
  ru: 'Лучший подарок — ваше присутствие. Вместо цветов и подарков пожелайте счастья нашей новой семье.'
};
const pick = (m, lang) => (lang === 'ru' ? m.ru : m.lat);

export function extraPanel() {
  const el = h('div');
  const ex = () => core.S.extra || {};
  const save = (patch, key = 'xtr') => core.set({ extra: { ...ex(), ...patch } }, key);
  const lang = () => core.S.lang;
  const conv = (s) => (lang() === 'cyr' ? latToCyr(s) : s);

  /* ---- dastur ---- */
  const progBox = h('div'); const progCard = h('div', { class: 'card' });
  function rows() { return (ex().program || []).map((r) => ({ ...r })); }
  function renderProg() {
    const list = rows();
    progBox.replaceChildren(...list.map((r, i) => h('div', { class: 'row', style: { marginBottom: '8px', flexWrap: 'nowrap' } },
      h('input', { class: 'input', type: 'time', value: r.t, style: { width: '120px', flex: '0 0 auto' }, 'aria-label': 'Vaqt', onchange: (e) => { const l = rows(); l[i].t = e.target.value; save({ program: l }); } }),
      h('input', { class: 'input grow', value: r.x, maxLength: 80, placeholder: 'Nima bo\'ladi?', 'aria-label': 'Tadbir qismi', oninput: (e) => { const l = rows(); l[i].x = e.target.value; save({ program: l }); } }),
      h('button', { class: 'btn small', 'aria-label': 'O\'chirish', onclick: () => { const l = rows(); l.splice(i, 1); save({ program: l }, ''); renderProg(); } }, '✕'))));
  }
  progCard.append(h('h4', null, '🗓 Dastur (soat bo\'yicha)'),
    h('div', { class: 'hint', style: { marginBottom: '8px' } }, 'Mehmonlar kun tartibini ko\'radi: soat va nima bo\'lishi.'), progBox,
    h('div', { class: 'row' },
      h('button', { class: 'btn small', onclick: () => { const l = rows(); if (l.length >= 10) return toast('10 tadan oshmasin'); l.push({ t: '', x: '' }); save({ program: l }, ''); renderProg(); } }, '＋ Qator'),
      h('button', { class: 'btn small', onclick: () => { save({ program: pick(SAMPLE, lang()).map(([t, x]) => ({ t, x: conv(x) })) }, ''); renderProg(); } }, 'Namuna qo\'yish')));

  /* ---- kiyim kodi ---- */
  const dress = h('input', { class: 'input', maxLength: 80, placeholder: 'Masalan: Elegant, och ranglar', 'aria-label': 'Kiyim kodi', oninput: (e) => save({ dress: e.target.value }) });

  /* ---- aloqa ---- */
  const phone = h('input', { class: 'input', type: 'tel', maxLength: 20, placeholder: '+998 90 123 45 67', autocomplete: 'off', 'aria-label': 'Telefon', oninput: (e) => save({ phone: e.target.value }) });
  const cname = h('input', { class: 'input', maxLength: 40, placeholder: 'Kim bilan bog\'lanish (ixtiyoriy)', 'aria-label': 'Aloqa ismi', oninput: (e) => save({ cname: e.target.value }) });

  /* ---- tilak ---- */
  const wish = h('textarea', { class: 'input', rows: 3, maxLength: 240, placeholder: 'Sovg\'a, tilak yoki qo\'shimcha izoh', 'aria-label': 'Tilak', oninput: (e) => save({ wish: e.target.value }) });

  /* ---- galereya ---- */
  const galBox = h('div', { class: 'row', style: { gap: '8px', marginBottom: '8px' } }); const galMsg = h('div', { class: 'hint' });
  function renderGal() {
    const g = ex().gallery || [];
    galBox.replaceChildren(...g.map((u, i) => h('div', { style: { position: 'relative' } },
      h('img', { src: u, alt: '', style: { width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', display: 'block' } }),
      h('button', { class: 'btn small', 'aria-label': 'O\'chirish', style: { position: 'absolute', top: '-6px', right: '-6px', padding: '0 7px', minHeight: '24px' }, onclick: () => { const l = [...(ex().gallery || [])]; l.splice(i, 1); save({ gallery: l }, ''); renderGal(); } }, '✕'))));
  }
  async function addPhoto() {
    if ((ex().gallery || []).length >= 8) return toast('8 tagacha rasm');
    if (!core.serverOk) return toast('Galereya serverni talab qiladi', 'err');
    const f = await pickFile('image/*'); if (!f) return;
    galMsg.textContent = 'Yuklanmoqda…';
    try {
      const url = (await api.upload(dataUrlToBlob(await shrinkImage(f, 1400, 0.85)), 'image')).url;
      save({ gallery: [...(ex().gallery || []), url] }, ''); renderGal(); galMsg.textContent = '';
    } catch (e) { galMsg.textContent = ''; toast(e.message || 'Yuklab bo\'lmadi', 'err'); }
  }

  el.append(
    h('div', { class: 'lock-note', style: { marginBottom: '12px' } }, 'Bu bo\'limlar faqat jonli havolada ko\'rinadi. O\'zgartirgach, "Ulashish" bo\'limida "O\'zgarishlarni yangilash" ni bosing.'),
    progCard,
    h('div', { class: 'card' }, h('h4', null, '👔 Kiyim kodi'), dress),
    h('div', { class: 'card' }, h('h4', null, '☎ Aloqa'), h('div', { style: { display: 'grid', gap: '8px' } }, phone, cname),
      h('div', { class: 'hint', style: { marginTop: '6px' } }, 'Mehmonlar "Qo\'ng\'iroq qilish" va WhatsApp tugmasini ko\'radi.')),
    h('div', { class: 'card' }, h('h4', null, '🎁 Tilak va sovg\'a'), wish,
      h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn small', onclick: () => { wish.value = conv(pick(WISH, lang())); save({ wish: wish.value }); } }, 'Namuna matn'))),
    h('div', { class: 'card' }, h('h4', null, '🖼 Foto galereya'), galBox, galMsg,
      h('button', { class: 'btn small', onclick: addPhoto }, '＋ Rasm qo\'shish'), h('div', { class: 'hint', style: { marginTop: '6px' } }, '8 tagacha rasm. Jonli sahifada setka ko\'rinishida chiqadi.')));

  let built = false;
  function refresh(src) {
    if (built && src !== 'show' && src !== 'history' && src !== 'me') return;
    built = true;
    const e = ex();
    renderProg(); renderGal();
    dress.value = e.dress || ''; phone.value = e.phone || ''; cname.value = e.cname || ''; wish.value = e.wish || '';
  }
  return { el, refresh, onShow: () => refresh('show'), manual: true };
}
