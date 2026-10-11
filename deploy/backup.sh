#!/bin/sh
# Har kuni zaxira: crontab -e →  0 3 * * * /opt/taklifnoma/deploy/backup.sh
set -e
D="${1:-/opt/taklifnoma}"; mkdir -p "$D/backups"
tar czf "$D/backups/data-$(date +%F).tgz" -C "$D" data
find "$D/backups" -name 'data-*.tgz' -mtime +14 -delete
