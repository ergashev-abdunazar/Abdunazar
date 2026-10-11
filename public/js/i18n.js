// Tillar, lotin <-> kirill transliteratsiyasi, tadbir turlari va tayyor matnlar.

export const LANGS = [
  { id: 'lat', label: 'Lotin' },
  { id: 'cyr', label: 'Кирилл' },
  { id: 'ru', label: 'Русский' }
];

/* ---------------- Transliteratsiya ---------------- */
const APOS = /['’ʼʻ`´‘]/;
const isLetter = (c) => !!c && c.toLowerCase() !== c.toUpperCase();
const isUp = (c) => !!c && c !== c.toLowerCase();
const LAT_VOWELS = 'aeiouAEIOU';

const L2C = {
  a: 'а', b: 'б', c: 'ц', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з'
};

function cased(cyr, upper) {
  return upper ? cyr.toUpperCase() : cyr;
}

export function latToCyr(src) {
  if (!src) return src;
  const s = String(src);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const n = s[i + 1] || '';
    const lo = c.toLowerCase();
    const ln = n.toLowerCase();
    const up = isUp(c);
    const prev = s[i - 1] || '';
    const wordStart = !isLetter(prev) && !APOS.test(prev);

    if (lo === 'o' && APOS.test(n)) { out += cased('ў', up); i++; continue; }
    if (lo === 'g' && APOS.test(n)) { out += cased('ғ', up); i++; continue; }
    if (lo === 's' && ln === 'h') { out += cased('ш', up); i++; continue; }
    if (lo === 'c' && ln === 'h') { out += cased('ч', up); i++; continue; }
    if (lo === 'n' && ln === 'g') {
      out += cased('н', up) + cased('г', isUp(n) && up);
      i++; continue;
    }
    if (lo === 'y' && ln === 'o') { out += cased('ё', up); i++; continue; }
    if (lo === 'y' && ln === 'u') { out += cased('ю', up); i++; continue; }
    if (lo === 'y' && ln === 'a') { out += cased('я', up); i++; continue; }
    if (lo === 'y' && ln === 'e') { out += cased('е', up); i++; continue; }
    if (lo === 'e') { out += cased(wordStart ? 'э' : 'е', up); continue; }
    if (APOS.test(c)) { out += (isLetter(prev) ? 'ъ' : c); continue; }
    if (L2C[lo]) { out += cased(L2C[lo], up); continue; }
    out += c;
  }
  return out;
}

const C2L = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ы: 'i', э: 'e', ю: 'yu', я: 'ya', ё: 'yo', ў: "o'", қ: 'q', ғ: "g'", ҳ: 'h',
  ъ: "'", ь: ''
};
const CYR_VOWELS = 'аеёиоуэюяўыАЕЁИОУЭЮЯЎЫ';

export function cyrToLat(src) {
  if (!src) return src;
  const s = String(src);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const lo = c.toLowerCase();
    const up = isUp(c);
    const prev = s[i - 1] || '';
    const next = s[i + 1] || '';
    let m;
    if (lo === 'е') {
      const after = !isLetter(prev) || CYR_VOWELS.includes(prev) || 'ъьЪЬ'.includes(prev);
      m = after ? 'ye' : 'e';
    } else if (lo in C2L) {
      m = C2L[lo];
    } else {
      out += c; continue;
    }
    if (!m) continue;
    if (up) {
      const allCaps = (isUp(next) && isLetter(next)) || (isUp(prev) && isLetter(prev));
      m = allCaps ? m.toUpperCase() : m.charAt(0).toUpperCase() + m.slice(1);
    }
    out += m;
  }
  return out;
}

/** Matnni bir yozuvdan boshqasiga o'tkazish (lat <-> cyr). Rus tiliga tegmaydi. */
export function convertText(s, from, to) {
  if (!s || from === to) return s;
  if (from === 'lat' && (to === 'cyr' || to === 'ru')) return latToCyr(s);
  if (from === 'cyr' && to === 'lat') return cyrToLat(s);
  if (from === 'ru' && to === 'lat') return cyrToLat(s);
  return s;
}

/* ---------------- Yorliqlar ---------------- */
export const LABELS = {
  lat: {
    hurmatli: 'Hurmatli', manzil: 'MANZIL', sana: 'SANA', vaqt: 'VAQT', hurmat: 'HURMAT BILAN',
    hurmatS: 'Hurmat bilan:', tashkilotchi: 'TASHKILOTCHI', soat: (t) => 'soat ' + t, scan: 'Skaner qiling',
    months: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
    days: ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']
  },
  cyr: {
    hurmatli: 'Ҳурматли', manzil: 'МАНЗИЛ', sana: 'САНА', vaqt: 'ВАҚТ', hurmat: 'ҲУРМАТ БИЛАН',
    hurmatS: 'Ҳурмат билан:', tashkilotchi: 'ТАШКИЛОТЧИ', soat: (t) => 'соат ' + t, scan: 'Сканер қилинг',
    months: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'],
    days: ['якшанба', 'душанба', 'сешанба', 'чоршанба', 'пайшанба', 'жума', 'шанба']
  },
  ru: {
    hurmatli: 'Уважаемый(ая)', manzil: 'АДРЕС', sana: 'ДАТА', vaqt: 'ВРЕМЯ', hurmat: 'С УВАЖЕНИЕМ',
    hurmatS: 'С уважением:', tashkilotchi: 'ОРГАНИЗАТОР', soat: (t) => 'в ' + t, scan: 'Наведите камеру',
    months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    days: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
  }
};

/* ---------------- Tadbir turlari ---------------- */
// groups: interfeysdagi guruhlar. flags: qaysi maydonlar kerak.
const FULL = { date: true, time: true, venue: true, host: true };
const GREET = { date: false, time: false, venue: false, host: true };

export const TYPE_GROUPS = [
  { id: 'toy', label: "To'y marosimlari" },
  { id: 'kun', label: "Tug'ilgan kun va yubiley" },
  { id: 'tadbir', label: 'Tadbirlar' },
  { id: 'bayram', label: 'Bayram tabriklari' }
];

export const TYPES = {
  nikoh: {
    group: 'toy', label: "Nikoh to'yi", tpl: 'atlas', flags: FULL, l1: 'Kuyov ismi', l2: 'Kelin ismi',
    head: { lat: "NIKOH TO'YIGA TAKLIFNOMA", ru: 'ПРИГЛАШЕНИЕ НА СВАДЬБУ' },
    n1: { lat: 'Anvar', ru: 'Анвар' }, n2: { lat: 'Dilnoza', ru: 'Дилноза' },
    msgs: {
      lat: [
        "Hayotimizning eng baxtli kunini siz bilan birga nishonlashni istaymiz. Sizni nikoh to'yimizga taklif qilamiz.",
        "Ikki yurak bir bo'ldi. Quvonchimizga sherik bo'lish uchun to'yimizga marhamat qiling.",
        "Baxtli kunimizda yonimizda bo'lishingiz biz uchun katta sharaf."
      ],
      ru: [
        'Мы хотим разделить с вами самый счастливый день нашей жизни. Приглашаем вас на нашу свадьбу.',
        'Два сердца стали одним. Будем рады видеть вас на нашем торжестве.',
        'Для нас большая честь видеть вас рядом в этот счастливый день.'
      ]
    }
  },
  qiz: {
    group: 'toy', label: "Qiz uzatish to'yi", tpl: 'suzani', flags: FULL, l1: 'Kelin ismi', l2: 'Kuyov ismi',
    head: { lat: "QIZ UZATISH TO'YIGA TAKLIFNOMA", ru: 'ПРИГЛАШЕНИЕ НА КЫЗ-УЗАТИШ' },
    n1: { lat: 'Dilnoza', ru: 'Дилноза' }, n2: { lat: 'Anvar', ru: 'Анвар' },
    msgs: {
      lat: [
        "Qizimizning baxtli kunida siz bilan birga bo'lishdan xursand bo'lamiz. Marhamat qilib tashrif buyuring.",
        "Oilamiz quvonchiga sherik bo'lishingizni so'raymiz. Qiz uzatish to'yimizga xush kelibsiz.",
        "Farzandimizga oq yo'l tilab, to'yimizga sizni taklif etamiz."
      ],
      ru: [
        'Мы будем рады разделить с вами счастливый день нашей дочери. Добро пожаловать.',
        'Просим вас стать частью радости нашей семьи. Приглашаем на торжество.',
        'Провожая дочь в добрый путь, мы приглашаем вас на наш праздник.'
      ]
    }
  },
  sunnat: {
    group: 'toy', label: "Sunnat to'yi", tpl: 'quvnoq', flags: FULL, l1: 'Farzand ismi', l2: null,
    head: { lat: "SUNNAT TO'YIGA TAKLIFNOMA", ru: 'ПРИГЛАШЕНИЕ НА СУННАТ-ТОЙ' },
    n1: { lat: 'Muhammadali', ru: 'Мухаммадали' },
    msgs: {
      lat: [
        "Farzandimizning sunnat to'yiga sizni mehmon bo'lib kelishingizni so'raymiz.",
        "Quvonchli kunimizda dasturxonimizga marhamat qiling.",
        "Kichkina qahramonimizning katta bayramiga xush kelibsiz!"
      ],
      ru: [
        'Просим вас быть гостем на сунат-той нашего сына.',
        'Приглашаем вас за наш стол в радостный для нас день.',
        'Добро пожаловать на большой праздник нашего маленького героя!'
      ]
    }
  },
  beshik: {
    group: 'toy', label: "Beshik to'yi (chaqaloq)", tpl: 'quvnoq', flags: FULL, l1: 'Chaqaloq ismi', l2: null,
    head: { lat: "BESHIK TO'YIGA TAKLIFNOMA", ru: 'ПРИГЛАШЕНИЕ НА БЕШИК-ТОЙ' },
    n1: { lat: 'Zarina', ru: 'Зарина' },
    msgs: {
      lat: [
        "Oilamizga chaqaloq tashrif buyurdi. Quvonchimizga sherik bo'lishingizni so'raymiz.",
        "Kichik farishtamizning beshik to'yiga xush kelibsiz.",
        "Yangi hayot, yangi quvonch. Sizni kutib qolamiz."
      ],
      ru: [
        'В нашей семье родился малыш. Просим разделить нашу радость.',
        'Добро пожаловать на бешик-той нашего маленького ангела.',
        'Новая жизнь, новая радость. Будем ждать вас.'
      ]
    }
  },
  tugilgan: {
    group: 'kun', label: "Tug'ilgan kun", tpl: 'quvnoq', flags: FULL, l1: 'Ism', l2: null,
    head: { lat: "TUG'ILGAN KUN TAKLIFNOMASI", ru: 'ПРИГЛАШЕНИЕ НА ДЕНЬ РОЖДЕНИЯ' },
    n1: { lat: 'Madina', ru: 'Мадина' },
    msgs: {
      lat: [
        "Tug'ilgan kunimni siz bilan birga nishonlamoqchiman. Kelishingizni intizorlik bilan kutaman!",
        "Shirinliklar, o'yin-kulgi va yaxshi kayfiyat sizni kutmoqda. Marhamat!",
        "Quvonchli kunimizda biz bilan birga bo'ling."
      ],
      ru: [
        'Хочу отпраздновать свой день рождения вместе с вами. Жду с нетерпением!',
        'Сладости, веселье и отличное настроение ждут вас. Приходите!',
        'Будьте с нами в этот радостный день.'
      ]
    }
  },
  yubiley: {
    group: 'kun', label: 'Yubiley', tpl: 'oltin', flags: FULL, l1: 'Yubilyar ismi', l2: null,
    head: { lat: 'YUBILEYGA TAKLIFNOMA', ru: 'ПРИГЛАШЕНИЕ НА ЮБИЛЕЙ' },
    n1: { lat: 'Hamida opa', ru: 'Хамида опа' },
    msgs: {
      lat: [
        "Yubiley kechamizda sizni ko'rishdan xursand bo'lamiz. Marhamat qilib tashrif buyuring.",
        "Bir umrlik yutuqlar va quvonchlar bayramiga xush kelibsiz.",
        "Aziz mehmon, bu kunni siz bilan birga o'tkazishni istaymiz."
      ],
      ru: [
        'Будем рады видеть вас на нашем юбилейном вечере. Добро пожаловать.',
        'Добро пожаловать на праздник достижений и радости длиною в жизнь.',
        'Дорогой гость, мы хотим провести этот день вместе с вами.'
      ]
    }
  },
  bitiruv: {
    group: 'kun', label: 'Bitiruv kechasi', tpl: 'oltin', flags: FULL, l1: 'Sinf / guruh nomi', l2: null,
    head: { lat: 'BITIRUV KECHASIGA TAKLIFNOMA', ru: 'ПРИГЛАШЕНИЕ НА ВЫПУСКНОЙ' },
    n1: { lat: "11-sinf bitiruvchilari", ru: 'Выпускники 11 класса' },
    msgs: {
      lat: [
        "Maktab hayotining so'nggi qo'ng'irog'i. Bu unutilmas kechani siz bilan o'tkazmoqchimiz.",
        "Yangi yo'llar boshlanishi arafasida sizni bitiruv kechamizga taklif qilamiz.",
        "Birga o'tgan yillar xotirasiga bag'ishlangan kechaga marhamat."
      ],
      ru: [
        'Последний звонок школьной жизни. Хотим провести этот вечер вместе с вами.',
        'Накануне новых дорог приглашаем вас на наш выпускной.',
        'Приглашаем на вечер, посвящённый годам, прожитым вместе.'
      ]
    }
  },
  korp: {
    group: 'tadbir', label: 'Korporativ tadbir', tpl: 'tadbir', flags: FULL, l1: 'Tadbir nomi', l2: null,
    head: { lat: 'TADBIRGA TAKLIFNOMA', ru: 'ПРИГЛАШЕНИЕ НА МЕРОПРИЯТИЕ' },
    n1: { lat: 'Yillik hamkorlar forumi 2026', ru: 'Ежегодный форум партнёров 2026' },
    msgs: {
      lat: [
        "Sizni tadbirimizda ko'rishdan xursand bo'lamiz. Ro'yxatdan o'tish uchun vaqtida keling.",
        "Hamkorlik va yangi imkoniyatlar kechasiga marhamat.",
        "Bu kunni birga o'tkazamiz. Sizni kutamiz!"
      ],
      ru: [
        'Будем рады видеть вас на нашем мероприятии. Пожалуйста, приходите вовремя.',
        'Приглашаем на вечер сотрудничества и новых возможностей.',
        'Проведём этот день вместе. Ждём вас!'
      ]
    }
  },
  mavlud: {
    group: 'tadbir', label: 'Mavlud / xatm marosimi', tpl: 'hayit', flags: FULL, l1: 'Marosim nomi', l2: null,
    head: { lat: 'MAROSIMGA TAKLIF', ru: 'ПРИГЛАШЕНИЕ НА МАРОСИМ' },
    n1: { lat: 'Mavlud marosimi', ru: 'Мавлид' },
    msgs: {
      lat: [
        "Xonadonimizda o'tkaziladigan savob marosimiga sizni taklif qilamiz.",
        "Duoyi xayr uchun marhamat qilib tashrif buyuring.",
        "Ezgu marosimimizda ishtirok etishingizni so'raymiz."
      ],
      ru: [
        'Приглашаем вас на благочестивое мероприятие в нашем доме.',
        'Просим вас прийти для общей молитвы и добрых слов.',
        'Просим вас принять участие в нашем благом собрании.'
      ]
    }
  },
  iftor: {
    group: 'tadbir', label: 'Ramazon iftorligi', tpl: 'hayit', flags: FULL, l1: 'Sarlavha', l2: null,
    head: { lat: 'IFTORLIKKA TAKLIFNOMA', ru: 'ПРИГЛАШЕНИЕ НА ИФТАР' },
    n1: { lat: 'Iftorlik dasturxoni', ru: 'Ифтар' },
    msgs: {
      lat: [
        "Muborak Ramazon oyida dasturxonimizga marhamat qiling.",
        "Birga og'iz ochamiz. Sizni iftorlikka kutamiz.",
        "Ramazon barakasi xonadoningizga kirsin. Iftorligimizga xush kelibsiz."
      ],
      ru: [
        'Приглашаем вас за наш стол в священный месяц Рамадан.',
        'Разговеемся вместе. Ждём вас на ифтар.',
        'Пусть барака Рамадана войдёт в ваш дом. Добро пожаловать на ифтар.'
      ]
    }
  },
  navruz: {
    group: 'bayram', label: "Navro'z tabrigi", tpl: 'navruz', flags: GREET, l1: 'Bosh matn', l2: null,
    head: { lat: 'TABRIK', ru: 'ПОЗДРАВЛЕНИЕ' },
    n1: { lat: "Navro'z muborak!", ru: 'С Наврузом!' },
    msgs: {
      lat: [
        "Bahor kelishi bilan uyingizga baraka, dilingizga quvonch kirsin.",
        "Navro'z bayrami barchamizga tinchlik va farovonlik olib kelsin.",
        "Yangi kun, yangi umid. Navro'z bayramingiz muborak bo'lsin!"
      ],
      ru: [
        'Пусть с приходом весны в ваш дом придёт достаток, а в сердце радость.',
        'Пусть праздник Навруз принесёт всем нам мир и благополучие.',
        'Новый день, новая надежда. Пусть ваш Навруз будет светлым!'
      ]
    }
  },
  hayit: {
    group: 'bayram', label: 'Hayit tabrigi', tpl: 'hayit', flags: GREET, l1: 'Bosh matn', l2: null,
    head: { lat: 'TABRIK', ru: 'ПОЗДРАВЛЕНИЕ' },
    n1: { lat: 'Hayit muborak!', ru: 'Ид Мубарак!' },
    msgs: {
      lat: [
        "Hayit bayramingiz muborak bo'lsin. Ibodatlaringiz qabul bo'lsin.",
        "Oilangizga sihat-salomatlik, xonadoningizga baraka tilaymiz.",
        "Bu muborak kun hayotingizga nur va quvonch olib kelsin."
      ],
      ru: [
        'Поздравляем с праздником. Пусть ваши молитвы будут приняты.',
        'Желаем вашей семье здоровья, а вашему дому достатка.',
        'Пусть этот благословенный день принесёт в вашу жизнь свет и радость.'
      ]
    }
  },
  yangiyil: {
    group: 'bayram', label: 'Yangi yil tabrigi', tpl: 'yangiyil', flags: GREET, l1: 'Bosh matn', l2: null,
    head: { lat: 'TABRIK', ru: 'ПОЗДРАВЛЕНИЕ' },
    n1: { lat: 'Yangi yil bilan!', ru: 'С Новым годом!' },
    msgs: {
      lat: [
        "Yangi yil sizga omad, sog'liq va baxt olib kelsin.",
        "Barcha orzularingiz kelgusi yilda ushalsin!",
        "Qor, kulgu va issiq suhbatlarga boy yangi yil tilaymiz."
      ],
      ru: [
        'Пусть Новый год принесёт вам удачу, здоровье и счастье.',
        'Пусть все ваши мечты сбудутся в новом году!',
        'Желаем нового года, полного снега, смеха и тёплых бесед.'
      ]
    }
  },
  mart8: {
    group: 'bayram', label: '8-mart tabrigi', tpl: 'mart8', flags: GREET, l1: 'Bosh matn', l2: null,
    head: { lat: 'TABRIK', ru: 'ПОЗДРАВЛЕНИЕ' },
    n1: { lat: '8-mart bayrami muborak!', ru: 'С 8 Марта!' },
    msgs: {
      lat: [
        "Aziz ayollarimiz, sizga sog'liq, baxt va cheksiz iliqlik tilaymiz.",
        "Sizning mehringiz bilan hayot go'zal. Bayramingiz muborak!",
        "Bahor kabi go'zal, gul kabi nafis bo'ling."
      ],
      ru: [
        'Дорогие женщины, желаем вам здоровья, счастья и безграничного тепла.',
        'Жизнь прекрасна благодаря вашей заботе. С праздником!',
        'Будьте прекрасны, как весна, и нежны, как цветы.'
      ]
    }
  },
  ustozlar: {
    group: 'bayram', label: 'Ustozlar kuni tabrigi', tpl: 'minimal', flags: GREET, l1: 'Bosh matn', l2: null,
    head: { lat: 'TABRIK', ru: 'ПОЗДРАВЛЕНИЕ' },
    n1: { lat: 'Ustozlar kuni muborak!', ru: 'С Днём учителя!' },
    msgs: {
      lat: [
        "Bergan ilmingiz va mehringiz uchun cheksiz rahmat. Bayramingiz muborak!",
        "Ustoz, siz bilan hayotimiz yorug'. Sizga sog'liq va baxt tilaymiz.",
        "Har bir muvaffaqiyatimizda sizning hissangiz bor."
      ],
      ru: [
        'Огромное спасибо за ваши знания и заботу. С праздником!',
        'Учитель, с вами наша жизнь светла. Желаем вам здоровья и счастья.',
        'В каждом нашем успехе есть ваш вклад.'
      ]
    }
  }
};

export const TYPE_IDS = Object.keys(TYPES);

/** Ma'lum til uchun tadbir matnlari (kirill = lotinni o'tkazish). */
export function typeText(typeId, field, lang) {
  const t = TYPES[typeId];
  const src = t[field];
  if (!src) return '';
  if (lang === 'ru') return src.ru;
  if (lang === 'cyr') return latToCyr(src.lat);
  return src.lat;
}

export function typeMsgs(typeId, lang) {
  const t = TYPES[typeId];
  if (lang === 'ru') return t.msgs.ru;
  if (lang === 'cyr') return t.msgs.lat.map(latToCyr);
  return t.msgs.lat;
}

/** Sana va tilga qarab ko'rinadigan qatorlar. */
export function deriveText(S) {
  const T = TYPES[S.type];
  const L = LABELS[S.lang] || LABELS.lat;
  const D = {
    L,
    head: typeText(S.type, 'head', S.lang),
    hasN2: !!T.l2,
    flags: T.flags,
    d: null,
    sub: ''
  };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(S.date || '');
  if (m && T.flags.date) {
    const dt = new Date(+m[1], +m[2] - 1, +m[3]);
    D.d = { day: m[3], month: L.months[+m[2] - 1] || '', year: m[1], weekday: L.days[dt.getDay()] || '' };
  }
  const parts = [];
  if (D.d) parts.push(D.d.weekday.charAt(0).toUpperCase() + D.d.weekday.slice(1));
  if (S.time && T.flags.time) parts.push(L.soat(S.time));
  D.sub = parts.join(' · ');
  return D;
}
