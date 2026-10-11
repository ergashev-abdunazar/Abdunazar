// Eksport: PNG/JPG/shaffof PNG, PDF, ZIP (ko'p mehmon), saqlash va ulashish yordamchilari.
import { FORMATS, renderStatic, buildLayout } from './render.js';
import { loadImages } from './items.js';
import { ensureFonts } from './fonts.js';
import { makeZip } from './zip.js';
import { makePrintPdf, PDF_LAYOUTS } from './pdf.js';

export { PDF_LAYOUTS };

export const IMAGE_KINDS = {
  png: { label: 'PNG', mime: 'image/png', ext: 'png' },
  jpg: { label: 'JPG', mime: 'image/jpeg', ext: 'jpg' },
  pngt: { label: 'Shaffof PNG (fonsiz)', mime: 'image/png', ext: 'png', transparent: true }
};

export function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

/** Taklifnomani canvasga chizadi. o: { scale, transparent, watermark, site } */
export function renderToCanvas(S, fmtId, o = {}) {
  const fmt = FORMATS[fmtId] || FORMATS.story;
  const scale = o.scale || 1;
  const c = makeCanvas(Math.round(fmt.w * scale), Math.round(fmt.h * scale));
  const ctx = c.getContext('2d');
  if (o.kind === 'jpg' || (!o.transparent && o.fill)) { /* JPG uchun fon renderStatic ichida chiziladi */ }
  ctx.scale(c.width / fmt.w, c.height / fmt.h);
  renderStatic(ctx, S, fmt, { transparent: !!o.transparent, watermark: !!o.watermark, site: o.site });
  return c;
}

export function canvasToBlob(c, type = 'image/png', q = 0.93) {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Rasmni yaratib bo\'lmadi'))), type, q));
}

export async function prepare(S) {
  await ensureFonts(S);
  await loadImages(S.items);
}

/**
 * Bitta rasmni yaratadi.
 * o: { fmt, kind: png|jpg|pngt, scale, watermark, site }
 */
export async function exportImage(S, o = {}) {
  await prepare(S);
  const K = IMAGE_KINDS[o.kind || 'png'];
  const c = renderToCanvas(S, o.fmt || S.fmt || 'story', { scale: o.scale || 1, transparent: !!K.transparent, watermark: o.watermark, site: o.site });
  const blob = await canvasToBlob(c, K.mime, 0.93);
  return { blob, width: c.width, height: c.height, name: `${fileBase(S)}-${o.fmt || S.fmt}.${K.ext}` };
}

export function fileBase(S) {
  const names = [S.n1, S.n2].filter(Boolean).join(' ') || 'taklifnoma';
  return slugify(names) || 'taklifnoma';
}

export function slugify(s) {
  const map = { 'ʻ': '', 'ʼ': '', '’': '', '‘': '', "'": '', 'ў': 'o', 'ғ': 'g', 'қ': 'q', 'ҳ': 'h', 'ш': 'sh', 'ч': 'ch', 'ё': 'yo', 'ю': 'yu', 'я': 'ya', 'ж': 'j', 'х': 'x', 'ц': 's', 'щ': 'sh', 'ъ': '', 'ь': '', 'ы': 'i', 'э': 'e' };
  const lat = 'абвгдезийклмнопрстуфАБВГДЕЗИЙКЛМНОПРСТУФ', to = 'abvgdezijklmnoprstufabvgdezijklmnoprstuf';
  let out = '';
  for (const ch of String(s || '').normalize('NFKC')) {
    const l = ch.toLowerCase();
    if (map[l] !== undefined) out += map[l];
    else if (lat.includes(ch)) out += to[lat.indexOf(ch)];
    else out += ch;
  }
  return out.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

/** Mehmonning shaxsiy havolasi. */
export function guestLink(link, guest) {
  if (!link) return link;
  return link + (link.includes('?') ? '&' : '?') + 'g=' + encodeURIComponent(guest);
}

/** Mehmonlar ro'yxatini tozalaydi (har qatorda bitta ism). */
export function parseGuests(text) {
  const seen = new Set(); const out = [];
  String(text || '').split(/\r?\n/).forEach((l) => {
    const g = l.replace(/^\s*\d+[.)]\s*/, '').trim().slice(0, 60);
    if (g && !seen.has(g.toLowerCase())) { seen.add(g.toLowerCase()); out.push(g); }
  });
  return out.slice(0, 300);
}

/** Har bir mehmon uchun alohida rasm → ZIP. o: { fmt, kind, scale, watermark, site, onProgress } */
export async function exportBulkZip(S, guests, o = {}) {
  await prepare(S);
  const files = []; const K = IMAGE_KINDS[o.kind || 'png'];
  const used = new Set();
  for (let i = 0; i < guests.length; i++) {
    const g = guests[i];
    const Sg = { ...S, guest: g, link: S.link ? guestLink(S.link, g) : S.link };
    const c = renderToCanvas(Sg, o.fmt || S.fmt, { scale: o.scale || 1, transparent: !!K.transparent, watermark: o.watermark, site: o.site });
    const blob = await canvasToBlob(c, K.mime, 0.92);
    let base = String(i + 1).padStart(2, '0') + '-' + (slugify(g) || 'mehmon');
    while (used.has(base)) base += '_';
    used.add(base);
    files.push({ name: `${base}.${K.ext}`, data: new Uint8Array(await blob.arrayBuffer()) });
    if (o.onProgress) o.onProgress((i + 1) / guests.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  if (S.link) {
    const csv = '﻿mehmon,havola\n' + guests.map((g) => `"${g.replace(/"/g, '""')}","${guestLink(S.link, g)}"`).join('\n');
    files.push({ name: 'havolalar.csv', data: new TextEncoder().encode(csv) });
  }
  return new Blob([makeZip(files)], { type: 'application/zip' });
}

/** PDF: layout 'a5' | 'a6' | 'a4x4'. guests berilsa — har biri uchun sahifa. */
export async function exportPdf(S, o = {}) {
  await prepare(S);
  const layout = o.layout || 'a5';
  const list = o.guests && o.guests.length ? o.guests : [null];
  const images = [];
  for (let i = 0; i < list.length; i++) {
    const g = list[i];
    const Sg = g ? { ...S, guest: g, link: S.link ? guestLink(S.link, g) : S.link } : S;
    const scale = layout === 'a4x4' ? 1.5 : 1.8;
    const c = renderToCanvas(Sg, 'print', { scale, watermark: o.watermark, site: o.site });
    const blob = await canvasToBlob(c, 'image/jpeg', 0.95);
    images.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: c.width, height: c.height });
    if (o.onProgress) o.onProgress((i + 1) / list.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  const bytes = makePrintPdf(images, layout, { title: [S.n1, S.n2].filter(Boolean).join(' & ') });
  return new Blob([bytes], { type: 'application/pdf' });
}

/* ---------------- saqlash va ulashish ---------------- */
export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function canShareFiles(files) {
  try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files })); } catch (e) { return false; }
}
export async function shareFiles(files, text, title) {
  await navigator.share({ files, text, title });
}
export const shareLinks = {
  telegram: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || '')}`,
  whatsapp: (url, text) => `https://wa.me/?text=${encodeURIComponent((text ? text + ' ' : '') + url)}`,
  facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  sms: (url, text) => `sms:?&body=${encodeURIComponent((text ? text + ' ' : '') + url)}`,
  mail: (url, text) => `mailto:?subject=${encodeURIComponent('Taklifnoma')}&body=${encodeURIComponent((text ? text + '\n' : '') + url)}`
};

export { buildLayout, FORMATS };
