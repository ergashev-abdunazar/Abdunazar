// Oddiy JSON-fayl ombori (atomik yozish). Kichik va o'rta yuklama uchun yetarli; kerak bo'lsa SQLite ga almashtiriladi.
import fs from 'node:fs';
import path from 'node:path';

export class Store {
  constructor(dir) {
    this.dir = dir; this.file = path.join(dir, 'db.json');
    fs.mkdirSync(dir, { recursive: true });
    this.db = { users: {}, invites: {}, slugs: {}, refs: {}, templates: {}, tracks: {}, promos: {} };
    try { this.db = { ...this.db, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }; } catch (e) { /* yangi baza */ }
    this.timer = null;
  }
  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 300);
  }
  flush() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.db));
    fs.renameSync(tmp, this.file);
  }
}
