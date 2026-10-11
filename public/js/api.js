// Server bilan aloqa.
async function j(url, opt = {}) {
  const r = await fetch(url, { credentials: 'same-origin', ...opt, headers: { ...(opt.body && !(opt.body instanceof Blob) && !(opt.body instanceof ArrayBuffer) ? { 'Content-Type': 'application/json' } : {}), ...(opt.headers || {}) } });
  let data = null;
  try { data = await r.json(); } catch (e) { /* */ }
  if (!r.ok) { const err = new Error((data && data.error) || `Xato (${r.status})`); err.status = r.status; err.data = data; throw err; }
  return data;
}
const post = (u, b) => j(u, { method: 'POST', body: JSON.stringify(b || {}) });

export const api = {
  config: () => j('/api/config'),
  tracks: () => j('/api/tracks'),
  me: () => j('/api/me'),
  register: (email, password) => post('/api/account/register', { email, password }),
  login: (email, password) => post('/api/account/login', { email, password }),
  logout: () => post('/api/account/logout'),
  myInvites: () => j('/api/my/invites'),
  myInvite: (id) => j('/api/my/invites/' + encodeURIComponent(id)),
  redeem: (code) => post('/api/redeem', { code }),
  unlock: (design, kind) => post('/api/unlock', { design, kind }),
  pay: (design, kind, provider) => post('/api/pay', { design, kind, provider }),
  slugCheck: (slug) => j('/api/slug?s=' + encodeURIComponent(slug)),
  publish: (body) => post('/api/invites', body),
  update: (id, token, body) => j('/api/invites/' + encodeURIComponent(id), { method: 'PUT', headers: { 'X-Owner-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  get: (slug) => j('/api/invites/' + encodeURIComponent(slug)),
  rsvpList: (id, token) => j('/api/invites/' + encodeURIComponent(id) + '/rsvp', { headers: { 'X-Owner-Token': token } }),
  rsvp: (slug, body) => post('/api/invites/' + encodeURIComponent(slug) + '/rsvp', body),
  upload: (blob, kind) => j('/api/upload?kind=' + encodeURIComponent(kind || 'image'), { method: 'POST', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob }),
  async convert(blob, ext, audioWav) {
    const r = await fetch('/api/convert?ext=' + encodeURIComponent(ext), { method: 'POST', headers: { 'Content-Type': blob.type || 'video/webm' }, body: blob, credentials: 'same-origin' });
    if (!r.ok) { let d = null; try { d = await r.json(); } catch (e) { /* */ } const err = new Error((d && d.error) || 'Konvertatsiya xatosi'); err.status = r.status; throw err; }
    return r.blob();
  }
};
