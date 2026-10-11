// Muharrir yadrosi: holat, tarix (bekor qilish), saqlash, server bilan boshlang'ich aloqa.
import { newState, normalizeState, switchLang, switchType, uid } from './state.js';
import { TYPES } from './i18n.js';
import { TEMPLATES } from './templates.js';
import { api } from './api.js';
import { ensureFonts } from './fonts.js';
import { loadImages } from './items.js';
import { loadCustomTemplates } from './custom.js';

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } }
};

const DEFAULT_CFG = { site: { name: 'Taklifnoma Studiyasi', domain: location.host || 'taklifnoma.uz', tz: '+05:00' }, prices: { img: 15000, video: 25000, bulk: 40000, currency: "so'm" }, providers: ['click', 'payme', 'uzum'], demoPay: false, ffmpeg: false };

export const core = {
  S: null, pub: null, me: null, tracks: [], cfg: DEFAULT_CFG, serverOk: false,
  media: { file: null, fileName: '', voice: null },
  sel: -1,
  past: [], future: [], lastKey: '', lastT: 0,
  listeners: new Set(), saveTimer: null, saveState: 'saved',

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit(src = 'state') { this.listeners.forEach((f) => f(src)); },

  /* ---- holat ---- */
  set(patch, key = '') {
    const now = Date.now();
    if (!(key && key === this.lastKey && now - this.lastT < 900)) { this.past.push(this.S); if (this.past.length > 80) this.past.shift(); this.future.length = 0; }
    this.lastKey = key; this.lastT = now;
    this.S = { ...this.S, ...patch };
    this.changed(patch);
  },
  replace(S, key = '') { this.set(S, key); },
  changed(patch) {
    if (patch && ('tpl' in patch || 'lang' in patch || 'fonts' in patch || 'items' in patch)) {
      ensureFonts(this.S).then(() => this.emit('fonts')).catch(() => {});
      if ('items' in patch) loadImages(this.S.items).then(() => this.emit('fonts'));
    }
    this.scheduleSave(); this.emit('state');
  },
  undo() { if (!this.past.length) return; this.future.push(this.S); this.S = this.past.pop(); this.lastKey = ''; this.sel = -1; this.changed({ tpl: 1, items: 1 }); this.emit('history'); },
  redo() { if (!this.future.length) return; this.past.push(this.S); this.S = this.future.pop(); this.lastKey = ''; this.sel = -1; this.changed({ tpl: 1, items: 1 }); this.emit('history'); },
  canUndo() { return this.past.length > 0; }, canRedo() { return this.future.length > 0; },

  setLang(to) { this.set(switchLang(this.S, to)); },
  setType(type) { this.set(switchType(this.S, type)); },

  /* ---- elementlar ---- */
  addItem(it) { const items = [...this.S.items, it]; this.sel = items.length - 1; this.set({ items }); },
  updateItem(i, patch, key = '') { const items = this.S.items.map((x, k) => (k === i ? { ...x, ...patch } : x)); this.set({ items }, key); },
  removeItem(i) { const items = this.S.items.filter((_, k) => k !== i); this.sel = -1; this.set({ items }); },
  moveItem(i, to) {
    const items = [...this.S.items]; const [it] = items.splice(i, 1);
    const j = to === 'front' ? items.length : 0; items.splice(j, 0, it); this.sel = j; this.set({ items });
  },
  dupItem(i) { const it = this.S.items[i]; if (!it) return; this.addItem({ ...it, fx: Math.min(1, it.fx + 0.05), fy: Math.min(1, it.fy + 0.04) }); },

  /* ---- saqlash ---- */
  workKey: (id) => 'tk:w:' + id,
  scheduleSave() {
    this.saveState = 'saving'; this.emit('save');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 500);
  },
  saveNow() {
    const S = this.S;
    const ok = ls.set(this.workKey(S.id), JSON.stringify({ S, pub: this.pub, updated: Date.now() }));
    if (ok) {
      const list = this.works().filter((w) => w.id !== S.id);
      list.unshift({ id: S.id, title: this.title(), tpl: S.tpl, updated: Date.now() });
      ls.set('tk:works', JSON.stringify(list.slice(0, 30)));
      ls.set('tk:last', S.id);
    }
    this.saveState = ok ? 'saved' : 'error'; this.emit('save');
  },
  title() {
    const S = this.S; const t = TYPES[S.type];
    return ([S.n1, S.n2].filter(Boolean).join(' & ') || (t && t.label) || 'Taklifnoma').slice(0, 60);
  },
  works() { try { return JSON.parse(ls.get('tk:works') || '[]'); } catch (e) { return []; } },
  loadWork(id) {
    try { const d = JSON.parse(ls.get(this.workKey(id))); if (d && d.S) return d; } catch (e) { /* */ }
    return null;
  },
  deleteWork(id) { ls.del(this.workKey(id)); ls.set('tk:works', JSON.stringify(this.works().filter((w) => w.id !== id))); },
  open(id) {
    const d = this.loadWork(id); if (!d) return false;
    this.S = normalizeState(d.S); this.pub = d.pub || null; this.past = []; this.future = []; this.sel = -1;
    ls.set('tk:last', id); this.changed({ tpl: 1, items: 1 }); this.emit('history'); return true;
  },
  importPublished(inv) {
    const S = normalizeState({ ...inv.state, id: inv.state.id || uid() });
    const had = this.loadWork(S.id);
    if (!had) {
      this.S = S; this.pub = { id: inv.id, slug: inv.slug, token: '' };
      this.past = []; this.future = []; this.sel = -1; this.saveNow();
    }
    return S.id;
  },
  fresh(type = 'nikoh', tpl) {
    let S = newState(type, 'lat'); if (tpl && TEMPLATES[tpl]) S = { ...S, tpl };
    this.S = normalizeState(S); this.pub = null; this.past = []; this.future = []; this.sel = -1;
    this.media = { file: null, fileName: '', voice: null };
    this.changed({ tpl: 1, items: 1 }); this.emit('history');
  },

  /* ---- boshlash ---- */
  async init() {
    await loadCustomTemplates();
    const q = new URLSearchParams(location.search);
    const wid = q.get('w'), type = q.get('type'), tpl = q.get('tpl');
    if (wid && this.loadWork(wid)) { this.open(wid); }
    else if (type || tpl || q.get('new')) { this.fresh(TYPES[type] ? type : 'nikoh', tpl); }
    else {
      const last = ls.get('tk:last');
      if (last && this.loadWork(last)) this.open(last); else this.fresh('nikoh');
    }
    if (q.toString()) history.replaceState(null, '', location.pathname);
    // server
    try {
      const [cfg, me] = await Promise.all([api.config(), api.me()]);
      this.cfg = { ...DEFAULT_CFG, ...cfg }; this.me = me; this.serverOk = true;
      try { this.tracks = (await api.tracks()).tracks || []; } catch (e) { this.tracks = []; }
    } catch (e) { this.serverOk = false; this.me = { cid: '', credits: { img: 0, video: 0, bulk: 0 }, unlocked: {}, refCode: '' }; }
    this.emit('me');
  },
  async refreshMe() { try { this.me = await api.me(); this.emit('me'); } catch (e) { /* */ } },
  has(kind) { if (this.me && this.me.admin) return true; const u = this.me && this.me.unlocked[this.S.id]; return !!(u && u.includes(kind)); },
  watermark(kind) { return !this.has(kind); },
  linkFor() { return this.pub ? `${location.origin}/i/${this.pub.slug}` : null; },
  uid
};
