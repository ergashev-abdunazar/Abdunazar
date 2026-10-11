// Minimal PDF yozuvchi: JPEG rasm + kesish belgilari (crop marks) + kesish chiziqlari.
// Hech qanday kutubxona kerak emas.
const MM = 72 / 25.4;
const f2 = (n) => (Math.round(n * 1000) / 1000).toString();

export const PDF_LAYOUTS = {
  a5: { label: 'A5 (148×210 mm), kesish belgilari bilan', trimW: 148, trimH: 210, bleed: 3, margin: 10, per: 1 },
  a6: { label: 'A6 (105×148 mm), kesish belgilari bilan', trimW: 105, trimH: 148, bleed: 3, margin: 10, per: 1 },
  a4x4: { label: 'A4 ga 4 ta A6 (kesish chiziqlari)', trimW: 105, trimH: 148.5, bleed: 0, margin: 0, per: 4, page: [210, 297] }
};

/** Past darajali: sahifalar [{ w, h (pt), content (string), images: [{name, jpeg, width, height}], trim? }] */
export function buildPdf(pages, meta = {}) {
  const enc = new TextEncoder();
  const chunks = []; let size = 0;
  const offs = [];
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); size += b.length; };
  const obj = (id, body) => { offs[id] = size; push(`${id} 0 obj\n`); if (typeof body === 'string') push(body); else body.forEach(push); push('\nendobj\n'); };

  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  let next = 1;
  const catalogId = next++, pagesId = next++, infoId = next++;
  const pageIds = [];
  const objs = []; // keyin yoziladi
  for (const pg of pages) {
    const pid = next++, cid = next++;
    const imgIds = pg.images.map(() => next++);
    objs.push({ pid, cid, imgIds, pg });
    pageIds.push(pid);
  }
  obj(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  obj(pagesId, `<< /Type /Pages /Kids [${pageIds.map((i) => i + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`);
  const esc = (s) => '(' + String(s).replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, '?') + ')';
  obj(infoId, `<< /Producer ${esc(meta.producer || 'Taklifnoma Studiyasi')} /Title ${esc(meta.title || 'Taklifnoma')} >>`);
  for (const { pid, cid, imgIds, pg } of objs) {
    const xo = pg.images.map((im, i) => `/${im.name} ${imgIds[i]} 0 R`).join(' ');
    const t = pg.trim;
    const boxes = t ? ` /TrimBox [${f2(t[0])} ${f2(t[1])} ${f2(t[2])} ${f2(t[3])}] /BleedBox [${f2(pg.bleedBox[0])} ${f2(pg.bleedBox[1])} ${f2(pg.bleedBox[2])} ${f2(pg.bleedBox[3])}]` : '';
    obj(pid, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${f2(pg.w)} ${f2(pg.h)}]${boxes} /Resources << /XObject << ${xo} >> >> /Contents ${cid} 0 R >>`);
    const cs = enc.encode(pg.content);
    obj(cid, [`<< /Length ${cs.length} >>\nstream\n`, cs, '\nendstream']);
    pg.images.forEach((im, i) => {
      obj(imgIds[i], [`<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>\nstream\n`, im.jpeg, '\nendstream']);
    });
  }
  const xrefAt = size;
  push(`xref\n0 ${next}\n0000000000 65535 f \n`);
  for (let i = 1; i < next; i++) push(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${next} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  const out = new Uint8Array(size); let p = 0; for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

// rasmni (iw×ih) [x,y,w,h] to'rtburchakka "cover" tarzida joylaydi (ortiqchasi qirqiladi)
function placeCover(name, iw, ih, x, y, w, h) {
  const s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  return `q ${f2(x)} ${f2(y)} ${f2(w)} ${f2(h)} re W n ${f2(dw)} 0 0 ${f2(dh)} ${f2(dx)} ${f2(dy)} cm /${name} Do Q\n`;
}

function cropMarks(x0, y0, x1, y1, gap, len) {
  // (x0,y0)-(x1,y1) – kesish (trim) to'rtburchagi. Belgilar to'rt burchakda, kesim chizig'idan `gap` uzoqda.
  let s = 'q 0 0 0 0 K 0.35 w\n';
  const L = (a, b, c, d) => { s += `${f2(a)} ${f2(b)} m ${f2(c)} ${f2(d)} l S\n`; };
  [[x0, -1], [x1, 1]].forEach(([x, sx]) => [[y0, -1], [y1, 1]].forEach(([y, sy]) => {
    L(x + sx * gap, y, x + sx * (gap + len), y);
    L(x, y + sy * gap, x, y + sy * (gap + len));
  }));
  return s + 'Q\n';
}

/**
 * images: [{ jpeg: Uint8Array, width, height }] (har sahifa uchun bitta).
 * layout: 'a5' | 'a6' | 'a4x4'. Qaytaradi Uint8Array.
 */
export function makePrintPdf(images, layout = 'a5', meta = {}) {
  const L = PDF_LAYOUTS[layout] || PDF_LAYOUTS.a5;
  const pages = [];
  if (L.per === 1) {
    const pw = (L.trimW + 2 * L.margin) * MM, ph = (L.trimH + 2 * L.margin) * MM;
    const tx = L.margin * MM, ty = L.margin * MM, tw = L.trimW * MM, th = L.trimH * MM, b = L.bleed * MM;
    images.forEach((im) => {
      let c = placeCover('Im0', im.width, im.height, tx - b, ty - b, tw + 2 * b, th + 2 * b);
      // chekkadan chiqqan qismni oq bilan emas, belgilar tashqarisida qoldiramiz
      c += cropMarks(tx, ty, tx + tw, ty + th, b + 1 * MM, 4 * MM);
      pages.push({ w: pw, h: ph, content: c, images: [{ name: 'Im0', jpeg: im.jpeg, width: im.width, height: im.height }],
        trim: [tx, ty, tx + tw, ty + th], bleedBox: [tx - b, ty - b, tx + tw + b, ty + th + b] });
    });
  } else {
    const [pwmm, phmm] = L.page;
    const pw = pwmm * MM, ph = phmm * MM, cw = L.trimW * MM, ch = L.trimH * MM;
    const ox = (pw - 2 * cw) / 2, oy = (ph - 2 * ch) / 2;
    for (let i = 0; i < images.length; i += 4) {
      const group = images.slice(i, i + 4);
      let c = ''; const ims = [];
      group.forEach((im, k) => {
        const col = k % 2, row = Math.floor(k / 2);
        const x = ox + col * cw, y = oy + (1 - row) * ch;
        const name = 'Im' + k;
        c += placeCover(name, im.width, im.height, x, y, cw, ch);
        ims.push({ name, jpeg: im.jpeg, width: im.width, height: im.height });
      });
      // kesish chiziqlari (ingichka, och kulrang) + chetda kichik belgilar
      c += 'q 0.55 G 0.3 w [3 3] 0 d\n';
      c += `${f2(ox + cw)} ${f2(oy - 6 * MM)} m ${f2(ox + cw)} ${f2(oy + 2 * ch + 6 * MM)} l S\n`;
      c += `${f2(ox - 6 * MM)} ${f2(oy + ch)} m ${f2(ox + 2 * cw + 6 * MM)} ${f2(oy + ch)} l S\n`;
      c += `${f2(ox)} ${f2(oy - 6 * MM)} m ${f2(ox)} ${f2(oy)} l S ${f2(ox + 2 * cw)} ${f2(oy - 6 * MM)} m ${f2(ox + 2 * cw)} ${f2(oy)} l S\n`;
      c += `${f2(ox)} ${f2(oy + 2 * ch)} m ${f2(ox)} ${f2(oy + 2 * ch + 6 * MM)} l S ${f2(ox + 2 * cw)} ${f2(oy + 2 * ch)} m ${f2(ox + 2 * cw)} ${f2(oy + 2 * ch + 6 * MM)} l S\n`;
      c += 'Q\n';
      pages.push({ w: pw, h: ph, content: c, images: ims });
    }
  }
  return buildPdf(pages, meta);
}
