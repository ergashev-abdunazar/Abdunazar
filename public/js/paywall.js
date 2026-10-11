// Ochish (to'lov/promokod/kredit) oynasi.
import { core } from './core.js';
import { api } from './api.js';
import { h, modal, toast, fmtMoney } from './ui.js';

const KIND_INFO = {
  img: { title: 'Suv belgisisiz rasm va PDF', desc: 'Yuqori sifatli (2×) PNG/JPG/shaffof PNG va chop etish PDF — suv belgisisiz.', },
  video: { title: 'Suv belgisisiz video', desc: '30 va 60 soniyagacha, Full HD, suv belgisisiz video.' },
  bulk: { title: 'Ko\'p mehmon uchun ZIP', desc: 'Har bir mehmon ismi bilan alohida rasm/PDF va shaxsiy havolalar (.csv).' }
};

/** Qaytaradi Promise<boolean>: ochildimi? */
export function requireUnlock(kind) {
  return new Promise((resolve) => {
    if (core.has(kind)) return resolve(true);
    const info = KIND_INFO[kind]; const price = core.cfg.prices[kind]; const cur = core.cfg.prices.currency;
    let done = false;
    const msg = h('div', { class: 'hint', style: { minHeight: '20px', margin: '8px 0', color: 'var(--err)' } });
    const finish = (ok) => { if (done) return; done = true; m.close(); resolve(ok); };
    const afterUnlock = async () => { await core.refreshMe(); if (core.has(kind)) { toast('Ochildi ✓', 'ok'); finish(true); } };

    const payBtns = core.cfg.providers.map((p) => h('button', {
      class: 'btn primary block', style: { marginBottom: '8px' },
      onclick: async (e) => {
        const btn = e.currentTarget;
        msg.textContent = ''; btn.disabled = true;
        try { await api.pay(core.S.id, kind, p); await afterUnlock(); }
        catch (err) { msg.textContent = err.message; btn.disabled = false; }
      }
    }, `${p[0].toUpperCase() + p.slice(1)} orqali to'lash` + (core.cfg.demoPay ? ' (demo)' : '')));

    const credits = core.me.credits[kind] || 0;
    const creditBtn = credits > 0 ? h('button', {
      class: 'btn gold block', style: { marginBottom: '8px' },
      onclick: async () => { try { await api.unlock(core.S.id, kind); await afterUnlock(); } catch (err) { msg.textContent = err.message; } }
    }, `Kreditdan foydalanish (${credits} ta bor)`) : null;

    const code = h('input', { class: 'input', placeholder: 'Promokod', autocapitalize: 'characters', 'aria-label': 'Promokod' });
    const redeem = h('button', {
      class: 'btn', onclick: async () => {
        msg.textContent = '';
        try { await api.redeem(code.value); await core.refreshMe(); toast('Promokod qabul qilindi', 'ok'); if ((core.me.credits[kind] || 0) > 0) { await api.unlock(core.S.id, kind); await afterUnlock(); } else { msg.textContent = 'Bu promokod boshqa turdagi kredit beradi.'; } }
        catch (err) { msg.textContent = err.message; }
      }
    }, 'Qo\'llash');

    const refLink = core.me.refCode ? `${location.origin}/?ref=${core.me.refCode}` : '';
    const body = h('div', null,
      h('p', { style: { margin: '0 0 12px' } }, info.desc),
      h('div', { class: 'row', style: { marginBottom: '12px' } }, h('span', { class: 'price-tag', style: { fontSize: '24px' } }, fmtMoney(price, cur)), h('span', { class: 'hint' }, 'bir martalik, shu taklifnoma uchun')),
      !core.serverOk ? h('div', { class: 'lock-note' }, 'Server bilan aloqa yo\'q. To\'lov va promokodlar faqat sayt serverga ulanganda ishlaydi.') : null,
      creditBtn, ...payBtns,
      h('div', { class: 'sep' }),
      h('div', { class: 'lbl', style: { marginBottom: '6px' } }, 'Promokodim bor'),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, code), redeem),
      msg,
      refLink ? h('div', { class: 'card', style: { marginTop: '10px', background: 'var(--soft)', border: 0 } },
        h('b', null, 'Do\'stingizni taklif qiling'),
        h('div', { class: 'hint', style: { margin: '4px 0 8px' } }, 'Do\'stingiz saytga shu havola orqali kirsa, sizga 1 ta bepul rasm ochish krediti beriladi.'),
        h('div', { class: 'row' }, h('input', { class: 'input grow', readOnly: true, value: refLink, onfocus: (e) => e.target.select() }),
          h('button', { class: 'btn small', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(refLink).then(() => toast('Nusxalandi')); } }, 'Nusxalash'))) : null);
    const m = modal(info.title, body, { onClose: () => { if (!done) { done = true; resolve(false); } } });
  });
}
