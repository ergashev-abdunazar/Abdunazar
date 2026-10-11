// Muharrir: ishga tushirish va umumiy interfeys.
import { core } from './core.js';
import { api } from './api.js';
import { initStage } from './stage.js';
import { FORMATS } from './render.js';
import { h, $, modal, toast } from './ui.js';
import { templatePanel, textPanel, designPanel } from './panels-design.js';
import { itemsPanel } from './panels-items.js';
import { exportPanel } from './panels-export.js';
import { sharePanel } from './panels-share.js';
import { extraPanel } from './panels-extra.js';
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
    ['itm', 'Elementlar', itemsPanel()], ['xtr', 'Sahifa', extraPanel()], ['dl', 'Yuklash', exp], ['shr', 'Ulashish', sharePanel(exp)]
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

  const acctBtn = $('#acct');
  const syncAcct = () => { acctBtn.textContent = core.me && core.me.email ? '👤 ' + core.me.email.split('@')[0].slice(0, 12) : 'Kirish'; };
  acctBtn.onclick = openAccount; syncAcct();

  core.on((src) => {
    if (src === 'me') syncAcct();
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

  function openAccount() {
    const me = core.me || {};
    if (me.email) {
      const m = modal('Hisobim', h('div', null,
        h('p', null, 'Kirgan hisob: ', h('b', null, me.email)),
        h('p', { class: 'hint' }, 'Kreditlar, ochilgan dizaynlar va jonli taklifnomalaringiz shu hisobga bog\'langan. Boshqa qurilmadan kirsangiz ham ko\'rinadi ("Ishlarim" bo\'limida).'),
        h('button', { class: 'btn', onclick: async () => { try { await api.logout(); } catch (e) { /* */ } await core.refreshMe(); m.close(); toast('Chiqildi'); } }, 'Chiqish')));
      return;
    }
    let mode = 'login';
    const email = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'email@misol.uz' });
    const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'parol (kamida 8 ta belgi)' });
    const msg = h('div', { class: 'hint', role: 'alert' });
    const go = h('button', { class: 'btn primary' }, 'Kirish');
    const sw = h('button', { class: 'btn small' }, '');
    const upd = () => { go.textContent = mode === 'login' ? 'Kirish' : 'Ro\'yxatdan o\'tish'; sw.textContent = mode === 'login' ? 'Hisobim yo\'q — ochish' : 'Hisobim bor — kirish'; pw.autocomplete = mode === 'login' ? 'current-password' : 'new-password'; msg.textContent = ''; };
    sw.onclick = () => { mode = mode === 'login' ? 'reg' : 'login'; upd(); };
    go.onclick = async () => {
      go.disabled = true; msg.textContent = '';
      try { await (mode === 'login' ? api.login : api.register)(email.value, pw.value); await core.refreshMe(); m.close(); toast(mode === 'login' ? 'Xush kelibsiz!' : 'Hisob ochildi ✓', 'ok'); }
      catch (e) { msg.textContent = e.message; msg.style.color = 'var(--err)'; } finally { go.disabled = false; }
    };
    const m = modal('Kirish / ro\'yxatdan o\'tish', h('div', null,
      h('p', { class: 'hint' }, 'Hisob ochsangiz, kreditlaringiz va jonli taklifnomalaringiz yo\'qolmaydi va boshqa telefon/kompyuterdan ham ochiladi. Email tasdiqlanmaydi; parol unutilsa, administrator tiklab beradi.'),
      h('div', { class: 'field' }, h('label', null, 'Email'), email), h('div', { class: 'field' }, h('label', null, 'Parol'), pw), msg,
      h('div', { class: 'row' }, go, sw)));
    upd();
  }

  async function loadCloud(box, m) {
    if (!(core.me && core.me.email)) return;
    try {
      const { invites } = await api.myInvites();
      if (!invites.length) return;
      box.append(h('h3', { style: { margin: '16px 0 8px' } }, '☁ Jonli taklifnomalarim'));
      invites.forEach((i) => box.appendChild(h('div', { class: 'li' },
        h('span', { class: 'grow' }, `${i.title}  ·  /i/${i.slug}  ·  👁 ${i.views}  ·  RSVP ${i.rsvps}`),
        h('button', { class: 'btn small', onclick: async () => {
          try { core.saveNow(); const inv = await api.myInvite(i.id); const id = core.importPublished(inv); core.open(id); m.close(); show(active); toast('Ochildi ✓', 'ok'); }
          catch (e) { toast(e.message, 'err'); }
        } }, 'Tahrirlash'))));
    } catch (e) { /* */ }
  }

  function openWorks() {
    const list = h('div', { class: 'list' }); const cloud = h('div');
    const m = modal('Ishlarim', h('div', null,
      h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', { class: 'btn primary', onclick: () => { core.fresh('nikoh'); m.close(); show('tpl'); toast('Yangi taklifnoma boshlandi'); } }, '＋ Yangi taklifnoma')),
      list, cloud));
    loadCloud(cloud, m);
    const works = core.works();
    if (!works.length) list.append(h('div', { class: 'hint' }, 'Hozircha saqlangan ish yo\'q.'));
    works.forEach((w) => list.appendChild(h('div', { class: 'li' },
      h('span', { class: 'grow' }, `${w.title}  ·  ${TEMPLATES[w.tpl] ? TEMPLATES[w.tpl].name : ''}${w.id === core.S.id ? ' (ochiq)' : ''}`),
      h('button', { class: 'btn small', onclick: () => { core.saveNow(); core.open(w.id); m.close(); show(active); } }, 'Ochish'),
      h('button', { class: 'btn small', 'aria-label': 'O\'chirish', style: { color: 'var(--err)' }, onclick: (e) => { if (w.id === core.S.id) { toast('Ochiq ishni o\'chirib bo\'lmaydi'); return; } core.deleteWork(w.id); e.currentTarget.closest('.li').remove(); } }, '🗑'))));
  }
}
main().catch((e) => { console.error(e); document.body.prepend(h('div', { class: 'lock-note', style: { margin: '10px' } }, 'Xato: ' + e.message)); });
