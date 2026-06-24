#!/usr/bin/env sh
# Enable Traccar TOTP on the server record (attribute totpEnable=true).
# Required for POST /api/users/totp — NOT configurable via traccar.xml on modern Traccar.
#
# Loads ADMIN_EMAIL / ADMIN_PASSWORD from .env.production + secrets/admin_password
# when run on the Hetzner host (same as deploy-production.sh).
#
# Optional env:
#   PUBLIC_API_URL  — edge URL (default http://127.0.0.1 when TRACCAR_URL is docker-internal)
#   TOTP_FORCE=true — also set totpForce on server attributes
#   LOG_VERBOSE=1   — extra debug lines (never prints passwords)

set -eu

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

log_verbose() {
  if [ "${LOG_VERBOSE:-0}" = "1" ]; then
    log "DEBUG: $*"
  fi
}

mask_email() {
  printf '%s' "$1" | sed -E 's/^(.)([^@]*)(@.*)$/\1***\3/'
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

log "==> enable-traccar-totp.sh"
log "    root=${ROOT}"

if [ -f .env.production ]; then
  log "    loaded .env.production"
  # shellcheck disable=SC1091
  set -a && . ./.env.production && set +a
else
  log "WARN: .env.production not found in ${ROOT}"
fi

if [ -f secrets/admin_password ]; then
  ADMIN_PASSWORD=$(tr -d '\n\r' < secrets/admin_password)
  export ADMIN_PASSWORD
  log "    loaded secrets/admin_password"
else
  log_verbose "secrets/admin_password not found"
fi

DOCKER_TRACCAR_URL="${TRACCAR_URL:-http://traccar:8082}"
if [ -n "${PUBLIC_API_URL:-}" ]; then
  API_URL="$PUBLIC_API_URL"
  log "    API_URL=${API_URL} (from PUBLIC_API_URL)"
elif printf '%s' "$DOCKER_TRACCAR_URL" | grep -qE '://traccar([:/]|$)'; then
  API_URL="http://127.0.0.1"
  log "    API_URL=${API_URL} (edge — docker TRACCAR_URL=${DOCKER_TRACCAR_URL} not reachable from host)"
else
  API_URL="$DOCKER_TRACCAR_URL"
  log "    API_URL=${API_URL}"
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
TOTP_FORCE="${TOTP_FORCE:-false}"

if [ -n "${ADMIN_PASSWORD_FILE:-}" ] && [ -f "$ADMIN_PASSWORD_FILE" ]; then
  ADMIN_PASSWORD=$(tr -d '\n\r' < "$ADMIN_PASSWORD_FILE")
  export ADMIN_PASSWORD
  log "    loaded ADMIN_PASSWORD_FILE"
fi

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  log "ERROR: ADMIN_EMAIL and ADMIN_PASSWORD are required."
  log "       Set them in .env.production or secrets/admin_password on the server."
  exit 1
fi

log "    admin=$(mask_email "$ADMIN_EMAIL")"
log "    totpForce=${TOTP_FORCE}"

if ! command -v jq >/dev/null 2>&1; then
  log "ERROR: jq is required. Install: apt-get install -y jq"
  exit 1
fi

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT
log_verbose "cookie jar=${COOKIE_JAR}"

log "==> Step 1/5: POST /api/session (login)"
LOGIN_HTTP=$(curl -s -o /tmp/traccar-login-body.txt -w '%{http_code}' \
  -c "$COOKIE_JAR" \
  -X POST "${API_URL}/api/session" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "email=${ADMIN_EMAIL}" \
  --data-urlencode "password=${ADMIN_PASSWORD}")

log "    HTTP ${LOGIN_HTTP}"
if [ "$LOGIN_HTTP" != "200" ]; then
  log "ERROR: Admin login failed."
  log "       Check ADMIN_EMAIL / ADMIN_PASSWORD in .env.production or secrets/admin_password."
  if [ -s /tmp/traccar-login-body.txt ]; then
    log "       response: $(head -c 200 /tmp/traccar-login-body.txt)"
  fi
  exit 1
fi
log "    OK: session cookie saved"

log "==> Step 2/5: POST /api/_csrf-bootstrap"
CSRF_TOKEN=$(openssl rand -hex 32)
log_verbose "csrf token prefix=${CSRF_TOKEN%%????????????????????????????????}"
CSRF_BOOT_HTTP=$(curl -s -o /dev/null -w '%{http_code}' \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "${API_URL}/api/_csrf-bootstrap" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}")
log "    HTTP ${CSRF_BOOT_HTTP}"
if [ "$CSRF_BOOT_HTTP" != "204" ]; then
  log "ERROR: CSRF bootstrap failed (edge nginx requires this for PUT/POST)."
  exit 1
fi
log "    OK: capture_csrf cookie set"

log "==> Step 3/5: GET /api/server (read current attributes)"
SERVER_JSON=$(curl -sf -b "$COOKIE_JAR" "${API_URL}/api/server")
if [ -z "$SERVER_JSON" ]; then
  log "ERROR: Could not read ${API_URL}/api/server"
  exit 1
fi
CURRENT_TOTP=$(printf '%s' "$SERVER_JSON" | jq -r '.attributes.totpEnable // false')
CURRENT_FORCE=$(printf '%s' "$SERVER_JSON" | jq -r '.attributes.totpForce // false')
log "    current totpEnable=${CURRENT_TOTP} totpForce=${CURRENT_FORCE}"

log "==> Step 4/5: PUT /api/server (totpEnable=true)"
PATCH=$(printf '%s' "$SERVER_JSON" | jq -c \
  --argjson force "$([ "$TOTP_FORCE" = "true" ] && echo true || echo false)" \
  '.attributes = (.attributes // {}) | .attributes.totpEnable = true | .attributes.totpForce = $force')
log_verbose "patch=${PATCH}"

PUT_HTTP=$(curl -s -o /tmp/traccar-server-put.json -w '%{http_code}' \
  -b "$COOKIE_JAR" \
  -X PUT "${API_URL}/api/server" \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -d "$PATCH")
log "    HTTP ${PUT_HTTP}"
if [ "$PUT_HTTP" != "200" ]; then
  log "ERROR: PUT /api/server failed."
  if [ -s /tmp/traccar-server-put.json ]; then
    log "       response: $(head -c 300 /tmp/traccar-server-put.json)"
  fi
  exit 1
fi
log "    OK: server attributes updated"

log "==> Step 5/5: POST /api/users/totp (verify enrollment endpoint)"
TOTP_HTTP=$(curl -s -o /tmp/traccar-totp-test.txt -w '%{http_code}' \
  -b "$COOKIE_JAR" \
  -X POST "${API_URL}/api/users/totp" \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: ${CSRF_TOKEN}")
log "    HTTP ${TOTP_HTTP}"
if [ "$TOTP_HTTP" != "200" ]; then
  log "ERROR: TOTP endpoint still rejected after server update."
  if [ -s /tmp/traccar-totp-test.txt ]; then
    log "       response: $(head -c 200 /tmp/traccar-totp-test.txt)"
  fi
  exit 1
fi
TOTP_SECRET_LEN=$(wc -c < /tmp/traccar-totp-test.txt | tr -d ' ')
log "    OK: secret generated (${TOTP_SECRET_LEN} bytes, not logged)"

VERIFY_JSON=$(curl -sf -b "$COOKIE_JAR" "${API_URL}/api/server")
VERIFY_TOTP=$(printf '%s' "$VERIFY_JSON" | jq -r '.attributes.totpEnable // false')
VERIFY_FORCE=$(printf '%s' "$VERIFY_JSON" | jq -r '.attributes.totpForce // false')

log "==> Done"
log "    totpEnable=${VERIFY_TOTP} totpForce=${VERIFY_FORCE}"
if [ "$VERIFY_TOTP" = "true" ]; then
  log "OK: Traccar TOTP is enabled — use Settings → Security in Capture GPS to enroll."
else
  log "WARN: totpEnable is not true after update — check Traccar logs."
  exit 1
fi
