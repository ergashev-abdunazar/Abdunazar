// Google Fonts ulanishi va canvas uchun shriftlarni oldindan yuklash.
import { TEMPLATES, loadTemplateAssets } from './templates.js';

export const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?' + [
  'family=Bricolage+Grotesque:wght@500;800',
  'family=Cinzel:wght@500;700',
  'family=Comfortaa:wght@700',
  'family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700',
  'family=Forum',
  'family=Fredoka:wght@500;700',
  'family=Great+Vibes',
  'family=Jost:wght@300;400;500',
  'family=Manrope:wght@400;500;600;700;800',
  'family=Marck+Script',
  'family=Pinyon+Script',
  'family=Playfair+Display:wght@400;600',
  'family=Unbounded:wght@700',
  'display=swap'
].join('&');

/** Google Fonts stilini sahifaga ulaydi (CSP uchun inline skript kerak emas). */
export function loadGoogleFonts() {
  if (typeof document === 'undefined' || document.getElementById('gf-link')) return;
  const l = document.createElement('link');
  l.id = 'gf-link'; l.rel = 'stylesheet'; l.href = GOOGLE_FONTS_URL;
  document.head.appendChild(l);
}

const SPECS = {
  pinyon: ['400 40px "Pinyon Script"', '400 40px "Great Vibes"', '400 40px "Marck Script"'],
  vibes: ['400 40px "Great Vibes"', '400 40px "Marck Script"'],
  cinzel: ['500 30px Cinzel', '700 30px Cinzel', '400 30px Forum'],
  forum: ['400 30px Forum'],
  corm: ['500 30px "Cormorant Garamond"', '600 30px "Cormorant Garamond"', '700 30px "Cormorant Garamond"',
    'italic 500 30px "Cormorant Garamond"', 'italic 600 30px "Cormorant Garamond"', 'italic 700 30px "Cormorant Garamond"'],
  play: ['400 30px "Playfair Display"', '600 30px "Playfair Display"'],
  jost: ['300 30px Jost', '400 30px Jost', '500 30px Jost', '500 30px Manrope'],
  fred: ['500 30px Fredoka', '700 30px Fredoka', '700 30px Comfortaa'],
  bric: ['500 30px "Bricolage Grotesque"', '800 30px "Bricolage Grotesque"', '500 30px Manrope', '800 30px Manrope'],
  unb: ['700 30px Unbounded', '700 30px Manrope'],
  manr: ['500 30px Manrope', '800 30px Manrope']
};

const SAMPLE_LAT = "Aa Bb Oo Gg 0123 ʻ’' %";
const SAMPLE_CYR = 'Аа Бб Дд Яя Ўў Ғғ Ққ Ҳҳ';

export function fontKeysFor(S) {
  const keys = new Set(TEMPLATES[S.tpl].fonts);
  const f = S.fonts || {};
  if (f.name) keys.add(f.name);
  if (f.body) keys.add(f.body);
  return keys;
}

export async function ensureFonts(S, all = false) {
  loadGoogleFonts();
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return;
  const keys = all ? Object.keys(SPECS) : [...fontKeysFor(S)];
  const sample = SAMPLE_LAT + (S.lang && S.lang !== 'lat' ? ' ' + SAMPLE_CYR : '');
  const jobs = [];
  keys.forEach((k) => (SPECS[k] || []).forEach((spec) => {
    jobs.push(document.fonts.load(spec, sample).catch(() => null));
  }));
  // tarmoq sekin bo'lsa ham to'xtab qolmaslik uchun cheklov
  jobs.push(all ? Promise.resolve() : loadTemplateAssets(S.tpl));
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 8000))]);
}
