# Taklifnoma Studiyasi

Foydalanuvchilar tayyor shablonni tanlab, matnni o'zlari tahrirlaydigan va natijani **PNG/JPG, Story/post/gorizontal rasm, shaffof PNG, animatsiyali MP4 video, chop etish PDF, ZIP (ko'p mehmon), jonli havola va QR** ko'rinishida oladigan sayt.

Hech qanday tashqi paket kerak emas (`npm install` shart emas): faqat **Node.js 18+**. MP4 konvertatsiyasi uchun ixtiyoriy ravishda **ffmpeg**.

## Ishga tushirish

```bash
node server.js                  # http://localhost:3000
npm run dev                     # demo to'lov va demo promokodlar bilan
```

Muhit o'zgaruvchilari:

| O'zgaruvchi | Ma'nosi | Standart |
|---|---|---|
| `PORT` | port | 3000 |
| `BASE_URL` | saytning to'liq manzili (`https://sayt.uz`), OG-rasm va havolalar uchun | so'rovdan olinadi |
| `SITE_NAME`, `SITE_DOMAIN` | sayt nomi va suv belgisidagi domen | Taklifnoma Studiyasi / taklifnoma.uz |
| `DATA_DIR` | baza va yuklangan fayllar | `./data` |
| `FFMPEG_PATH` | ffmpeg yo'li | `ffmpeg` (PATH dan) |
| `PRICE_IMG`, `PRICE_VIDEO`, `PRICE_BULK` | narxlar (so'm) | 15000 / 25000 / 40000 |
| `PROMO_CODES` | `KOD=img:2,video:1,bulk:1;KOD2=...` | bo'sh |
| `ADMIN_PASSWORD` | admin paroli (≥10 belgi). Bo'sh bo'lsa tasodifiy parol `data/admin-first-password.txt` ga yoziladi | — |
| `HOST` | tinglash manzili (`127.0.0.1` — faqat proksi uchun) | 0.0.0.0 |
| `DEMO_PAY=1` | **faqat sinov uchun**: to'lov tugmasi darrov ochadi | o'chiq |
| `TRUST_PROXY=1` | Nginx/Cloudflare orqasida `X-Forwarded-*` ni hisobga olish | o'chiq |

**Internetga chiqarish:** [DEPLOY.md](DEPLOY.md) (Docker + Caddy HTTPS, yoki systemd).

Productionda: HTTPS (Nginx/Caddy) orqasida ishga tushiring, `BASE_URL=https://...` bering, `DEMO_PAY` ni **yoqmang**, `DATA_DIR` ni zaxiralab turing.

## Foydalanuvchi nima qila oladi

- **Shablon**: 10 ta (Atlas, Suzani, Oltin, Minimal, Quvnoq, Tadbir, Navro'z, Hayit, Yangi yil, 8-mart) × 15 ta tadbir turi (nikoh, qiz uzatish, sunnat, beshik, tug'ilgan kun, yubiley, bitiruv, korporativ, mavlud, iftor, Navro'z, Hayit, Yangi yil, 8-mart, Ustozlar kuni).
- **Matn**: ism, sana, vaqt, manzil, taklif matni; **Lotin / Кирилл / Русский** (tayyor matnlar tarjima, ismlar transliteratsiya qilinadi).
- **Dizayn**: rang uslublari, o'z ranglari, shriftlar, formatlar (Story 9:16, 4:5, 1:1, 16:9, chop).
- **Elementlar**: stikerlar (lola, anor, paxta, ikat, hilol…), rasm ramkalari (doira, mehrob, oval, yurak…), QR kod; surish, kattalashtirish, burish (sichqoncha va barmoq), bekor qilish/qaytarish, avtomatik saqlash (brauzerda).
- **Yuklash**: PNG/JPG/shaffof PNG (1× va 2×), tez o'lchamlar; video 7/15/30/60 s (tayyor 5 ta musiqa, o'z musiqasi, mikrofon bilan ovozli tabrik); PDF A5/A6 (3 mm bleed + kesish belgilari) va A4 ga 4 tadan; ZIP — har bir mehmon ismi bilan.
- **Ulashish**: jonli havola (`/i/nom`), QR (PNG), Telegram, WhatsApp, Facebook, SMS, Instagram (telefonda ulashish oynasi orqali), shaxsiy mehmon havolalari (`?g=Ism`) va CSV, RSVP ro'yxati.
- **Jonli sahifa**: konvert ochilishi, animatsiya, musiqa, tadbirgacha sanoq (Toshkent vaqti), Yandex/Google/2GIS xaritasi, Google Calendar + .ics, RSVP formasi, OG-ko'rinish (Telegram/WhatsApp havola kartochkasi).

## Admin panel (`/admin`)

Parol bilan kiriladi (HMAC cookie, 12 soat). Admin muharrirda **hamma narsa ochiq va suv belgisiz**.

- **Shablonlar**: o'zingizning **rasm** (Story/1:1/16:9 uchun alohida) yoki **video** fon yuklaysiz; ko'rinish oynasida matn joyini (to'rtburchak) sudrab belgilaysiz, matn kattaligi, ranglar, shriftlar, qoplama va effekt (yulduzcha, qor, gul bargi…) tanlaysiz → saqlansa, hamma foydalanuvchilar muharrir, video va jonli havolada ishlatadi. Video fon uchun H.264 MP4 tavsiya etiladi (poster kadri avtomatik olinadi; brauzer o'qiy olmasa serverdagi ffmpeg oladi).
- **Qo'shiqlar**: mp3/m4a/wav/ogg yuklang — foydalanuvchilar video va jonli sahifa musiqasida tanlaydi.
- **Promokodlar** (limit bilan), **Taklifnomalar** (ro'yxat/o'chirish), **Statistika**, **Parolni o'zgartirish**.

API: `GET /api/templates`, `GET /api/tracks` (ochiq); `/api/admin/*` (login, upload, templates, tracks, promos, invites, stats, password, poster) faqat admin cookie bilan.

## Daromad modeli (kodda)

Bepul: barcha shablonlar, suv belgisi bilan 1× rasm/PDF, 15 s gacha suv belgili video. Pullik (har biri **shu taklifnoma uchun** bir martalik): `img` (suv belgisiz, 2×, PDF), `video` (suv belgisiz, 30/60 s, Full HD), `bulk` (ZIP). Kredit/promokod/referal (`/?ref=KOD` orqali kirgan do'st → 1 ta rasm krediti) tayyor.

## ⚠️ Muhim cheklovlar (halol)

1. **To'lov tizimlari ulanmagan.** `Click / Payme / Uzum` tugmalari `501` qaytaradi (yoki `DEMO_PAY=1` bo'lsa demo ochadi). Haqiqiy to'lov uchun merchant shartnomasi va kalitlar kerak; `server.js` dagi `/api/pay` ga provayderning "invoice yaratish" va webhook (`prepare/complete`) qismlarini qo'shish kerak. Hozircha pul olish uchun `PROMO_CODES` bilan qo'lda sotish mumkin.
2. **Suv belgisi mijoz tomonda** chiziladi — texnik bilimli foydalanuvchi uni aylanib o'tishi mumkin. Jiddiy himoya kerak bo'lsa, yakuniy renderni serverga (headless brauzer) ko'chirish kerak.
3. **Video real vaqtda yoziladi** (MediaRecorder): 30 s video ≈ 30 s kutish, yozish paytida brauzer tabi ochiq turishi kerak. Brauzer ko'pincha VP9 beradi; ffmpeg bo'lsa server uni H.264/AAC MP4 ga aylantiradi (iPhone/Telegram uchun). ffmpeg bo'lmasa fayl WebM/VP9 bo'ladi.
4. **Instagram**: veb-sayt Instagram'ga to'g'ridan-to'g'ri joylay olmaydi; telefonda "ulashish" oynasi orqali yuboriladi, kompyuterda rasm yuklanadi.
5. **Kirill/rus shriftlari**: Google Fonts orqali yuklanadi. Ba'zi bezakli shriftlarda (Pinyon, Great Vibes) kirill harflari yo'q — zaxira shrift ishlaydi. Har bir shablonni kirill/ruscha matn bilan ko'zdan kechiring.
6. Ma'lumotlar bazasi — oddiy JSON fayl (kichik/o'rta yuklama uchun). Katta yuklamada SQLite/Postgres ga o'tkazing (`lib/store.js`).
7. Foydalanuvchi hisobi yo'q: kredit va ochilgan loyihalar brauzer cookie'siga (`cid`) bog'langan; cookie o'chsa, ochilgan narsalar yo'qoladi. Kerak bo'lsa telefon/Telegram orqali kirish qo'shiladi.

## Tuzilma

```
server.js            HTTP server, API, statik fayllar, /i/:slug (OG meta)
lib/                 store.js (JSON baza), sanitize.js (kiruvchi ma'lumotni tozalash)
public/
  index.html editor.html invite.html, css/app.css
  js/  i18n state layout templates draw items qr render fonts   — dizayn dvigateli
       anim audio video pdf zip exporters api                    — eksport
       core stage panels-*.js editor.js paywall ui               — muharrir
       invite.js landing.js
lib/admin.js         admin parol (scrypt), sessiya, shablon tekshiruvi
deploy/ Dockerfile docker-compose.yml DEPLOY.md  — serverga chiqarish
test/                qr, audio testlari va brauzer sinov sahifalari
```

Yangi shablon qo'shish: `public/js/templates.js` da maket funksiyasini yozing (`{bg, extra, blocks}` qaytaradi), `TEMPLATES` va `TEMPLATE_ORDER` ga qo'shing, `lib/sanitize.js` dagi `TPLS` ro'yxatiga id ni yozing.
