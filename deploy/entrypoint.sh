#!/bin/sh
# /data (Render disk yoki docker volume) ko'pincha root egaligida bo'ladi: ruxsatni to'g'rilab, node foydalanuvchisiga o'tamiz.
set -e
DATA="${DATA_DIR:-/data}"
mkdir -p "$DATA"
if [ "$(id -u)" = "0" ]; then
  chown -R node:node "$DATA" 2>/dev/null || true
  exec runuser -u node -- node server.js
fi
exec node server.js
