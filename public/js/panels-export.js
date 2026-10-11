// Panel: Yuklash (rasm, video, PDF, ZIP).
import { core } from './core.js';
import { api } from './api.js';
import { h, modal, toast, pickFile, fmtMoney } from './ui.js';
import { requireUnlock } from './paywall.js';
import { FORMATS } from './render.js';
import { IMAGE_KINDS, exportImage, exportPdf, exportBulkZip, parseGuests, saveBlob, fileBase, PDF_LAYOUTS, canShareFiles, shareFiles } from './exporters.js';
import { MUSIC_PRESETS, renderMusic, playPreview, VoiceRecorder, toWav } from './audio.js';
import { VIDEO_DURATIONS, VIDEO_QUALITY, videoSupported, buildAudio, recordVideo } from './video.js';

const FMT_LABEL = { story: 'Story 9:16', portrait: 'Post 4:5', square: 'Post 1:1', wide: 'Gorizontal 16:9', print: 'Chop etish' };

function progressModal(title, o = {}) {
  const bar = h('i'); const txt = h('div', { class: 'hint' }, o.text || '');
  const ac = new AbortController();
  const m = modal(title, h('div', null, h('div', { class: 'progress' }, bar), txt,
    o.cancel ? h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn small', onclick: () => ac.abort() }, 'Bekor qilish')) : null,
    o.warn ? h('div', { class: 'lock-note', style: { marginTop: '12px' } }, o.warn) : null), { onClose: () => ac.abort() });
  return { set: (p) => { bar.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; }, text: (t) => { txt.textContent = t; }, close: m.close, signal: ac.signal, body: m.el.querySelector('.modal-body') };
}

export function exportPanel() {
  const el = h('div');
  const opt = { imgKind: 'png', hq: false, imgFmt: null, vidDur: 15, vidQ: 'hd', vidFmt: 'story', musicVol: 80, pdf: 'a5', guests: '', bulkKind: 'png' };
  const lockCls = (kind) => (core.has(kind) ? '' : ' lock');
  const chips = (items, get, set, lockFn) => {
    const box = h('div', { class: 'chips' });
    box.rebuild = () => box.replaceChildren(...items.map(([v, label, kind]) => h('button', { class: 'chip' + (get() === v ? ' on' : '') + (kind && !core.has(kind) ? ' lock' : ''), onclick: async () => {
      if (kind && !core.has(kind)) { const ok = await requireUnlock(kind); if (!ok) return; }
      set(v); box.rebuild(); refreshAll();
    } }, label)));
    box.rebuild(); return box;
  };
  const price = (k) => fmtMoney(core.cfg.prices[k], core.cfg.prices.currency);
  const busy = async (btn, fn) => { btn.disabled = true; try { await fn(); } catch (e) { if (!e.cancelled) toast(e.message || 'Xato yuz berdi', 'err'); console.error(e); } finally { btn.disabled = false; refreshAll(); } };

  /* ---------- Rasm ---------- */
  const imgFmtChips = chips(Object.keys(FMT_LABEL).map((k) => [k, FMT_LABEL[k] + ` ${FORMATS[k].w}×${FORMATS[k].h}`]), () => opt.imgFmt || core.S.fmt, (v) => { opt.imgFmt = v; core.set({ fmt: v }); });
  const imgKindChips = chips(Object.entries(IMAGE_KINDS).map(([k, v]) => [k, v.label]), () => opt.imgKind, (v) => { opt.imgKind = v; });
  const hqChips = chips([[false, 'Standart (1×)'], [true, 'Yuqori sifat (2×)', 'img']], () => opt.hq, (v) => { opt.hq = v; });
  const dlBtn = h('button', { class: 'btn primary block', onclick: (e) => busy(e.currentTarget, () => dlImage({})) }, 'Rasmni yuklab olish');
  const cleanBtn = h('button', { class: 'btn gold block', style: { marginTop: '8px' }, onclick: (e) => busy(e.currentTarget, async () => { if (await requireUnlock('img')) await dlImage({}); }) }, '');
  async function dlImage(o) {
    const S = core.S; const wm = core.watermark('img');
    const hq = opt.hq && core.has('img');
    const r = await exportImage(S, { fmt: o.fmt || opt.imgFmt || S.fmt, kind: o.kind || opt.imgKind, scale: hq ? 2 : 1, watermark: wm, site: core.cfg.site });
    saveBlob(r.blob, r.name);
    toast(`Yuklandi: ${r.width}×${r.height}` + (wm ? ' (suv belgisi bilan)' : ''), 'ok');
  }
  const quick = h('div', { class: 'dl-grid' }, [
    ['Story 1080×1920', { fmt: 'story', kind: 'png' }], ['Post 1080×1080', { fmt: 'square', kind: 'jpg' }],
    ['Gorizontal 1920×1080', { fmt: 'wide', kind: 'png' }], ['Shaffof PNG', { fmt: core.S ? undefined : 'story', kind: 'pngt', cur: true }]
  ].map(([l, o]) => h('button', { class: 'btn small', onclick: (e) => busy(e.currentTarget, () => dlImage({ fmt: o.cur ? core.S.fmt : o.fmt, kind: o.kind })) }, l)));

  /* ---------- Video ---------- */
  const vidFmtChips = chips(['story', 'portrait', 'square', 'wide'].map((k) => [k, FMT_LABEL[k]]), () => opt.vidFmt, (v) => { opt.vidFmt = v; });
  const durChips = chips(VIDEO_DURATIONS.map((d) => [d, d + ' soniya', d > 15 ? 'video' : null]), () => opt.vidDur, (v) => { opt.vidDur = v; });
  const qChips = chips(Object.entries(VIDEO_QUALITY).map(([k, q]) => [k, q.label, k === 'fhd' ? 'video' : null]), () => opt.vidQ, (v) => { opt.vidQ = v; });
  const musicChips = h('div', { class: 'chips' });
  let stopPrev = null;
  const prevBtn = h('button', { class: 'btn small', onclick: () => { if (stopPrev) { stopPrev(); stopPrev = null; prevBtn.textContent = '▶ Eshitib ko\'rish'; return; } 
    const p = core.S.music.preset; if (core.media.file || p === 'none') { toast('Eshitib ko\'rish faqat tayyor musiqalar uchun'); return; }
    prevBtn.textContent = 'Tayyorlanmoqda…'; setTimeout(() => { const a = renderMusic(p, 12, {}); stopPrev = playPreview(a, { onend: () => { stopPrev = null; prevBtn.textContent = '▶ Eshitib ko\'rish'; } }); prevBtn.textContent = '■ To\'xtatish'; }, 30); } }, '▶ Eshitib ko\'rish');
  const fileName = h('span', { class: 'hint' });
  const fileBtn = h('button', { class: 'btn small', onclick: async () => {
    if (core.media.file) { core.media.file = null; core.media.fileName = ''; const { file, ...mu } = core.S.music; core.set({ music: mu }); refreshAll(); return; }
    const f = await pickFile('audio/*'); if (!f) return;
    if (f.size > 12e6) { toast('Fayl 12 MB dan kichik bo\'lsin', 'err'); return; }
    core.media.file = f; core.media.fileName = f.name; const { file: _f, ...mu2 } = core.S.music; core.set({ music: { ...mu2, preset: 'file' } }); refreshAll();
  } }, '');
  const voiceBtn = h('button', { class: 'btn small', onclick: () => voiceToggle() }, '');
  const voiceAudio = h('audio', { controls: true, style: { width: '100%', marginTop: '8px' }, hidden: true });
  let rec = null, recTimer = 0;
  async function voiceToggle() {
    if (rec) { const r = rec; rec = null; clearInterval(recTimer); core.media.voice = await r.stop(); refreshAll(); return; }
    if (core.media.voice) { core.media.voice = null; const { voice, ...mv } = core.S.music; core.set({ music: mv }); refreshAll(); return; }
    if (!VoiceRecorder.supported()) { toast('Bu brauzerda mikrofon yozish yo\'q', 'err'); return; }
    try { rec = new VoiceRecorder(); await rec.start(); } catch (e) { rec = null; toast('Mikrofonga ruxsat berilmadi', 'err'); return; }
    recTimer = setInterval(() => { voiceBtn.innerHTML = ''; voiceBtn.append(h('span', { class: 'rec-dot' }), ' Yozilmoqda ' + rec.elapsed().toFixed(0) + ' s — to\'xtatish'); if (rec.elapsed() > 25) voiceToggle(); }, 300);
    voiceBtn.disabled = false;
  }
  const volRange = h('input', { type: 'range', min: 10, max: 100, value: 80, 'aria-label': 'Musiqa balandligi', oninput: (e) => { opt.musicVol = +e.target.value; } });
  const vidBtn = h('button', { class: 'btn primary block', onclick: (e) => busy(e.currentTarget, createVideo) }, '🎬 Video yaratish');
  const vidClean = h('button', { class: 'btn gold block', style: { marginTop: '8px' }, onclick: (e) => busy(e.currentTarget, async () => { if (await requireUnlock('video')) await createVideo(); }) }, '');

  async function createVideo() {
    const S = core.S; const hasV = core.has('video');
    if (!videoSupported()) throw new Error('Bu brauzer video yozishni qo\'llamaydi. Chrome yoki Safari\'ning yangi versiyasidan foydalaning.');
    const dur = !hasV && opt.vidDur > 15 ? 15 : opt.vidDur;
    const q = !hasV && opt.vidQ === 'fhd' ? 'hd' : opt.vidQ;
    const wm = !hasV;
    const pm = progressModal('Video tayyorlanmoqda', { text: 'Musiqa tayyorlanmoqda…', cancel: true, warn: 'Video real vaqtda yoziladi — tugaguncha bu oynani yopmang va boshqa ilovaga o\'tmang.' });
    try {
      let file = core.media.file;
      if (!file && S.music && S.music.file) { try { file = await (await fetch(S.music.file)).blob(); } catch (e) { file = null; } }
      const preset = file ? 'file' : (S.music && S.music.preset) || 'nozik';
      const audio = await buildAudio(dur, { preset, file, voice: core.media.voice, musicVol: opt.musicVol / 100 });
      pm.text('Video yozilmoqda…');
      const r = await recordVideo(S, { fmt: opt.vidFmt, duration: dur, quality: q, audio, watermark: wm, site: core.cfg.site, onProgress: (p) => { pm.set(p * (core.cfg.ffmpeg ? 0.85 : 1)); pm.text(`Video yozilmoqda… ${Math.round(p * dur)} / ${dur} s`); }, signal: pm.signal });
      let blob = r.blob, ext = r.ext, note = '';
      if (core.cfg.ffmpeg && core.serverOk) {
        pm.text('MP4 (H.264) ga aylantirilmoqda…'); pm.set(0.9);
        try { blob = await api.convert(r.blob, r.ext); ext = 'mp4'; } catch (e) { note = 'Serverda MP4 ga aylantirib bo\'lmadi, asl fayl berildi.'; }
      } else if (ext === 'webm') note = 'Fayl WebM formatida. Telegram va kompyuterda ochiladi; iPhone uchun MP4 server (ffmpeg) kerak.';
      pm.close();
      showVideo(blob, `${fileBase(S)}-${opt.vidFmt}.${ext}`, wm, note);
    } catch (e) { pm.close(); throw e; }
  }
  function showVideo(blob, name, wm, note) {
    const url = URL.createObjectURL(blob);
    const file = new File([blob], name, { type: blob.type });
    const v = h('video', { src: url, controls: true, playsInline: true, style: { width: '100%', maxHeight: '55vh', background: '#000', borderRadius: '12px' } });
    const m = modal('Video tayyor', h('div', null, v,
      note ? h('div', { class: 'hint', style: { margin: '8px 0' } }, note) : null,
      wm ? h('div', { class: 'lock-note', style: { margin: '10px 0' } }, 'Bepul variant: suv belgisi bor, 15 soniyagacha. Suv belgisisiz, 60 soniya va Full HD uchun "Video" ni oching.') : null,
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'btn primary', onclick: () => saveBlob(blob, name) }, '⬇ Yuklab olish'),
        canShareFiles([file]) ? h('button', { class: 'btn', onclick: () => shareFiles([file], core.title(), core.title()).catch(() => {}) }, 'Ulashish (Telegram, Instagram…)') : null)),
    { onClose: () => URL.revokeObjectURL(url) });
  }

  /* ---------- PDF ---------- */
  const pdfChips = chips(Object.entries(PDF_LAYOUTS).map(([k, v]) => [k, v.label]), () => opt.pdf, (v) => { opt.pdf = v; });
  const pdfBtn = h('button', { class: 'btn primary block', onclick: (e) => busy(e.currentTarget, () => dlPdf()) }, 'PDF yuklab olish');
  const pdfClean = h('button', { class: 'btn gold block', style: { marginTop: '8px' }, onclick: (e) => busy(e.currentTarget, async () => { if (await requireUnlock('img')) await dlPdf(); }) }, '');
  async function dlPdf(guests) {
    const wm = core.watermark('img');
    const pm = progressModal('PDF tayyorlanmoqda', { text: 'Chop etish sifatida chizilmoqda…' });
    try {
      const b = await exportPdf(core.S, { layout: opt.pdf, watermark: wm, site: core.cfg.site, guests, onProgress: (p) => pm.set(p) });
      saveBlob(b, `${fileBase(core.S)}-${opt.pdf}.pdf`);
      toast('PDF yuklandi' + (wm ? ' (suv belgisi bilan)' : ''), 'ok');
    } finally { pm.close(); }
  }

  /* ---------- ZIP ---------- */
  const guestArea = h('textarea', { class: 'input', rows: 5, placeholder: 'Har qatorda bitta mehmon:\nAziz Karimov\nMadina opa\nSardor aka', oninput: (e) => { opt.guests = e.target.value; refreshAll(); } });
  const guestCount = h('div', { class: 'hint' });
  const bulkKindChips = chips([['png', 'PNG'], ['jpg', 'JPG']], () => opt.bulkKind, (v) => { opt.bulkKind = v; });
  const zipBtn = h('button', { class: 'btn primary block', onclick: (e) => busy(e.currentTarget, () => bulk('zip')) }, '');
  const bulkPdfBtn = h('button', { class: 'btn block', style: { marginTop: '8px' }, onclick: (e) => busy(e.currentTarget, () => bulk('pdf')) }, '');
  async function bulk(mode) {
    const g = parseGuests(opt.guests);
    if (!g.length) throw new Error('Avval mehmonlar ro\'yxatini kiriting');
    if (!(await requireUnlock('bulk'))) return;
    if (mode === 'pdf') { await dlPdf(g); return; }
    const pm = progressModal('ZIP tayyorlanmoqda', { text: `${g.length} ta taklifnoma…` });
    try {
      const b = await exportBulkZip(core.S, g, { fmt: core.S.fmt, kind: opt.bulkKind, scale: 1, watermark: false, site: core.cfg.site, onProgress: (p) => { pm.set(p); pm.text(`${Math.round(p * g.length)} / ${g.length}`); } });
      saveBlob(b, `${fileBase(core.S)}-mehmonlar.zip`);
      toast(`${g.length} ta taklifnoma ZIP ga joylandi`, 'ok');
    } finally { pm.close(); }
  }

  const card = (title, ...kids) => h('div', { class: 'card' }, h('h4', null, title), ...kids);
  const lab = (t) => h('div', { class: 'lbl', style: { margin: '10px 0 6px' } }, t);
  el.append(
    card('🖼 Rasm', lab('Format'), imgFmtChips, lab('Fayl turi'), imgKindChips, lab('Sifat'), hqChips,
      h('div', { style: { marginTop: '12px' } }, dlBtn, cleanBtn), lab('Tez yuklash'), quick),
    card('🎬 Video (MP4)', h('div', { class: 'hint', style: { marginBottom: '6px' } }, 'Animatsiyali video: matnlar ketma-ket paydo bo\'ladi, musiqa bilan.'),
      lab('Format'), vidFmtChips, lab('Davomiyligi'), durChips, lab('Sifat'), qChips,
      lab('Musiqa'), musicChips, h('div', { class: 'row', style: { marginTop: '8px' } }, prevBtn, fileBtn, fileName),
      lab('Ovozli tabrik (mikrofon)'), h('div', { class: 'row' }, voiceBtn), voiceAudio,
      lab('Musiqa balandligi'), volRange,
      h('div', { style: { marginTop: '12px' } }, vidBtn, vidClean)),
    card('🖨 Chop etish (PDF)', h('div', { class: 'hint', style: { marginBottom: '6px' } }, 'A5/A6 — 3 mm qirqish zaxirasi (bleed) va kesish belgilari bilan; A4 ga 4 tadan — kesish chiziqlari bilan.'), pdfChips, h('div', { style: { marginTop: '12px' } }, pdfBtn, pdfClean)),
    card('👥 Ko\'p mehmon (ZIP)', h('div', { class: 'hint', style: { marginBottom: '8px' } }, 'Har bir mehmon ismi bilan alohida taklifnoma. Havola yaratilgan bo\'lsa, QR va havola ham shaxsiy bo\'ladi.'), guestArea, guestCount, lab('Fayl turi'), bulkKindChips,
      h('div', { style: { marginTop: '12px' } }, zipBtn, bulkPdfBtn)));

  function refreshAll() {
    const S = core.S;
    imgFmtChips.rebuild(); imgKindChips.rebuild(); hqChips.rebuild(); vidFmtChips.rebuild(); durChips.rebuild(); qChips.rebuild(); pdfChips.rebuild(); bulkKindChips.rebuild();
    const hasI = core.has('img'), hasV = core.has('video'), hasB = core.has('bulk');
    dlBtn.textContent = hasI ? '⬇ Rasmni yuklab olish' : '⬇ Bepul yuklab olish (suv belgisi bilan)';
    cleanBtn.hidden = hasI; cleanBtn.textContent = `✨ Suv belgisisiz + 2× sifat — ${price('img')}`;
    pdfBtn.textContent = hasI ? '⬇ PDF yuklab olish' : '⬇ Bepul PDF (suv belgisi bilan)'; pdfClean.hidden = hasI; pdfClean.textContent = `✨ Suv belgisisiz PDF — ${price('img')}`;
    vidBtn.textContent = hasV ? '🎬 Video yaratish' : '🎬 Bepul video (suv belgisi, 15 s gacha)'; vidClean.hidden = hasV; vidClean.textContent = `✨ Suv belgisisiz, 60 s, Full HD — ${price('video')}`;
    vidBtn.disabled = !videoSupported();
    const hasFile = !!(S.music.file || core.media.file);
    musicChips.replaceChildren(
      ...[{ id: 'none', label: 'Musiqasiz' }, ...MUSIC_PRESETS].map((p) => h('button', { class: 'chip' + (!hasFile && (S.music.preset || 'nozik') === p.id ? ' on' : ''), title: p.desc || '', onclick: () => { core.media.file = null; core.media.fileName = ''; const { file, ...mu } = core.S.music; core.set({ music: { ...mu, preset: p.id } }); } }, p.label)),
      ...core.tracks.map((t) => h('button', { class: 'chip' + (!core.media.file && S.music.file === t.url ? ' on' : ''), title: 'Qo\'shiq', onclick: () => { core.media.file = null; core.media.fileName = ''; core.set({ music: { ...core.S.music, preset: 'file', file: t.url } }); } }, '🎵 ' + t.title)));
    fileBtn.textContent = core.media.file ? '✕ Fayl: ' + core.media.fileName.slice(0, 22) : '＋ O\'z musiqam';
    if (!rec) { voiceBtn.replaceChildren(document.createTextNode(core.media.voice ? '✕ Ovozni o\'chirish' : '🎙 Ovoz yozish')); }
    if (core.media.voice && voiceAudio.dataset.k !== String(core.media.voice.size)) { voiceAudio.src = URL.createObjectURL(core.media.voice); voiceAudio.dataset.k = String(core.media.voice.size); }
    voiceAudio.hidden = !core.media.voice; if (!core.media.voice) { voiceAudio.removeAttribute('src'); delete voiceAudio.dataset.k; }
    const g = parseGuests(opt.guests);
    guestCount.textContent = g.length ? `${g.length} ta mehmon` : '';
    zipBtn.textContent = (hasB ? '⬇ ZIP yuklab olish' : `🔒 ZIP — ${price('bulk')}`) + (g.length ? ` (${g.length})` : '');
    bulkPdfBtn.textContent = 'Hamma mehmon uchun bitta PDF' + (hasB ? '' : ' 🔒');
    if (!videoSupported()) vidBtn.title = 'Bu brauzerda video yozish yo\'q';
  }
  return { el, refresh: refreshAll, getMedia: () => opt, shareImage: async () => (await exportImage(core.S, { fmt: 'story', kind: 'png', scale: 1, watermark: core.watermark('img'), site: core.cfg.site })) };
}
