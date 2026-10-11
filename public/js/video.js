// Video: canvas → MediaRecorder (real vaqt). MP4 bo'lsa to'g'ridan-to'g'ri, bo'lmasa WebM (serverda MP4 ga aylantiriladi).
import { createAnimator } from './anim.js';
import { FORMATS } from './render.js';
import { prepare } from './exporters.js';
import { renderMusic, fitToDuration, mix, toAudioBuffer, decodeFile } from './audio.js';

export const VIDEO_DURATIONS = [7, 15, 30, 60];
export const VIDEO_QUALITY = {
  sd: { label: 'Standart (540p)', scale: 0.5, bps: 2_200_000 },
  hd: { label: 'HD (720p)', scale: 0.667, bps: 4_000_000 },
  fhd: { label: 'Full HD (1080p)', scale: 1, bps: 8_000_000 }
};

export function pickVideoMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  const tries = [
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'], ['video/mp4;codecs=avc1,mp4a.40.2', 'mp4'], ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm'], ['video/webm', 'webm']
  ];
  for (const [m, ext] of tries) { try { if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext }; } catch (e) { /* */ } }
  return null;
}
export function videoSupported() { return !!(HTMLCanvasElement.prototype.captureStream && pickVideoMime()); }

/**
 * Audio tayyorlaydi: musiqa (tayyor yoki foydalanuvchi fayli) + ixtiyoriy ovoz.
 * m: { preset, file (Blob), voice (Blob), musicVol, voiceVol }
 */
export async function buildAudio(duration, m = {}) {
  if (m.preset === 'none' && !m.voice) return null;
  let music;
  if (m.file) {
    const d = await decodeFile(m.file);
    music = fitToDuration(d.ch, d.sampleRate, duration, { offset: m.offset || 0 });
  } else if (m.preset && m.preset !== 'none') {
    music = renderMusic(m.preset, duration, { seed: m.seed });
  } else {
    music = { L: new Float32Array(Math.floor(duration * 32000)), R: new Float32Array(Math.floor(duration * 32000)), sampleRate: 32000, duration };
  }
  let voice = null;
  if (m.voice) { const d = await decodeFile(m.voice); voice = { ch: d.ch, sampleRate: d.sampleRate }; }
  return mix(music, voice, duration, { musicVol: m.musicVol, voiceVol: m.voiceVol, voiceAt: m.voiceAt, duck: 0.6 });
}

/**
 * Videoni yozadi. o: { fmt, duration, quality, audio ({L,R,sampleRate}|null), watermark, site, onProgress, signal }
 * Qaytaradi { blob, ext, mime, width, height }.
 */
export async function recordVideo(S, o = {}) {
  const pm = pickVideoMime();
  if (!pm || !HTMLCanvasElement.prototype.captureStream) throw new Error('Bu brauzer video yozishni qo\'llamaydi. Chrome yoki Safari\'ning yangi versiyasidan foydalaning.');
  await prepare(S);
  const fmt = FORMATS[o.fmt || 'story'];
  const Q = VIDEO_QUALITY[o.quality || 'hd'];
  const duration = o.duration || 15;
  const W = Math.round(fmt.w * Q.scale / 2) * 2, H = Math.round(fmt.h * Q.scale / 2) * 2;
  const anim = createAnimator(S, fmt, { duration, watermark: o.watermark, site: o.site });
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const sx = W / fmt.w, sy = H / fmt.h;
  // animatsiya to'liq o'lchamda, so'ng kichraytiriladi (sifat uchun)
  const full = document.createElement('canvas'); full.width = fmt.w; full.height = fmt.h;
  const fctx = full.getContext('2d');
  const paint = (t) => { anim.draw(fctx, t); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(full, 0, 0, W, H); };
  await anim.ready();
  paint(0);

  const stream = canvas.captureStream(30);
  let actx = null, srcNode = null;
  if (o.audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    actx = new AC({ sampleRate: o.audio.sampleRate });
    const dest = actx.createMediaStreamDestination();
    srcNode = actx.createBufferSource();
    srcNode.buffer = toAudioBuffer(actx, o.audio);
    srcNode.connect(dest);
    dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    if (actx.state === 'suspended') await actx.resume();
  }
  const rec = new MediaRecorder(stream, { mimeType: pm.mime, videoBitsPerSecond: Q.bps, audioBitsPerSecond: 128000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise((res, rej) => { rec.onstop = res; rec.onerror = (e) => rej(e.error || new Error('Yozish xatosi')); });

  let cancelled = false;
  const onAbort = () => { cancelled = true; };
  if (o.signal) o.signal.addEventListener('abort', onAbort);

  rec.start(500);
  anim.start();
  const t0 = performance.now();
  const audioT0 = actx ? actx.currentTime : 0;
  if (srcNode) srcNode.start();
  await new Promise((resolve) => {
    const tick = () => {
      if (cancelled) return resolve();
      const t = actx ? Math.max(0, actx.currentTime - audioT0) : (performance.now() - t0) / 1000;
      if (t >= duration) { paint(duration - 0.001); return resolve(); }
      paint(t);
      if (o.onProgress) o.onProgress(t / duration);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  anim.stop();
  rec.stop();
  await done;
  stream.getTracks().forEach((tr) => tr.stop());
  try { if (srcNode) srcNode.stop(); if (actx) actx.close(); } catch (e) { /* */ }
  if (o.signal) o.signal.removeEventListener('abort', onAbort);
  if (cancelled) throw Object.assign(new Error('Bekor qilindi'), { cancelled: true });
  const blob = new Blob(chunks, { type: pm.mime.split(';')[0] });
  return { blob, ext: pm.ext, mime: pm.mime.split(';')[0], width: W, height: H };
}
