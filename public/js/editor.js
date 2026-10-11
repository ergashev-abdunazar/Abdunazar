// Muharrir: ishga tushirish va umumiy interfeys.
import { core } from './core.js';
import { initStage } from './stage.js';
import { FORMATS } from './render.js';
import { h, $, modal, toast } from './ui.js';
import { templatePanel, textPanel, designPanel } from './panels-design.js';
import { itemsPanel } from './panels-items.js';
import { exportPanel } from './panels-export.js';
import { sharePanel } from './panels-share.js';
import { ensureFonts } from './fonts.js';
import { TEMPLATES } from './templates.js';

const FMT_LABEL = { story: 'Story', portrait: '4:5', square: '1:1', wide: '16:9', print: 'Chop' };

async function main() {
  await core.init();
  initStage($('#stage'), $('#stageBox'));
  ensureFonts(core.S, true).then(() => core.emit('fonts'));

  const exp = exportPanel();
  const panels = [
    ['tpl', 'Shablon', templatePanel()], ['txt', 'Matn', textPanel()], ['dsg', 'Dizayn', designPanel()],
    ['itm', 'Elementlar', itemsPanel()], ['dl', 'Yuklash', exp], ['shr', 'Ulashish', sharePanel(exp)]
  ];
  let active = localStorage.getItem('tk:tab') || 'tpl';
  if (!panels.some(([id]) => id === active)) active = 'tpl';
  const tabs = $('#tabs'), body = $('#tabBody');
  const tabEls = {};
  panels.forEach(([id, label, p]) => {
    const b = h('button', { class: 'tab', role: 'tab', onclick: () => show(id) }, label);
    tabEls[id] = b; tabs.appendChild(b); p.el.hidden = true; body.appendChild(p.el);
  });
  function show(id) {
    active = id; try { localStorage.setItem('tk:tab', id); } catch (e) { /* */ }
    panels.forEach(([pid, , p]) => { p.el.hidden = pid !== id; tabEls[pid].classList.toggle('on', pid === id); tabEls[pid].setAttribute('aria-selected', pid === id); });
    const p = panels.find(([pid]) => pid === id)[2];
    p.refresh('show'); if (p.onShow) p.onShow(); body.scrollTop = 0;
    if (id === 'itm') { /* elementlar */ }
  }
  show(active);

  // format tugmalari
  const fb = $('#fmtbar');
  const fmtBtns = Object.keys(FORMATS).map((k) => { const b = h('button', { class: 'chip', onclick: () => core.set({ fmt: k }) }, `${FMT_LABEL[k]}`); b.dataset.k = k; fb.appendChild(b); return b; });

  const undo = $('#undo'), redo = $('#redo'), saved = $('#saved');
  undo.onclick = () => core.undo(); redo.onclick = () => core.redo();
  $('#goDl').onclick = () => show('dl');
  $('#works').onclick = openWorks;
  if (core.me && core.me.admin) { const a = h('a', { class: 'btn small', href: '/admin', title: 'Admin panel' }, '⚙ Admin'); $('#works').before(a); }

  core.on((src) => {
    if (src === 'save') {
      saved.textContent = core.saveState === 'saved' ? 'Saqlandi' : core.saveState === 'saving' ? 'Saqlanmoqda…' : 'Saqlab bo\'lmadi';
      saved.className = 'badge ' + (core.saveState === 'error' ? 'warn' : core.saveState === 'saved' ? 'ok' : ''); return;
    }
    undo.disabled = !core.canUndo(); redo.disabled = !core.canRedo();
    fmtBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === core.S.fmt));
    if (src === 'select') { if (core.sel >= 0 && active !== 'itm') show('itm'); else panels.find(([id]) => id === active)[2].refresh(src); return; }
    const p = panels.find(([id]) => id === active)[2];
    if (!p.manual || src === 'me') p.refresh(src);
    if (src === 'me') exp.refresh();
  });
  core.emit('history'); core.emit('save');
  fmtBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === core.S.fmt));
  panels.forEach(([, , p]) => { if (p.el.hidden) p.refresh('init'); });

  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? core.redo() : core.undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); core.redo(); }
  });
  window.addEventListener('pagehide', () => core.saveNow());
  window.addEventListener('beforeunload', () => core.saveNow());

  function openWorks() {
    const list = h('div', { class: 'list' });
    const m = modal('Ishlarim', h('div', null,
      h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', { class: 'btn primary', onclick: () => { core.fresh('nikoh'); m.close(); show('tpl'); toast('Yangi taklifnoma boshlandi'); } }, '＋ Yangi taklifnoma')),
      list));
    const works = core.works();
    if (!works.length) list.append(h('div', { class: 'hint' }, 'Hozircha saqlangan ish yo\'q.'));
    works.forEach((w) => list.appendChild(h('div', { class: 'li' },
      h('span', { class: 'grow' }, `${w.title}  ·  ${TEMPLATES[w.tpl] ? TEMPLATES[w.tpl].name : ''}${w.id === core.S.id ? ' (ochiq)' : ''}`),
      h('button', { class: 'btn small', onclick: () => { core.saveNow(); core.open(w.id); m.close(); show(active); } }, 'Ochish'),
      h('button', { class: 'btn small', 'aria-label': 'O\'chirish', style: { color: 'var(--err)' }, onclick: (e) => { if (w.id === core.S.id) { toast('Ochiq ishni o\'chirib bo\'lmaydi'); return; } core.deleteWork(w.id); e.currentTarget.closest('.li').remove(); } }, '🗑'))));
  }
}
main().catch((e) => { console.error(e); document.body.prepend(h('div', { class: 'lock-note', style: { margin: '10px' } }, 'Xato: ' + e.message)); });
