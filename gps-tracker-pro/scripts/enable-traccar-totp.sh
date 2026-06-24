#!/usr/bin/env sh
# Enable Traccar TOTP on the server record (attribute totpEnable=true).
# Required for POST /api/users/totp — NOT configurable via traccar.xml on modern Traccar.
#
# Loads ADMIN_EMAIL / ADMIN_PASSWORD from .env.production + secrets/admin_password
# when run on the Hetzner host (same as deploy-production.sh).
#
# Optional env: TRACCAR_URL (default http://127.0.0.1 via edge nginx), TOTP_FORCE=true

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env.production ]; then
  # shellcheck disable=SC1091
  set -a && . ./.env.production && set +a
fi

if [ -f secrets/admin_password ]; then
  ADMIN_PASSWORD=$(tr -d '\n\r' < secrets/admin_password)
  export ADMIN_PASSWORD
fi

# .env.production sets TRACCAR_URL=http://traccar:8082 for Docker Compose only.
# From the Hetzner host shell, API calls must go through edge nginx on localhost.
DOCKER_TRACCAR_URL="${TRACCAR_URL:-http://traccar:8082}"
if [ -n "${PUBLIC_API_URL:-}" ]; then
  API_URL="$PUBLIC_API_URL"
elif printf '%s' "$DOCKER_TRACCAR_URL" | grep -qE '://traccar([:/]|$)'; then
  API_URL="http://127.0.0.1"
else
  API_URL="$DOCKER_TRACCAR_URL"
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
TOTP_FORCE="${TOTP_FORCE:-false}"

if [ -n "${ADMIN_PASSWORD_FILE:-}" ] && [ -f "$ADMIN_PASSWORD_FILE" ]; then
  ADMIN_PASSWORD=$(tr -d '\n\r' < "$ADMIN_PASSWORD_FILE")
  export ADMIN_PASSWORD
fi

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ERROR: ADMIN_EMAIL and ADMIN_PASSWORD are required."
  echo "Set them in .env.production or secrets/admin_password on the server."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required. Install: apt-get install -y jq"
  exit 1
fi

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "==> Logging in as ${ADMIN_EMAIL} (${API_URL})..."
LOGIN_HTTP=$(curl -s -o /dev/null -w '%{http_code}' \
  -c "$COOKIE_JAR" \
  -X POST "${API_URL}/api/session" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "email=${ADMIN_EMAIL}" \
  --data-urlencode "password=${ADMIN_PASSWORD}")

if [ "$LOGIN_HTTP" != "200" ]; then
  echo "ERROR: Admin login failed (HTTP ${LOGIN_HTTP})."
  echo "Check ADMIN_EMAIL / ADMIN_PASSWORD in .env.production or secrets/admin_password."
  exit 1
fi

SERVER_JSON=$(curl -sf -b "$COOKIE_JAR" "${API_URL}/api/server")
if [ -z "$SERVER_JSON" ]; then
  echo "ERROR: Could not read ${API_URL}/api/server"
  exit 1
fi

echo "==> Setting totpEnable=true on server..."
PATCH=$(printf '%s' "$SERVER_JSON" | jq -c \
  --argjson force "$([ "$TOTP_FORCE" = "true" ] && echo true || echo false)" \
  '.attributes = (.attributes // {}) | .attributes.totpEnable = true | .attributes.totpForce = $force')

PUT_HTTP=$(curl -s -o /tmp/traccar-server-put.json -w '%{http_code}' \
  -b "$COOKIE_JAR" \
  -X PUT "${API_URL}/api/server" \
  -H 'Content-Type: application/json' \
  -d "$PATCH")

if [ "$PUT_HTTP" != "200" ]; then
  echo "ERROR: PUT /api/server failed (HTTP ${PUT_HTTP}):"
  cat /tmp/traccar-server-put.json 2>/dev/null || true
  exit 1
fi

TOTP_HTTP=$(curl -s -o /tmp/traccar-totp-test.txt -w '%{http_code}' \
  -b "$COOKIE_JAR" \
  -X POST "${API_URL}/api/users/totp" \
  -H 'Content-Type: application/json')

if [ "$TOTP_HTTP" != "200" ]; then
  echo "ERROR: TOTP still disabled after server update (HTTP ${TOTP_HTTP}):"
  cat /tmp/traccar-totp-test.txt 2>/dev/null || true
  exit 1
fi

echo "OK: totpEnable=true on Traccar server (totpForce=${TOTP_FORCE})."
echo "OK: POST /api/users/totp verified."
