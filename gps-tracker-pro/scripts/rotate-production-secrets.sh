#!/usr/bin/env bash
# Rotate production ADMIN_PASSWORD and TRACCAR_SERVICE_TOKEN.
#
# Run on the Hetzner server from the app directory:
#   cd /opt/gps-tracker-pro/gps-tracker-pro
#   chmod +x scripts/rotate-production-secrets.sh
#   ROTATE_CONFIRM=1 ./scripts/rotate-production-secrets.sh
#
# What it does:
#   1. Backs up current secret files
#   2. Generates new ADMIN_PASSWORD + TRACCAR_SERVICE_TOKEN
#   3. Resets Traccar admin password via the *current* service token (Docker network)
#   4. Writes new secrets/ files (deploy-production.sh loads these over .env.production)
#   5. Recreates the traccar container with the new service token
#   6. Verifies admin login through the local nginx edge
#
# POSTGRES_PASSWORD is NOT rotated here (requires a separate migration window).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE="docker compose -f ${COMPOSE_FILE} --env-file .env.production"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-capture-gps-production}"
export COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT"

VERIFY_BASE="${VERIFY_BASE:-http://127.0.0.1}"

if [ ! -f .env.production ]; then
  echo "ERROR: Missing .env.production"
  exit 1
fi

if [ "${ROTATE_CONFIRM:-}" != "1" ]; then
  echo "This rotates ADMIN_PASSWORD and TRACCAR_SERVICE_TOKEN on this server."
  echo "Re-run with: ROTATE_CONFIRM=1 $0"
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env.production && set +a

load_secret() {
  local var_name="$1"
  local file_path="$2"
  if [ -f "$file_path" ]; then
    # shellcheck disable=SC2163
    export "$var_name=$(tr -d '\n\r' < "$file_path")"
  fi
}

load_secret TRACCAR_SERVICE_TOKEN secrets/traccar_service_token
load_secret ADMIN_PASSWORD secrets/admin_password

OLD_SERVICE_TOKEN="${TRACCAR_SERVICE_TOKEN:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_NAME="${ADMIN_NAME:-Admin}"

if [ -z "$OLD_SERVICE_TOKEN" ] || [ -z "$ADMIN_EMAIL" ]; then
  echo "ERROR: TRACCAR_SERVICE_TOKEN and ADMIN_EMAIL must be set."
  exit 1
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="secrets/.backup-${TS}"
mkdir -p "$BACKUP_DIR"
for f in secrets/traccar_service_token secrets/admin_password; do
  if [ -f "$f" ]; then
    cp "$f" "$BACKUP_DIR/"
  fi
done
cp .env.production "$BACKUP_DIR/.env.production"
echo "Backed up secrets to ${BACKUP_DIR}/"

NEW_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n/+=')"
NEW_SERVICE_TOKEN="$(openssl rand -hex 32 | tr -d '\n')"

if [ "${#NEW_ADMIN_PASSWORD}" -lt 12 ]; then
  echo "ERROR: Generated password too short."
  exit 1
fi

echo "==> Resetting admin password via current service token (Docker)..."
ADMIN_PASSWORD="$NEW_ADMIN_PASSWORD" \
  TRACCAR_SERVICE_TOKEN="$OLD_SERVICE_TOKEN" \
  ADMIN_EMAIL="$ADMIN_EMAIL" \
  ADMIN_NAME="$ADMIN_NAME" \
  DISABLE_REGISTRATION=false \
  $COMPOSE run --rm traccar-init

mkdir -p secrets
printf '%s' "$NEW_ADMIN_PASSWORD" > secrets/admin_password
printf '%s' "$NEW_SERVICE_TOKEN" > secrets/traccar_service_token
chmod 600 secrets/admin_password secrets/traccar_service_token

echo "==> Recreating traccar with new service token..."
$COMPOSE up -d --force-recreate traccar

echo "Waiting for Traccar health..."
for _ in $(seq 1 60); do
  if curl -sf "${VERIFY_BASE}/api/server" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

LOGIN_HTTP=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "${VERIFY_BASE}/api/session" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "email=${ADMIN_EMAIL}" \
  --data-urlencode "password=${NEW_ADMIN_PASSWORD}")

if [ "$LOGIN_HTTP" != "200" ]; then
  echo "ERROR: Login verification failed (HTTP ${LOGIN_HTTP})."
  echo "Restore from ${BACKUP_DIR}/ if needed."
  exit 1
fi

echo ""
echo "Rotation complete."
echo "  ADMIN_EMAIL:           ${ADMIN_EMAIL}"
echo "  ADMIN_PASSWORD:        ${NEW_ADMIN_PASSWORD}"
echo "  TRACCAR_SERVICE_TOKEN: (saved in secrets/traccar_service_token)"
echo ""
echo "Save the new admin password in your password manager, then run:"
echo "  ./scripts/deploy-production.sh deploy"
echo ""
echo "Backup kept at: ${BACKUP_DIR}/"
