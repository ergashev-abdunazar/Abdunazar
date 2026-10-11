// Server bergan maxsus (admin yuklagan) shablonlarni yuklaydi.
import { registerCustomTemplates } from './templates.js';
export async function loadCustomTemplates() {
  try {
    const r = await fetch('/api/templates', { credentials: 'same-origin' });
    if (!r.ok) return [];
    const { templates } = await r.json();
    registerCustomTemplates(templates);
    return templates;
  } catch (e) { return []; }
}
