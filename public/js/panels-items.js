// Panel: Elementlar (stiker, rasm ramkasi, QR) va tanlangan element sozlamalari.
import { core } from './core.js';
import { h, toast, pickFile, shrinkImage } from './ui.js';
import { STICKERS, SHAPES, drawStickerThumb, loadImages } from './items.js';
import { resolvePalette } from './render.js';

export function itemsPanel() {
  const el = h('div');
  const grid = h('div', { class: 'stk-grid' });
  const thumbs = STICKERS.map((s) => {
    const c = h('canvas', { width: 96, height: 96 });
    const b = h('button', { class: 'stk', title: s.label, 'aria-label': 'Qo\'shish: ' + s.label, onclick: () => addSticker(s.id) }, c);
    grid.appendChild(b); return { s, c };
  });
  const jit = () => (Math.random() - 0.5) * 0.12;
  function addSticker(sid) {
    core.addItem({ kind: 'sticker', sid, fx: 0.5 + jit(), fy: 0.5 + jit(), size: sid === 'ramka' || sid === 'burchak' ? 0.8 : 0.22, rot: 0 });
  }
  async function addPhoto() {
    const f = await pickFile('image/*'); if (!f) return;
    try {
      const src = await shrinkImage(f);
      await loadImages([{ kind: 'photo', src }]);
      core.addItem({ kind: 'photo', src, shape: 'circle', fx: 0.5, fy: 0.3, size: 0.34, rot: 0, zoom: 1, px: 0, py: 0, border: true, shadow: true });
    } catch (e) { toast(e.message, 'err'); }
  }
  const addQr = () => {
    core.addItem({ kind: 'qr', fx: 0.82, fy: 0.9, size: 0.16, rot: 0 });
    if (!core.pub) toast('QR havola yaratilgandan so\'ng ishlaydi: "Ulashish" bo\'limida havolani yarating.');
  };

  const selBox = h('div', { class: 'card' });
  el.append(
    h('div', { class: 'card' },
      h('h4', null, 'Rasm (ramka bilan)'),
      h('div', { class: 'hint', style: { marginBottom: '10px' } }, 'Juftlik, farzand yoki oila surati. Doira, mehrob, oval va yurak ramkalari bor.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: addPhoto }, '＋ Rasm yuklash'), h('button', { class: 'btn', onclick: addQr }, '＋ QR kod'))),
    selBox,
    h('div', { class: 'lbl', style: { margin: '4px 0 8px' } }, 'Bezaklar (bosing — qo\'shiladi, so\'ng suring)'), grid,
    h('p', { class: 'hint', style: { marginTop: '12px' } }, 'Ko\'rinish oynasida elementni suring; burchakdagi ⤡ tugmasi bilan kattalashtiring va buring; ikki barmoq bilan ham mumkin.'));

  function slider(label, min, max, step, get, set, fmtv = (v) => v) {
    const out = h('span', { class: 'hint' }, fmtv(get()));
    const r = h('input', { type: 'range', min, max, step, value: get(), 'aria-label': label, oninput: (e) => { const v = +e.target.value; out.textContent = fmtv(v); set(v); } });
    return h('div', { class: 'field' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('label', null, label), out), r);
  }
  const hexOf = (v, d) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : d);

  function buildSelected() {
    const i = core.sel; const it = core.S.items[i];
    if (!it) { selBox.replaceChildren(h('div', { class: 'hint' }, 'Element tanlanmagan. Ko\'rinish oynasida elementni bosing.')); return; }
    const upd = (p, k) => core.updateItem(i, p, k + i);
    const P = resolvePalette(core.S);
    const name = it.kind === 'photo' ? 'Rasm' : it.kind === 'qr' ? 'QR kod' : 'Bezak';
    const kids = [h('h4', null, 'Tanlangan: ' + name),
      slider('Kattalik', 3, 120, 1, () => Math.round(it.size * 100), (v) => upd({ size: v / 100 }, 'sz'), (v) => v + '%'),
      slider('Burish', -180, 180, 1, () => Math.round(it.rot || 0), (v) => upd({ rot: v }, 'rt'), (v) => v + '°')];
    if (it.kind === 'photo') {
      kids.push(h('div', { class: 'field' }, h('label', null, 'Ramka shakli'), h('div', { class: 'chips' }, Object.entries(SHAPES).map(([k, v]) => h('button', { class: 'chip' + (it.shape === k ? ' on' : ''), onclick: () => upd({ shape: k }, 'sh') }, v.label)))));
      kids.push(slider('Yaqinlashtirish', 100, 300, 5, () => Math.round((it.zoom || 1) * 100), (v) => upd({ zoom: v / 100 }, 'zm'), (v) => v + '%'));
      kids.push(slider('Gorizontal siljish', -100, 100, 5, () => Math.round((it.px || 0) * 100), (v) => upd({ px: v / 100 }, 'px')));
      kids.push(slider('Vertikal siljish', -100, 100, 5, () => Math.round((it.py || 0) * 100), (v) => upd({ py: v / 100 }, 'py')));
      kids.push(h('div', { class: 'row' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: it.border !== false, onchange: (e) => upd({ border: e.target.checked }, 'bd') }), 'Hoshiya'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: it.shadow !== false, onchange: (e) => upd({ shadow: e.target.checked }, 'sd') }), 'Soya'),
        h('input', { type: 'color', value: hexOf(it.color, hexOf(P.accent, '#d4af37')), 'aria-label': 'Hoshiya rangi', oninput: (e) => upd({ color: e.target.value }, 'cl') })));
    } else if (it.kind === 'sticker') {
      kids.push(h('div', { class: 'row' }, h('div', null, h('input', { type: 'color', value: hexOf(it.color, hexOf(P.accent, '#d4af37')), 'aria-label': 'Asosiy rang', oninput: (e) => upd({ color: e.target.value }, 'c1') }), h('div', { class: 'hint' }, 'Rang 1')),
        h('div', null, h('input', { type: 'color', value: hexOf(it.color2, hexOf(P.ink, '#ffffff')), 'aria-label': 'Ikkinchi rang', oninput: (e) => upd({ color2: e.target.value }, 'c2') }), h('div', { class: 'hint' }, 'Rang 2'))));
    } else if (it.kind === 'qr') {
      kids.push(h('div', { class: 'hint' }, core.pub ? 'QR kod jonli havolangizga olib boradi.' : 'Havola yaratilgach QR avtomatik haqiqiy kodga aylanadi.'));
    }
    kids.push(h('div', { class: 'row', style: { marginTop: '8px' } },
      h('button', { class: 'btn small', onclick: () => upd({ flip: !core.S.items[i].flip }, 'fl') }, '⇋ Aylantirish'),
      h('button', { class: 'btn small', onclick: () => core.moveItem(i, 'front') }, '↑ Oldinga'),
      h('button', { class: 'btn small', onclick: () => core.moveItem(i, 'back') }, '↓ Orqaga'),
      h('button', { class: 'btn small', onclick: () => core.dupItem(i) }, '⧉ Nusxa'),
      h('button', { class: 'btn small', style: { color: 'var(--err)' }, onclick: () => core.removeItem(i) }, '🗑 O\'chirish')));
    selBox.replaceChildren(...kids);
  }
  let lastSel = -2, lastItem = null;
  function refresh(src) {
    const S = core.S; const P = resolvePalette(S);
    thumbs.forEach(({ s, c }) => drawStickerThumb(c, s.id, P.accent || '#c2255c', P.ink && /^#/.test(P.ink) ? P.ink : '#1d1b3a'));
    const it = S.items[core.sel];
    // sozlamalar paneli faqat tanlov yoki shakl o'zgarganda qayta quriladi (sliderni uzmaslik uchun)
    const structural = core.sel !== lastSel || (it && lastItem && (it.shape !== lastItem.shape || it.kind !== lastItem.kind)) || (!!it !== !!lastItem) || src === 'history';
    if (structural) buildSelected();
    lastSel = core.sel; lastItem = it || null;
  }
  return { el, refresh };
}
