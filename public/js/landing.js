// Bosh sahifa: shablon eskizlari va narxlar.
import { newState, normalizeState } from './state.js';
import { renderStatic, FORMATS } from './render.js';
import { TEMPLATES, TEMPLATE_ORDER } from './templates.js';
import { ensureFonts } from './fonts.js';
import { h, $, fmtMoney } from './ui.js';
import { loadCustomTemplates } from './custom.js';
import { loadAllCustomAssets } from './templates.js';

const TYPE_FOR = { atlas: 'nikoh', suzani: 'qiz', oltin: 'yubiley', minimal: 'nikoh', quvnoq: 'tugilgan', tadbir: 'korp', navruz: 'navruz', hayit: 'hayit', yangiyil: 'yangiyil', mart8: 'mart8' };

function thumb(c, tpl) {
  const f = FORMATS.story; const sc = c.width / f.w;
  const S = normalizeState({ ...newState(TYPE_FOR[tpl] || 'nikoh', 'lat'), tpl });
  const x = c.getContext('2d'); x.setTransform(sc, 0, 0, sc, 0, 0);
  try { renderStatic(x, S, f, {}); } catch (e) { /* */ }
}
await loadCustomTemplates();
const gal = $('#gal');
const cs = TEMPLATE_ORDER.map((id) => {
  const c = h('canvas', { width: 220, height: 391 });
  gal.appendChild(h('a', { class: 'gal', href: `/editor?tpl=${id}&type=${TYPE_FOR[id]}` }, c, TEMPLATES[id].name));
  return [c, id];
});
const hero = [['h1', 'suzani'], ['h2', 'atlas'], ['h3', 'quvnoq']];
const draw = () => { cs.forEach(([c, id]) => thumb(c, id)); hero.forEach(([i, id]) => thumb($('#' + i), id)); };
draw();
ensureFonts({ tpl: 'atlas', lang: 'lat', fonts: {} }, true).then(draw);
loadAllCustomAssets().then(draw);

fetch('/api/config').then((r) => r.json()).then((cfg) => {
  document.querySelectorAll('[data-p]').forEach((el) => { el.textContent = fmtMoney(cfg.prices[el.dataset.p], cfg.prices.currency); });
}).catch(() => { document.querySelectorAll('[data-p]').forEach((el) => { el.textContent = '—'; }); });
