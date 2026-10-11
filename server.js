// Taklifnoma Studiyasi serveri. Tashqi kutubxonalarsiz (faqat Node 18+).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Store } from './lib/store.js';
import { sanitizeState, validSlug, TPLS } from './lib/sanitize.js';
import { loadAdmin, checkPassword, signSession, verifySession, sanitizeTemplate, hashPassword } from './lib/admin.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, 'public');
const env = process.env;
const PORT = +env.PORT || 3000;
const DATA = path.resolve(env.DATA_DIR || path.join(ROOT, 'data'));
const UPLOADS = path.join(DATA, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
const BASE_URL = (env.BASE_URL || '').replace(/\/$/, '');
const FFMPEG = env.FFMPEG_PATH || 'ffmpeg';
const DEMO_PAY = env.DEMO_PAY === '1';
const TRUST_PROXY = env.TRUST_PROXY === '1';
const CFG = {
  site: { name: env.SITE_NAME || 'Taklifnoma Studiyasi', domain: env.SITE_DOMAIN || (BASE_URL ? BASE_URL.replace(/^https?:\/\//, '') : 'taklifnoma.uz'), tz: '+05:00' },
  prices: { img: +env.PRICE_IMG || 15000, video: +env.PRICE_VIDEO || 25000, bulk: +env.PRICE_BULK || 40000, currency: "so'm" },
  providers: ['click', 'payme', 'uzum'],
  demoPay: DEMO_PAY
};
let HAS_FFMPEG = false;
{
  const p = spawn(FFMPEG, ['-version']);
  p.on('error', () => { HAS_FFMPEG = false; });
  p.on('exit', (c) => { HAS_FFMPEG = c === 0; });
  p.stdout.resume();
}

const store = new Store(DATA);
const db = store.db;
db.templates = db.templates || {}; db.tracks = db.tracks || {}; db.promos = db.promos || {};
const admin = loadAdmin(DATA, env.ADMIN_PASSWORD);
if (admin.firstPassword) {
  console.log('\n' + '='.repeat(60) + '\n  ADMIN PAROLI (faqat bir marta ko\'rsatiladi): ' + admin.firstPassword + '\n  Kirish: /admin   (parol ' + path.join(DATA, 'admin-first-password.txt') + ' faylida ham)\n' + '='.repeat(60) + '\n');
}
const isAdmin = (req) => verifySession(admin.secret, parseCookies(req).adm);
const isTpl = (id) => TPLS.includes(id) || !!db.templates[id];

/* ---------------- yordamchilar ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.webm': 'video/webm', '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json'
};
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com', "img-src 'self' data: blob:", "media-src 'self' blob:", "connect-src 'self'",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'"
].join('; ');
function secHeaders(h = {}) {
  return { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': CSP, 'Permissions-Policy': 'microphone=(self), camera=()', ...h };
}
function send(res, code, body, headers = {}) {
  res.writeHead(code, secHeaders(headers));
  res.end(body);
}
function json(res, code, obj, headers = {}) {
  send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
}
const fail = (res, code, msg, extra = {}) => json(res, code, { error: msg, ...extra });

function ipOf(req) {
  if (TRUST_PROXY) { const x = req.headers['x-forwarded-for']; if (x) return String(x).split(',')[0].trim(); }
  return req.socket.remoteAddress || 'x';
}
const buckets = new Map();
function limited(req, key, max, windowMs) {
  const k = key + '|' + ipOf(req); const now = Date.now();
  let b = buckets.get(k);
  if (!b || now - b.t > windowMs) { b = { t: now, n: 0 }; buckets.set(k, b); }
  return ++b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.t > 3600e3) buckets.delete(k); }, 600e3).unref();

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > max) { reject(Object.assign(new Error('Fayl juda katta'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req, max = 400e3) {
  const b = await readBody(req, max);
  try { return JSON.parse(b.toString('utf8') || '{}'); } catch (e) { throw Object.assign(new Error('JSON noto\'g\'ri'), { status: 400 }); }
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const rid = (n = 12) => crypto.randomBytes(n).toString('hex');

function parseCookies(req) {
  const o = {}; String(req.headers.cookie || '').split(';').forEach((p) => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return o;
}

/* ---------------- foydalanuvchi (cookie bo'yicha) ---------------- */
const PROMOS = {};
String(env.PROMO_CODES || '').split(';').forEach((p) => {
  const [code, rest] = p.split('='); if (!code || !rest) return;
  const g = {}; rest.split(',').forEach((x) => { const [k, v] = x.split(':'); if (['img', 'video', 'bulk'].includes(k)) g[k] = Math.max(0, +v || 0); });
  PROMOS[code.trim().toUpperCase()] = g;
});

function getUser(req, res) {
  const ck = parseCookies(req);
  let cid = /^[a-f0-9]{32}$/.test(ck.cid || '') ? ck.cid : null;
  let u = cid && db.users[cid];
  const setCookies = [];
  if (!u) {
    cid = rid(16);
    u = db.users[cid] = { cid, created: Date.now(), credits: { img: 0, video: 0, bulk: 0 }, unlocked: {}, redeemed: [], refCode: rid(4), refBy: null };
    db.refs[u.refCode] = cid;
    const ref = ck.ref && db.refs[ck.ref];
    if (ref && ref !== cid && db.users[ref]) { u.refBy = ref; db.users[ref].credits.img += 1; }
    setCookies.push(`cid=${cid}; Path=/; Max-Age=${3600 * 24 * 365 * 2}; HttpOnly; SameSite=Lax${BASE_URL.startsWith('https') ? '; Secure' : ''}`);
    store.save();
  }
  if (setCookies.length) res.setHeader('Set-Cookie', setCookies);
  return u;
}
const KINDS = ['img', 'video', 'bulk'];
const meView = (u, adm) => ({ cid: u.cid, credits: u.credits, unlocked: u.unlocked, refCode: u.refCode, admin: !!adm, email: u.email || null });
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const cidCookie = (cid, maxAge = 3600 * 24 * 365 * 2) => `cid=${cid}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${BASE_URL.startsWith('https') ? '; Secure' : ''}`;
/** Anonim foydalanuvchining kredit, ochilgan va taklifnomalarini hisobga ko'chiradi. */
function mergeUsers(from, to) {
  if (!from || !to || from.cid === to.cid || from.email) return;
  KINDS.forEach((k) => { to.credits[k] = (to.credits[k] || 0) + (from.credits[k] || 0); from.credits[k] = 0; });
  Object.entries(from.unlocked || {}).forEach(([d, kinds]) => { to.unlocked[d] = [...new Set([...(to.unlocked[d] || []), ...kinds])]; });
  from.unlocked = {};
  Object.values(db.invites).forEach((i) => { if (i.owner === from.cid) i.owner = to.cid; });
}
const canEdit = (req, inv, user) => checkToken(req, inv) || (!!user && inv.owner === user.cid);

function grantUnlock(u, design, kind) {
  const set = new Set(u.unlocked[design] || []); set.add(kind); u.unlocked[design] = [...set];
  // bir martalik "rasm" ochilsa, shu loyiha uchun rasm cheklovlari tugaydi; video va ZIP alohida
  store.save();
}

/* ---------------- API ---------------- */
const readyUpload = (name) => path.join(UPLOADS, name);
const MAGIC = [
  { t: 'image', ext: 'jpg', ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { t: 'image', ext: 'png', ok: (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { t: 'image', ext: 'webp', ok: (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' },
  { t: 'audio', ext: 'mp3', ok: (b) => b.slice(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { t: 'audio', ext: 'wav', ok: (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WAVE' },
  { t: 'audio', ext: 'ogg', ok: (b) => b.slice(0, 4).toString() === 'OggS' },
  { t: 'audio', ext: 'm4a', ok: (b) => b.slice(4, 8).toString() === 'ftyp' },
  { t: 'audio', ext: 'webm', ok: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 }
];

let converting = 0;
function convertVideo(input, ext) {
  return new Promise((resolve, reject) => {
    const id = rid(8); const inF = path.join(DATA, `cv-${id}.${ext === 'mp4' ? 'mp4' : 'webm'}`); const outF = path.join(DATA, `cv-${id}-out.mp4`);
    fs.writeFileSync(inF, input);
    const args = ['-y', '-i', inF, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-threads', '2', '-pix_fmt', 'yuv420p', '-r', '30', '-vsync', 'cfr',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart', outF];
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', (d) => { err = (err + d).slice(-600); });
    const timer = setTimeout(() => p.kill('SIGKILL'), 180e3);
    const clean = () => { fs.rm(inF, () => {}); fs.rm(outF, () => {}); };
    p.on('error', (e) => { clearTimeout(timer); clean(); reject(Object.assign(new Error('ffmpeg topilmadi'), { status: 501 })); });
    p.on('close', () => { if (err && process.env.DEBUG_FFMPEG) console.error(err); });
    p.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) { clean(); console.error('ffmpeg xato:', code, err); return reject(Object.assign(new Error('Konvertatsiya bajarilmadi (server resursi yetmadi)'), { status: 500, detail: err })); }
      const out = fs.readFileSync(outF); clean(); resolve(out);
    });
  });
}

async function api(req, res, url) {
  const p = url.pathname; const m = req.method; let mm0;
  const user = getUser(req, res);
  if (limited(req, 'api', 600, 60e3)) return fail(res, 429, 'Juda ko\'p so\'rov. Bir oz kuting.');

  if (p === '/api/config' && m === 'GET') return json(res, 200, { ...CFG, ffmpeg: HAS_FFMPEG });
  if (p === '/api/me' && m === 'GET') return json(res, 200, meView(user, isAdmin(req)));

  if (p === '/api/redeem' && m === 'POST') {
    if (limited(req, 'redeem', 10, 600e3)) return fail(res, 429, 'Juda ko\'p urinish');
    const { code } = await readJson(req, 2000);
    const c = String(code || '').trim().toUpperCase();
    const dbp = db.promos[c];
    const g = dbp ? dbp.credits : PROMOS[c];
    if (!g) return fail(res, 404, 'Promokod topilmadi');
    if (user.redeemed.includes(c)) return fail(res, 409, 'Bu promokod allaqachon ishlatilgan');
    if (dbp && dbp.maxUses && dbp.used >= dbp.maxUses) return fail(res, 410, 'Promokod limiti tugagan');
    if (dbp) dbp.used = (dbp.used || 0) + 1;
    user.redeemed.push(c);
    KINDS.forEach((k) => { user.credits[k] += g[k] || 0; });
    store.save();
    return json(res, 200, meView(user, isAdmin(req)));
  }

  if (p === '/api/unlock' && m === 'POST') {
    const { design, kind } = await readJson(req, 2000);
    if (!/^[a-z0-9]{6,24}$/.test(design || '') || !KINDS.includes(kind)) return fail(res, 400, 'Noto\'g\'ri so\'rov');
    if ((user.unlocked[design] || []).includes(kind)) return json(res, 200, meView(user));
    if (user.credits[kind] > 0) { user.credits[kind]--; grantUnlock(user, design, kind); return json(res, 200, meView(user)); }
    return fail(res, 402, 'To\'lov kerak', { price: CFG.prices[kind], currency: CFG.prices.currency });
  }

  if (p === '/api/pay' && m === 'POST') {
    if (limited(req, 'pay', 30, 600e3)) return fail(res, 429, 'Juda ko\'p urinish');
    const { design, kind, provider } = await readJson(req, 2000);
    if (!/^[a-z0-9]{6,24}$/.test(design || '') || !KINDS.includes(kind)) return fail(res, 400, 'Noto\'g\'ri so\'rov');
    if (DEMO_PAY) { grantUnlock(user, design, kind); return json(res, 200, { ...meView(user), demo: true }); }
    // Click / Payme / Uzum: haqiqiy integratsiya uchun merchant shartnomasi va kalitlar kerak (README ga qarang).
    return fail(res, 501, `${provider || 'To\'lov'} tizimi hali ulanmagan. Promokod ishlating yoki administrator bilan bog'laning.`, { providers: CFG.providers });
  }

  if (p === '/api/slug' && m === 'GET') {
    const s = String(url.searchParams.get('s') || '').toLowerCase();
    const bad = validSlug(s);
    if (bad) return json(res, 200, { ok: false, reason: bad });
    return json(res, 200, db.slugs[s] ? { ok: false, reason: 'Bu havola band' } : { ok: true });
  }

  if (p === '/api/upload' && m === 'POST') {
    if (limited(req, 'upload', 40, 600e3)) return fail(res, 429, 'Juda ko\'p yuklash');
    const kind = url.searchParams.get('kind') === 'audio' ? 'audio' : 'image';
    const body = await readBody(req, kind === 'audio' ? 12e6 : 6e6);
    if (body.length < 100) return fail(res, 400, 'Fayl bo\'sh');
    const mg = MAGIC.find((x) => x.t === kind && x.ok(body));
    if (!mg) return fail(res, 415, kind === 'audio' ? 'Audio formati qo\'llanmaydi (mp3, m4a, wav, ogg)' : 'Rasm formati qo\'llanmaydi (JPG, PNG, WebP)');
    const name = crypto.createHash('sha1').update(body).digest('hex').slice(0, 24) + '.' + mg.ext;
    const f = readyUpload(name);
    if (!fs.existsSync(f)) fs.writeFileSync(f, body);
    return json(res, 200, { url: '/u/' + name });
  }

  if (p === '/api/convert' && m === 'POST') {
    if (!HAS_FFMPEG) return fail(res, 501, 'Serverda ffmpeg o\'rnatilmagan');
    if (limited(req, 'convert', 12, 600e3)) return fail(res, 429, 'Juda ko\'p konvertatsiya. Keyinroq urinib ko\'ring.');
    if (converting >= 2) return fail(res, 503, 'Server band, bir daqiqadan so\'ng urinib ko\'ring');
    const ext = url.searchParams.get('ext') === 'mp4' ? 'mp4' : 'webm';
    const body = await readBody(req, 90e6);
    if (body.length < 1000) return fail(res, 400, 'Video bo\'sh');
    converting++;
    try { const out = await convertVideo(body, ext); return send(res, 200, out, { 'Content-Type': 'video/mp4', 'Content-Length': out.length, 'Cache-Control': 'no-store' }); }
    catch (e) { return fail(res, e.status || 500, e.message); }
    finally { converting--; }
  }


  // ---- ochiq: maxsus shablonlar va qo'shiqlar ----
  if (p === '/api/templates' && m === 'GET') {
    const list = Object.values(db.templates).filter((t) => t.active).sort((a, b) => a.order - b.order || a.created - b.created);
    return json(res, 200, { templates: list.map(({ created, ...t }) => t) });
  }
  if (p === '/api/tracks' && m === 'GET') return json(res, 200, { tracks: Object.values(db.tracks).sort((a, b) => a.created - b.created) });

  // ---- admin ----
  if (p.startsWith('/api/admin/')) return await adminApi(req, res, url, p, m);

  // ---- hisob (email + parol) ----
  if (p === '/api/account/register' && m === 'POST') {
    if (limited(req, 'acct', 10, 3600e3)) return fail(res, 429, 'Juda ko\'p urinish. Keyinroq urinib ko\'ring.');
    const b = await readJson(req, 2000);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'Email manzili noto\'g\'ri');
    if (typeof b.password !== 'string' || b.password.length < 8 || b.password.length > 100) return fail(res, 400, 'Parol kamida 8 ta belgi bo\'lsin');
    if (db.accounts[email]) return fail(res, 409, 'Bu email bilan hisob bor. "Kirish" bo\'limidan foydalaning.');
    if (user.email) return fail(res, 409, 'Siz allaqachon hisobga kirgansiz');
    db.accounts[email] = { email, pw: hashPassword(b.password), cid: user.cid, created: Date.now() };
    user.email = email; store.save();
    return json(res, 200, { me: meView(user, isAdmin(req)) });
  }
  if (p === '/api/account/login' && m === 'POST') {
    if (limited(req, 'login', 15, 600e3)) return fail(res, 429, 'Juda ko\'p urinish. 10 daqiqadan so\'ng urinib ko\'ring.');
    const b = await readJson(req, 2000);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
    const acc = db.accounts[email];
    const ok = checkPassword(String(b.password || ''), acc ? acc.pw : hashPassword('x', '00'.repeat(8)));
    if (!acc || !ok || !db.users[acc.cid]) return fail(res, 401, 'Email yoki parol noto\'g\'ri');
    const target = db.users[acc.cid];
    mergeUsers(user, target);
    res.setHeader('Set-Cookie', cidCookie(acc.cid)); store.save();
    return json(res, 200, { me: meView(target, isAdmin(req)) });
  }
  if (p === '/api/account/logout' && m === 'POST') {
    res.setHeader('Set-Cookie', cidCookie('', 0)); return json(res, 200, { ok: true });
  }
  if (p === '/api/my/invites' && m === 'GET') {
    const list = Object.values(db.invites).filter((i) => i.owner === user.cid).sort((a, b) => b.updated - a.updated).slice(0, 100)
      .map((i) => ({ id: i.id, slug: i.slug, title: [i.state.n1, i.state.n2].filter(Boolean).join(' & ') || 'Taklifnoma', tpl: i.state.tpl, views: i.views, rsvps: i.rsvps.length, updated: i.updated }));
    return json(res, 200, { invites: list });
  }
  mm0 = /^\/api\/my\/invites\/([a-f0-9]{16})$/.exec(p);
  if (mm0 && m === 'GET') {
    const inv = db.invites[mm0[1]]; if (!inv || inv.owner !== user.cid) return fail(res, 404, 'Topilmadi');
    return json(res, 200, { id: inv.id, slug: inv.slug, state: inv.state });
  }

  // ---- taklifnomalar ----
  if (p === '/api/invites' && m === 'POST') {
    if (limited(req, 'publish', 30, 3600e3)) return fail(res, 429, 'Juda ko\'p yaratish. Keyinroq urinib ko\'ring.');
    const b = await readJson(req);
    const slug = String(b.slug || '').toLowerCase();
    const bad = validSlug(slug); if (bad) return fail(res, 400, bad);
    if (db.slugs[slug]) return fail(res, 409, 'Bu havola band');
    const state = sanitizeState(b.state, isTpl);
    const id = rid(8); const token = rid(24);
    const og = typeof b.og === 'string' && /^\/u\/[a-z0-9._-]{8,80}$/.test(b.og) ? b.og : null;
    db.invites[id] = { id, slug, owner: user.cid, tokenHash: sha(token), state, og, created: Date.now(), updated: Date.now(), views: 0, rsvps: [] };
    db.slugs[slug] = id; store.save();
    return json(res, 200, { id, slug, token, url: `${BASE_URL}/i/${slug}` });
  }
  let mm = /^\/api\/invites\/([a-z0-9-]{3,40})$/.exec(p);
  if (mm && m === 'GET') {
    const inv = db.invites[db.slugs[mm[1]]]; if (!inv) return fail(res, 404, 'Taklifnoma topilmadi');
    inv.views++; store.save();
    const sum = inv.rsvps.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + (r.count || 1); return a; }, {});
    return json(res, 200, { slug: inv.slug, state: inv.state, og: inv.og, rsvp: sum, site: CFG.site });
  }
  mm = /^\/api\/invites\/([a-f0-9]{16})$/.exec(p);
  if (mm && m === 'PUT') {
    const inv = db.invites[mm[1]]; if (!inv) return fail(res, 404, 'Topilmadi');
    if (!canEdit(req, inv, user)) return fail(res, 403, 'Ruxsat yo\'q');
    const b = await readJson(req);
    inv.state = sanitizeState(b.state, isTpl); if (typeof b.og === 'string' && /^\/u\/[a-z0-9._-]{8,80}$/.test(b.og)) inv.og = b.og;
    inv.updated = Date.now(); store.save();
    return json(res, 200, { ok: true, url: `${BASE_URL}/i/${inv.slug}` });
  }
  mm = /^\/api\/invites\/([a-f0-9]{16})\/rsvp$/.exec(p);
  if (mm && m === 'GET') {
    const inv = db.invites[mm[1]]; if (!inv) return fail(res, 404, 'Topilmadi');
    if (!canEdit(req, inv, user)) return fail(res, 403, 'Ruxsat yo\'q');
    return json(res, 200, { rsvps: inv.rsvps, views: inv.views });
  }
  mm = /^\/api\/invites\/([a-z0-9-]{3,40})\/rsvp$/.exec(p);
  if (mm && m === 'POST') {
    if (limited(req, 'rsvp', 20, 3600e3)) return fail(res, 429, 'Juda ko\'p urinish');
    const inv = db.invites[db.slugs[mm[1]]]; if (!inv) return fail(res, 404, 'Topilmadi');
    const b = await readJson(req, 4000);
    const name = String(b.name || '').trim().slice(0, 60); if (!name) return fail(res, 400, 'Ismingizni kiriting');
    const status = ['yes', 'no', 'maybe'].includes(b.status) ? b.status : 'yes';
    if (inv.rsvps.length >= 600) return fail(res, 409, 'Javoblar limiti to\'ldi');
    const entry = { name, status, count: Math.max(1, Math.min(10, Math.round(+b.count || 1))), note: String(b.note || '').slice(0, 200), at: Date.now() };
    const i = inv.rsvps.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());
    if (i >= 0) inv.rsvps[i] = entry; else inv.rsvps.push(entry);
    store.save();
    return json(res, 200, { ok: true });
  }
  return fail(res, 404, 'Topilmadi');
}

const ADMIN_MAGIC = {
  image: [(b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? 'jpg' : null, (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'png' : null, (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' ? 'webp' : null],
  video: [(b) => b.slice(4, 8).toString() === 'ftyp' ? 'mp4' : null, (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 ? 'webm' : null],
  audio: MAGIC.filter((x) => x.t === 'audio').map((x) => (b) => (x.ok(b) ? x.ext : null))
};
const LIMITS = { image: 12e6, video: 90e6, audio: 25e6 };
let loginFails = 0, lockUntil = 0;
async function adminApi(req, res, url, p, m) {
  const secure = BASE_URL.startsWith('https');
  if (p === '/api/admin/login' && m === 'POST') {
    if (limited(req, 'adminlogin', 8, 600e3) || Date.now() < lockUntil) return fail(res, 429, 'Juda ko\'p urinish. 10 daqiqadan so\'ng qayta urinib ko\'ring.');
    const b = await readJson(req, 2000);
    if (!checkPassword(b.password || '', admin.rec)) {
      if (++loginFails >= 20) { lockUntil = Date.now() + 600e3; loginFails = 0; }
      return fail(res, 401, 'Parol noto\'g\'ri');
    }
    loginFails = 0;
    res.setHeader('Set-Cookie', `adm=${signSession(admin.secret)}; Path=/; Max-Age=${12 * 3600}; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`);
    return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/logout' && m === 'POST') {
    res.setHeader('Set-Cookie', `adm=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`);
    return json(res, 200, { ok: true });
  }
  if (!isAdmin(req)) return fail(res, 401, 'Admin sifatida kiring');
  if (m !== 'GET' && req.headers['x-requested-with'] !== 'admin') return fail(res, 403, 'Noto\'g\'ri so\'rov');

  if (p === '/api/admin/stats' && m === 'GET') {
    const inv = Object.values(db.invites); const users = Object.values(db.users);
    const unl = { img: 0, video: 0, bulk: 0 }; users.forEach((u) => Object.values(u.unlocked).forEach((a) => a.forEach((k) => { unl[k]++; })));
    let bytes = 0; try { for (const f of fs.readdirSync(UPLOADS)) bytes += fs.statSync(path.join(UPLOADS, f)).size; } catch (e) { /* */ }
    return json(res, 200, { users: users.length, invites: inv.length, views: inv.reduce((a, i) => a + i.views, 0), rsvps: inv.reduce((a, i) => a + i.rsvps.length, 0), unlocks: unl, templates: Object.keys(db.templates).length, tracks: Object.keys(db.tracks).length, storageMB: Math.round(bytes / 1e5) / 10, ffmpeg: HAS_FFMPEG, demoPay: DEMO_PAY });
  }
  if (p === '/api/admin/upload' && m === 'POST') {
    const kind = ['image', 'video', 'audio'].includes(url.searchParams.get('kind')) ? url.searchParams.get('kind') : 'image';
    const body = await readBody(req, LIMITS[kind]);
    if (body.length < 100) return fail(res, 400, 'Fayl bo\'sh');
    let ext = null; for (const f of ADMIN_MAGIC[kind]) { ext = f(body); if (ext) break; }
    if (!ext) return fail(res, 415, kind === 'video' ? 'Video MP4 yoki WebM bo\'lsin' : kind === 'audio' ? 'Audio mp3/m4a/wav/ogg bo\'lsin' : 'Rasm JPG, PNG yoki WebP bo\'lsin');
    const name = crypto.createHash('sha1').update(body).digest('hex').slice(0, 24) + '.' + ext;
    const f = readyUpload(name); if (!fs.existsSync(f)) fs.writeFileSync(f, body);
    return json(res, 200, { url: '/u/' + name, size: body.length });
  }
  if (p === '/api/admin/accounts' && m === 'GET') {
    const list = Object.values(db.accounts).sort((a, b) => b.created - a.created).slice(0, 500).map((a) => ({ email: a.email, created: a.created, invites: Object.values(db.invites).filter((i) => i.owner === a.cid).length }));
    return json(res, 200, { accounts: list });
  }
  if (p === '/api/admin/accounts/reset' && m === 'POST') {
    const b = await readJson(req, 2000); const acc = db.accounts[String(b.email || '').toLowerCase()];
    if (!acc) return fail(res, 404, 'Hisob topilmadi');
    if (typeof b.password !== 'string' || b.password.length < 8) return fail(res, 400, 'Parol kamida 8 ta belgi');
    acc.pw = hashPassword(b.password); store.save(); return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/poster' && m === 'POST') {
    // brauzer videoni o'qiy olmasa (masalan H.265), serverda ffmpeg bilan birinchi kadrni olamiz
    if (!HAS_FFMPEG) return fail(res, 501, 'Serverda ffmpeg yo\'q — poster rasmini qo\'lda yuklang');
    const b = await readJson(req, 2000);
    const mv = /^\/u\/([a-z0-9]{24}\.(?:mp4|webm))$/.exec(String(b.video || ''));
    if (!mv) return fail(res, 400, 'Video topilmadi');
    const src = readyUpload(mv[1]); if (!fs.existsSync(src)) return fail(res, 404, 'Video topilmadi');
    const out = path.join(DATA, `po-${rid(6)}.jpg`);
    const jpg = await new Promise((resolve, reject) => {
      const pr = spawn(FFMPEG, ['-y', '-ss', '0.3', '-i', src, '-frames:v', '1', '-vf', 'scale=1080:-2', '-q:v', '3', out], { stdio: 'ignore' });
      const t = setTimeout(() => pr.kill('SIGKILL'), 30e3);
      pr.on('error', () => { clearTimeout(t); reject(new Error('ffmpeg topilmadi')); });
      pr.on('exit', (c) => { clearTimeout(t); try { if (c !== 0) throw 0; const d = fs.readFileSync(out); fs.rm(out, () => {}); resolve(d); } catch (e) { fs.rm(out, () => {}); reject(new Error('Videodan kadr olib bo\'lmadi')); } });
    }).catch((e) => e);
    if (jpg instanceof Error) return fail(res, 500, jpg.message);
    const name = crypto.createHash('sha1').update(jpg).digest('hex').slice(0, 24) + '.jpg';
    const f = readyUpload(name); if (!fs.existsSync(f)) fs.writeFileSync(f, jpg);
    return json(res, 200, { url: '/u/' + name });
  }
  if (p === '/api/admin/templates' && m === 'GET') return json(res, 200, { templates: Object.values(db.templates).sort((a, b) => a.order - b.order || a.created - b.created) });
  if (p === '/api/admin/templates' && m === 'POST') {
    const b = await readJson(req, 20000);
    const id = typeof b.id === 'string' && /^c_[a-z0-9]{6,16}$/.test(b.id) && db.templates[b.id] ? b.id : 'c_' + rid(5);
    let t; try { t = sanitizeTemplate(b, id); } catch (e) { return fail(res, 400, e.message); }
    t.created = (db.templates[id] && db.templates[id].created) || Date.now();
    db.templates[id] = t; store.save();
    return json(res, 200, { template: t });
  }
  let mm = /^\/api\/admin\/templates\/(c_[a-z0-9]{6,16})$/.exec(p);
  if (mm && m === 'DELETE') { delete db.templates[mm[1]]; store.save(); return json(res, 200, { ok: true }); }

  if (p === '/api/admin/tracks' && m === 'POST') {
    const b = await readJson(req, 4000);
    if (!/^\/u\/[a-z0-9._-]{8,80}$/.test(b.url || '') || !fs.existsSync(readyUpload(b.url.slice(3)))) return fail(res, 400, 'Audio fayl topilmadi');
    const id = 't_' + rid(4);
    db.tracks[id] = { id, title: String(b.title || 'Qo\'shiq').trim().slice(0, 60) || 'Qo\'shiq', url: b.url, created: Date.now() };
    store.save(); return json(res, 200, { track: db.tracks[id] });
  }
  mm = /^\/api\/admin\/tracks\/(t_[a-f0-9]{8})$/.exec(p);
  if (mm && m === 'DELETE') { delete db.tracks[mm[1]]; store.save(); return json(res, 200, { ok: true }); }

  if (p === '/api/admin/promos' && m === 'GET') return json(res, 200, { promos: Object.entries(db.promos).map(([code, v]) => ({ code, ...v })), env: Object.keys(PROMOS) });
  if (p === '/api/admin/promos' && m === 'POST') {
    const b = await readJson(req, 2000);
    const code = String(b.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
    if (code.length < 3) return fail(res, 400, 'Kod kamida 3 ta belgi');
    const c = (k) => Math.max(0, Math.min(1000, Math.round(+b[k] || 0)));
    db.promos[code] = { credits: { img: c('img'), video: c('video'), bulk: c('bulk') }, maxUses: Math.max(0, Math.min(100000, Math.round(+b.maxUses || 0))), used: (db.promos[code] && db.promos[code].used) || 0, created: Date.now() };
    store.save(); return json(res, 200, { ok: true });
  }
  mm = /^\/api\/admin\/promos\/([A-Z0-9_-]{3,24})$/.exec(p);
  if (mm && m === 'DELETE') { delete db.promos[mm[1]]; store.save(); return json(res, 200, { ok: true }); }

  if (p === '/api/admin/invites' && m === 'GET') {
    const list = Object.values(db.invites).sort((a, b) => b.created - a.created).slice(0, 300).map((i) => ({ id: i.id, slug: i.slug, title: [i.state.n1, i.state.n2].filter(Boolean).join(' & '), tpl: i.state.tpl, views: i.views, rsvps: i.rsvps.length, created: i.created }));
    return json(res, 200, { invites: list });
  }
  mm = /^\/api\/admin\/invites\/([a-f0-9]{16})$/.exec(p);
  if (mm && m === 'DELETE') { const i = db.invites[mm[1]]; if (i) { delete db.slugs[i.slug]; delete db.invites[mm[1]]; store.save(); } return json(res, 200, { ok: true }); }

  if (p === '/api/admin/password' && m === 'POST') {
    const b = await readJson(req, 2000);
    if (!checkPassword(b.old || '', admin.rec)) return fail(res, 403, 'Eski parol noto\'g\'ri');
    if (String(b.new || '').length < 10) return fail(res, 400, 'Yangi parol kamida 10 ta belgi bo\'lsin');
    if (env.ADMIN_PASSWORD) return fail(res, 409, 'Parol ADMIN_PASSWORD muhit o\'zgaruvchisi bilan berilgan; uni serverda o\'zgartiring.');
    admin.setPassword(String(b.new)); return json(res, 200, { ok: true });
  }
  return fail(res, 404, 'Topilmadi');
}

function checkToken(req, inv) {
  const t = String(req.headers['x-owner-token'] || '');
  if (!/^[a-f0-9]{48}$/.test(t)) return false;
  const a = Buffer.from(sha(t)); const b = Buffer.from(inv.tokenHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------------- statik fayllar ---------------- */
const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const gz = new Map();
function serveFile(req, res, file, extra = {}) {
  let st; try { st = fs.statSync(file); } catch (e) { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const textual = /^(text|application\/(json|javascript))|svg/.test(type);
  const etag = `"${st.size}-${Math.round(st.mtimeMs)}"`;
  const cache = extra.cache || (ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=86400');
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, secHeaders({ ETag: etag })); res.end(); return true; }
  const h = { 'Content-Type': type, 'Cache-Control': cache, ETag: etag, Vary: 'Accept-Encoding' };
  if (textual && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    let c = gz.get(file); if (!c || c.etag !== etag) { c = { etag, buf: zlib.gzipSync(fs.readFileSync(file)) }; gz.set(file, c); }
    res.writeHead(200, secHeaders({ ...h, 'Content-Encoding': 'gzip', 'Content-Length': c.buf.length })); res.end(req.method === 'HEAD' ? undefined : c.buf); return true;
  }
  h['Accept-Ranges'] = 'bytes';
  const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (rg && (rg[1] || rg[2])) {
    let a = rg[1] ? +rg[1] : Math.max(0, st.size - +rg[2]); let b = rg[1] && rg[2] ? +rg[2] : st.size - 1;
    b = Math.min(b, st.size - 1);
    if (a > b || a >= st.size) { res.writeHead(416, secHeaders({ 'Content-Range': `bytes */${st.size}` })); res.end(); return true; }
    res.writeHead(206, secHeaders({ ...h, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 }));
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file, { start: a, end: b }).pipe(res);
    return true;
  }
  res.writeHead(200, secHeaders({ ...h, 'Content-Length': st.size }));
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  return true;
}
function safeJoin(base, rel) {
  const f = path.normalize(path.join(base, rel));
  return f.startsWith(base + path.sep) || f === base ? f : null;
}

function originOf(req) {
  if (BASE_URL) return BASE_URL;
  const proto = TRUST_PROXY && req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'] : 'http';
  return `${proto}://${req.headers.host}`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (p.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Ruxsat etilmagan');

    if (url.searchParams.get('ref') && /^[a-f0-9]{8}$/.test(url.searchParams.get('ref'))) {
      res.setHeader('Set-Cookie', `ref=${url.searchParams.get('ref')}; Path=/; Max-Age=${3600 * 24 * 30}; SameSite=Lax`);
    }
    if (p.startsWith('/u/')) {
      const f = safeJoin(UPLOADS, p.slice(3));
      if (f && serveFile(req, res, f, { cache: 'public, max-age=31536000, immutable' })) return;
      return fail(res, 404, 'Topilmadi');
    }
    let mm = /^\/i\/([a-z0-9-]{3,40})\/?$/.exec(p);
    if (mm) {
      const inv = db.invites[db.slugs[mm[1]]];
      let html = fs.readFileSync(path.join(PUB, 'invite.html'), 'utf8');
      const org = originOf(req);
      const title = inv ? [inv.state.n1, inv.state.n2].filter(Boolean).join(' & ') : 'Taklifnoma';
      const desc = inv ? (inv.state.msg || 'Sizni taklif qilamiz').slice(0, 160) : 'Taklifnoma topilmadi';
      const meta = `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(org + '/i/' + mm[1])}">` +
        (inv && inv.og ? `<meta property="og:image" content="${esc(org + inv.og)}"><meta name="twitter:card" content="summary_large_image">` : '') + `<title>${esc(title)}</title>`;
      html = html.replace('<!--OG-->', meta);
      return send(res, inv ? 200 : 404, html, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
    }
    if (p === '/' ) p = '/index.html';
    else if (p === '/editor' || p === '/studio') p = '/editor.html';
    else if (p === '/admin') p = '/admin.html';
    const f = safeJoin(PUB, p);
    if (f && serveFile(req, res, f)) return;
    fail(res, 404, 'Sahifa topilmadi');
  } catch (e) {
    if (!res.headersSent) fail(res, e.status || 500, e.status ? e.message : 'Server xatosi');
    if (!e.status) console.error(e);
  }
});
server.requestTimeout = 120e3;
const HOST = env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`Taklifnoma Studiyasi: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}  (data: ${DATA}${DEMO_PAY ? ', DEMO_PAY' : ''})`));
for (const sg of ['SIGINT', 'SIGTERM']) process.on(sg, () => { store.flush(); process.exit(0); });
