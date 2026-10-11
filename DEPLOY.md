# Saytni internetga chiqarish (qadamma-qadam)

Kerak bo'ladi: **VPS server** (Ubuntu 22.04/24.04, kamida 1 CPU / 2 GB RAM, ~$5–6/oy: Hetzner, DigitalOcean, Vultr, yoki Uzbekistondagi hosting) va **domen** (masalan `taklifnoma.uz`).

## 1. Domenni serverga ulang
Domen provayderingizda **A yozuv** qo'shing: `taklifnoma.uz → SERVER_IP` (va xohlasangiz `www`). 5–30 daqiqada ishga tushadi.

## 2. Serverga kiring va Docker o'rnating
```bash
ssh root@SERVER_IP
curl -fsSL https://get.docker.com | sh
```

## 3. Loyihani serverga yuklang
Kompyuteringizdan (zip fayl turgan papkadan):
```bash
scp taklifnoma-studiyasi.zip root@SERVER_IP:/opt/
ssh root@SERVER_IP
apt-get install -y unzip && cd /opt && unzip taklifnoma-studiyasi.zip && cd taklifnoma-site   # papka nomi zip ichidagiga qarab
```

## 4. Sozlang
```bash
cp deploy/.env.example .env
nano .env        # DOMAIN, BASE_URL, SITE_DOMAIN va ADMIN_PASSWORD ni yozing
mkdir -p data
```
`ADMIN_PASSWORD` — o'zingiz o'ylab topgan uzun parol (kamida 10 belgi). Bo'sh qoldirsangiz, tasodifiy parol `data/admin-first-password.txt` ga yoziladi.

## 5. Ishga tushiring
```bash
docker compose up -d --build
docker compose logs -f app      # "Taklifnoma Studiyasi: http://..." chiqsa — tayyor
```
Caddy HTTPS sertifikatni o'zi oladi. `https://taklifnoma.uz` ni oching, so'ng **`https://taklifnoma.uz/admin`** ga kirib parol bilan kiring.

> Fayrvol: faqat 22, 80, 443 portlar ochiq bo'lsin (`ufw allow 22,80,443/tcp && ufw enable`).

## 6. Admin sifatida nima qilasiz
- **Shablonlar** — rasm yoki video yuklab, matn joyini belgilaysiz → hamma foydalanuvchilar muharrirda ko'radi.
- **Qo'shiqlar** — mp3/m4a/wav yuklaysiz → video va jonli taklifnoma musiqasida chiqadi. *(Faqat o'zingizda huquq bor musiqani yuklang.)*
- **Promokodlar**, **Taklifnomalar** (kuzatish/o'chirish), **Statistika**, **Parolni o'zgartirish**.
- Admin sifatida kirganingizda muharrirda hamma narsa ochiq, suv belgisisiz.

## Yangilash va zaxira
```bash
# yangi versiyani yuklagach:
docker compose up -d --build
# zaxira (data/ — baza + yuklangan fayllar):
sh deploy/backup.sh /opt/taklifnoma-site
```
`crontab -e` ga: `0 3 * * * sh /opt/taklifnoma-site/deploy/backup.sh /opt/taklifnoma-site`

## Docker'siz variant (systemd + Caddy)
```bash
apt-get install -y nodejs ffmpeg caddy     # Node 18+ bo'lishi shart (kerak bo'lsa NodeSource'dan)
useradd -r -m taklifnoma; mkdir -p /opt/taklifnoma && cp -r . /opt/taklifnoma && chown -R taklifnoma /opt/taklifnoma
cp deploy/.env.example /opt/taklifnoma/.env && nano /opt/taklifnoma/.env
cp deploy/taklifnoma.service /etc/systemd/system/ && systemctl enable --now taklifnoma
cp deploy/Caddyfile.systemd /etc/caddy/Caddyfile && nano /etc/caddy/Caddyfile && systemctl restart caddy
```

## Muhim ogohlantirishlar
- **`DEMO_PAY=1` ni productionda yoqmang** — to'lovsiz hamma narsani ochib yuboradi.
- **Click/Payme/Uzum hali ulanmagan** (merchant shartnoma va kalit kerak). Hozircha daromad: promokodlarni qo'lda sotish.
- `data/` papkasini muntazam zaxiralang; `data/secret.key` yo'qolsa admin sessiyalari bekor bo'ladi.
- Kirish urinishlari IP bo'yicha cheklangan (brute-force himoyasi); parolni uzun qiling.
