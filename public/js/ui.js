// Kichik DOM yordamchilari: element yaratish, toast, modal.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list' && k !== 'type' && k !== 'form') { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let toastEl, toastT;
export function toast(msg, kind = '') {
  if (!toastEl) { toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.className = 'toast show ' + kind;
  clearTimeout(toastT); toastT = setTimeout(() => { toastEl.className = 'toast ' + kind; }, 3200);
}

/** Modal oyna. content: Node. Qaytaradi { close, el }. */
export function modal(title, content, o = {}) {
  const back = h('div', { class: 'modal-back', onclick: (e) => { if (e.target === back) close(); } });
  const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h3', null, title), h('button', { class: 'icon-btn', 'aria-label': 'Yopish', onclick: () => close() }, '✕')),
    h('div', { class: 'modal-body' }, content));
  back.appendChild(box); document.body.appendChild(back);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  function close() { document.removeEventListener('keydown', onKey); back.remove(); if (o.onClose) o.onClose(); }
  return { close, el: box };
}

export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export const fmtMoney = (n, cur = "so'm") => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + cur;

/** Fayl tanlash oynasi. */
export function pickFile(accept) {
  return new Promise((res) => {
    const i = h('input', { type: 'file', accept, style: { display: 'none' } });
    i.addEventListener('change', () => { res(i.files[0] || null); i.remove(); });
    document.body.appendChild(i); i.click();
  });
}

/** Rasmni kichraytirib JPEG data URL qiladi (telefon rasmlari katta bo'ladi). */
export async function shrinkImage(file, max = 1400, q = 0.86) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Rasmni o\'qib bo\'lmadi')); i.src = url; });
    const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally { URL.revokeObjectURL(url); }
}
export function dataUrlToBlob(u) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(u);
  if (!m) throw new Error('Noto\'g\'ri rasm');
  const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
  const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: m[1] });
}
