// Admin yordamchilari: parol (scrypt), imzolangan sessiya cookie'si, maxsus shablonlarni tozalash.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const HEX = /^#[0-9a-fA-F]{6}$/;
const UPATH = /^\/u\/[a-z0-9._-]{8,80}$/;
const num = (v, a, b, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d);
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return { salt, hash };
}
export function checkPassword(pw, rec) {
  if (!rec || !rec.hash) return false;
  const a = crypto.scryptSync(String(pw), rec.salt, 64); const b = Buffer.from(rec.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Admin ma'lumotlari: ADMIN_PASSWORD berilgan bo'lsa shu; bo'lmasa birinchi ishga tushishda tasodifiy parol yaratiladi. */
export function loadAdmin(dir, envPassword) {
  const file = path.join(dir, 'admin.json'); const keyFile = path.join(dir, 'secret.key');
  let secret;
  try { secret = fs.readFileSync(keyFile, 'utf8').trim(); } catch (e) { /* yangi */ }
  if (!secret || secret.length < 32) { secret = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(keyFile, secret, { mode: 0o600 }); }
  let rec = null; try { rec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* yo'q */ }
  let firstPassword = null;
  if (envPassword) {
    if (!rec || !rec.fromEnv || !checkPassword(envPassword, rec)) { rec = { ...hashPassword(envPassword), fromEnv: true, created: Date.now() }; fs.writeFileSync(file, JSON.stringify(rec), { mode: 0o600 }); }
  } else if (!rec) {
    firstPassword = crypto.randomBytes(9).toString('base64url');
    rec = { ...hashPassword(firstPassword), created: Date.now() };
    fs.writeFileSync(file, JSON.stringify(rec), { mode: 0o600 });
    fs.writeFileSync(path.join(dir, 'admin-first-password.txt'), `Admin paroli (birinchi kirishdan so'ng /admin → "Parolni o'zgartirish" orqali almashtiring va bu faylni o'chiring):\n${firstPassword}\n`, { mode: 0o600 });
  }
  return {
    secret, firstPassword,
    get rec() { return rec; },
    setPassword(pw) { rec = { ...hashPassword(pw), created: Date.now() }; fs.writeFileSync(file, JSON.stringify(rec), { mode: 0o600 }); try { fs.rmSync(path.join(dir, 'admin-first-password.txt')); } catch (e) { /* */ } }
  };
}

export function signSession(secret, ttlMs = 12 * 3600e3) {
  const exp = Date.now() + ttlMs; const sig = crypto.createHmac('sha256', secret).update(String(exp)).digest('hex');
  return `${exp}.${sig}`;
}
export function verifySession(secret, tok) {
  const m = /^(\d{10,15})\.([a-f0-9]{64})$/.exec(tok || ''); if (!m) return false;
  if (+m[1] < Date.now()) return false;
  const want = crypto.createHmac('sha256', secret).update(m[1]).digest();
  return crypto.timingSafeEqual(want, Buffer.from(m[2], 'hex'));
}

export const NAME_FONT_KEYS = ['pinyon', 'vibes', 'corm', 'play', 'forum', 'cinzel', 'jost', 'fred', 'unb'];
export const BODY_FONT_KEYS = ['corm', 'play', 'jost', 'manr', 'fred'];
export const FX_KEYS = ['none', 'sparkle', 'dust', 'confetti', 'petal', 'twinkle', 'snow'];

const region = (r, d) => ({
  x: num(r && r.x, 0, 0.95, d.x), y: num(r && r.y, 0, 0.95, d.y),
  w: num(r && r.w, 0.1, 1, d.w), h: num(r && r.h, 0.1, 1, d.h)
});
export function sanitizeTemplate(t, id) {
  if (!t || typeof t !== 'object') throw new Error('Noto\'g\'ri shablon');
  const kind = t.kind === 'video' ? 'video' : 'image';
  const bg = {};
  for (const k of ['tall', 'square', 'wide', 'poster', 'video']) if (UPATH.test((t.bg && t.bg[k]) || '')) bg[k] = t.bg[k];
  if (!bg.tall && !bg.poster) throw new Error('Asosiy rasm (yoki video uchun poster) yuklanmagan');
  if (kind === 'video' && !bg.video) throw new Error('Video fayl yuklanmagan');
  const name = str(t.name, 40); if (!name) throw new Error('Shablon nomini kiriting');
  return {
    id, name, tag: str(t.tag, 20) || 'maxsus', kind, bg,
    ink: HEX.test(t.ink || '') ? t.ink : '#ffffff', accent: HEX.test(t.accent || '') ? t.accent : '#f3c969',
    nameFont: NAME_FONT_KEYS.includes(t.nameFont) ? t.nameFont : 'corm', bodyFont: BODY_FONT_KEYS.includes(t.bodyFont) ? t.bodyFont : 'corm',
    scrim: num(t.scrim, 0, 0.8, 0), scrimColor: HEX.test(t.scrimColor || '') ? t.scrimColor : '#000000',
    fx: FX_KEYS.includes(t.fx) ? t.fx : 'none', textScale: num(t.textScale, 0.5, 1.5, 1),
    region: {
      tall: region(t.region && t.region.tall, { x: 0.08, y: 0.2, w: 0.84, h: 0.6 }),
      square: region(t.region && t.region.square, { x: 0.08, y: 0.1, w: 0.84, h: 0.8 }),
      wide: region(t.region && t.region.wide, { x: 0.05, y: 0.1, w: 0.9, h: 0.8 })
    },
    active: t.active !== false, order: num(t.order, 0, 9999, 0)
  };
}
