#!/usr/bin/env sh
# Enable Traccar TOTP on the server record (attribute totpEnable=true).
# Required for POST /api/users/totp — NOT configurable via traccar.xml on modern Traccar.
#
# Env: TRACCAR_URL, ADMIN_EMAIL, ADMIN_PASSWORD
# Optional: TOTP_FORCE=true to set totpForce on new registrations

set -eu

TRACCAR_URL="${TRACCAR_URL:-http://traccar:8082}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
TOTP_FORCE="${TOTP_FORCE:-false}"

if [ -n "${ADMIN_PASSWORD_FILE:-}" ] && [ -f "$ADMIN_PASSWORD_FILE" ]; then
  ADMIN_PASSWORD=$(tr -d '\n\r' < "$ADMIN_PASSWORD_FILE")
fi

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ERROR: ADMIN_EMAIL and ADMIN_PASSWORD are required."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required. Install: apt-get install -y jq"
  exit 1
fi

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

LOGIN_HTTP=$(curl -s -o /dev/null -w '%{http_code}' \
  -c "$COOKIE_JAR" \
  -X POST "${TRACCAR_URL}/api/session" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "email=${ADMIN_EMAIL}" \
  --data-urlencode "password=${ADMIN_PASSWORD}")

if [ "$LOGIN_HTTP" != "200" ]; then
  echo "ERROR: Admin login failed (HTTP ${LOGIN_HTTP})."
  exit 1
fi

SERVER_JSON=$(curl -sf -b "$COOKIE_JAR" "${TRACCAR_URL}/api/server")
if [ -z "$SERVER_JSON" ]; then
  echo "ERROR: Could not read /api/server"
  exit 1
fi

PATCH=$(printf '%s' "$SERVER_JSON" | jq -c \
  --argjson force "$([ "$TOTP_FORCE" = "true" ] && echo true || echo false)" \
  '.attributes = (.attributes // {}) | .attributes.totpEnable = true | .attributes.totpForce = $force')

PUT_HTTP=$(curl -s -o /tmp/traccar-server-put.json -w '%{http_code}' \
  -b "$COOKIE_JAR" \
  -X PUT "${TRACCAR_URL}/api/server" \
  -H 'Content-Type: application/json' \
  -d "$PATCH")

if [ "$PUT_HTTP" != "200" ]; then
  echo "ERROR: PUT /api/server failed (HTTP ${PUT_HTTP}):"
  cat /tmp/traccar-server-put.json 2>/dev/null || true
  exit 1
fi

TOTP_HTTP=$(curl -s -o /tmp/traccar-totp-test.txt -w '%{http_code}' \
  -b "$COOKIE_JAR" \
  -X POST "${TRACCAR_URL}/api/users/totp" \
  -H 'Content-Type: application/json')

if [ "$TOTP_HTTP" != "200" ]; then
  echo "ERROR: TOTP still disabled after server update (HTTP ${TOTP_HTTP}):"
  cat /tmp/traccar-totp-test.txt 2>/dev/null || true
  exit 1
fi

echo "OK: totpEnable=true on Traccar server (totpForce=${TOTP_FORCE})."
echo "OK: POST /api/users/totp verified."
