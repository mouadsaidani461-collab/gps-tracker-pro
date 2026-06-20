#!/usr/bin/env bash
# Daily backup: PostgreSQL dump + Traccar files, encrypted, uploaded to remote storage.
#
# Usage (cron): 0 2 * * * /opt/gps-tracker-pro/gps-tracker-pro/scripts/backup.sh
#
# Requires: docker, .env.production
# Optional: age or GPG for encryption, rclone or aws cli for upload
#
# Retention: 7 daily copies (local + remote when configured)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE="docker compose -f ${COMPOSE_FILE} --env-file .env.production"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-capture-gps-production}"

# shellcheck disable=SC1091
set -a && source .env.production && set +a

BACKUP_DIR="${BACKUP_DIR:-/var/backups/capture-gps}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="${BACKUP_DIR}/.work-${STAMP}"
ARCHIVE="${BACKUP_DIR}/capture-gps-${STAMP}.tar.gz"

mkdir -p "$BACKUP_DIR" "$WORK"

cleanup() {
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "==> Backup ${STAMP}"

PG_CID=$($COMPOSE ps -q postgres 2>/dev/null || true)
if [ -z "$PG_CID" ]; then
  echo "ERROR: postgres container not running"
  exit 1
fi

echo "→ pg_dump"
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" "$PG_CID" \
  pg_dump -U "${POSTGRES_USER:-traccar}" -d "${POSTGRES_DB:-traccar}" -Fc \
  > "${WORK}/postgres.dump"

echo "→ traccar-data volume"
docker run --rm \
  -v "${COMPOSE_PROJECT}_traccar-data:/data:ro" \
  -v "${WORK}:/backup" \
  alpine:3.20 \
  tar czf /backup/traccar-data.tar.gz -C /data .

if [ -d "${UPLOADS_PATH:-}" ]; then
  echo "→ uploaded files (${UPLOADS_PATH})"
  tar czf "${WORK}/uploads.tar.gz" -C "$(dirname "$UPLOADS_PATH")" "$(basename "$UPLOADS_PATH")"
fi

echo "→ archive"
tar czf "$ARCHIVE" -C "$WORK" .

ENCRYPTED=""
if [ -n "${AGE_PUBLIC_KEY:-}" ] && command -v age >/dev/null 2>&1; then
  ENCRYPTED="${ARCHIVE}.age"
  age -r "$AGE_PUBLIC_KEY" -o "$ENCRYPTED" "$ARCHIVE"
  rm -f "$ARCHIVE"
  echo "→ encrypted with age: ${ENCRYPTED}"
elif [ -n "${BACKUP_GPG_RECIPIENT:-}" ] && command -v gpg >/dev/null 2>&1; then
  ENCRYPTED="${ARCHIVE}.gpg"
  gpg --batch --yes --trust-model always --encrypt -r "$BACKUP_GPG_RECIPIENT" -o "$ENCRYPTED" "$ARCHIVE"
  rm -f "$ARCHIVE"
  echo "→ encrypted with GPG: ${ENCRYPTED}"
else
  ENCRYPTED="$ARCHIVE"
  echo "WARN: No AGE_PUBLIC_KEY or BACKUP_GPG_RECIPIENT — backup stored unencrypted"
fi

upload_file() {
  local file="$1"
  if [ -n "${RCLONE_REMOTE:-}" ] && command -v rclone >/dev/null 2>&1; then
    echo "→ uploading via rclone (${RCLONE_REMOTE})"
    rclone copy "$file" "${RCLONE_REMOTE}/"
    rclone delete "${RCLONE_REMOTE}/" --min-age "${RETENTION_DAYS}d" 2>/dev/null || true
  elif [ -n "${AWS_S3_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
    echo "→ uploading via aws s3 (${AWS_S3_BUCKET})"
    aws s3 cp "$file" "${AWS_S3_BUCKET}/$(basename "$file")"
  else
    echo "WARN: No RCLONE_REMOTE or AWS_S3_BUCKET — local backup only"
  fi
}

upload_file "$ENCRYPTED"

echo "→ local retention (${RETENTION_DAYS} days)"
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'capture-gps-*.tar.gz*' -o -name 'capture-gps-*.age' -o -name 'capture-gps-*.gpg' \) \
  -mtime "+${RETENTION_DAYS}" -delete

echo "OK: backup complete — $(basename "$ENCRYPTED")"
