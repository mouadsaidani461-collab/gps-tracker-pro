#!/usr/bin/env sh
# Bootstrap Traccar admin for Docker production.
# Creates admin via service token, verifies login, disables public registration.
#
# Required env:
#   TRACCAR_URL, ADMIN_EMAIL, ADMIN_PASSWORD, TRACCAR_SERVICE_TOKEN

set -eu

TRACCAR_URL="${TRACCAR_URL:-http://traccar:8082}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
ADMIN_NAME="${ADMIN_NAME:-Admin}"
SERVICE_TOKEN="${TRACCAR_SERVICE_TOKEN:-}"
DISABLE_REGISTRATION="${DISABLE_REGISTRATION:-true}"

if [ -n "${ADMIN_PASSWORD_FILE:-}" ] && [ -f "$ADMIN_PASSWORD_FILE" ]; then
  ADMIN_PASSWORD=$(tr -d '\n\r' < "$ADMIN_PASSWORD_FILE")
fi
if [ -n "${TRACCAR_SERVICE_TOKEN_FILE:-}" ] && [ -f "$TRACCAR_SERVICE_TOKEN_FILE" ]; then
  SERVICE_TOKEN=$(tr -d '\n\r' < "$TRACCAR_SERVICE_TOKEN_FILE")
fi

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ] || [ -z "$SERVICE_TOKEN" ]; then
  echo "ERROR: ADMIN_EMAIL, ADMIN_PASSWORD, and TRACCAR_SERVICE_TOKEN are required."
  exit 1
fi

if [ "$ADMIN_PASSWORD" = "admin123" ] || [ "$SERVICE_TOKEN" = "capture-bootstrap-change-me" ]; then
  echo "ERROR: Refusing to bootstrap with default credentials. Set strong secrets in .env.production"
  exit 1
fi

if [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
  echo "ERROR: ADMIN_PASSWORD must be at least 12 characters."
  exit 1
fi

echo "Waiting for Traccar at ${TRACCAR_URL}..."
for _ in $(seq 1 90); do
  if curl -sf "${TRACCAR_URL}/api/server" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

try_login() {
  curl -s -o /dev/null -w '%{http_code}' \
    -X POST "${TRACCAR_URL}/api/session" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "email=${ADMIN_EMAIL}" \
    --data-urlencode "password=${ADMIN_PASSWORD}"
}

if [ "$(try_login)" = "200" ]; then
  echo "Login OK — admin already configured (${ADMIN_EMAIL})"
else
  USER_JSON="{\"name\":\"${ADMIN_NAME}\",\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"administrator\":true}"
  AUTH_HEADER="Authorization: Bearer ${SERVICE_TOKEN}"

  find_user_id() {
    USERS_JSON=$(curl -sf "${TRACCAR_URL}/api/users" -H "$AUTH_HEADER" 2>/dev/null || echo '[]')
    printf '%s' "$USERS_JSON" | sed 's/},{/}\n{/g' | grep -Fi "\"email\":\"${ADMIN_EMAIL}\"" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1
  }

  reset_password() {
    USER_ID="$1"
    [ -n "$USER_ID" ] || return 1
    HTTP=$(curl -s -o /dev/null -w '%{http_code}' \
      -X PUT "${TRACCAR_URL}/api/users/${USER_ID}" \
      -H 'Content-Type: application/json' \
      -H "$AUTH_HEADER" \
      -d "{\"id\":${USER_ID},\"name\":\"${ADMIN_NAME}\",\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"administrator\":true}")
    [ "$HTTP" = "200" ]
  }

  USER_ID=$(find_user_id)
  if [ -n "$USER_ID" ] && reset_password "$USER_ID" && [ "$(try_login)" = "200" ]; then
    echo "Password reset for existing user: ${ADMIN_EMAIL}"
  else
    CREATE_HTTP=$(curl -s -o /tmp/traccar-create.json -w '%{http_code}' \
      -X POST "${TRACCAR_URL}/api/users" \
      -H 'Content-Type: application/json' \
      -H "$AUTH_HEADER" \
      -d "$USER_JSON")

    if [ "$CREATE_HTTP" != "200" ] && [ "$CREATE_HTTP" != "201" ]; then
      echo "Bootstrap failed. HTTP ${CREATE_HTTP}. Response:"
      cat /tmp/traccar-create.json 2>/dev/null || true
      exit 1
    fi
    echo "Admin created via service token: ${ADMIN_EMAIL}"
  fi

  if [ "$(try_login)" != "200" ]; then
    echo "ERROR: Admin created but login verification failed."
    exit 1
  fi
fi

if [ "$DISABLE_REGISTRATION" = "true" ]; then
  COOKIE_JAR=$(mktemp)
  curl -sf -c "$COOKIE_JAR" -X POST "${TRACCAR_URL}/api/session" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "email=${ADMIN_EMAIL}" \
    --data-urlencode "password=${ADMIN_PASSWORD}" >/dev/null

  SERVER_JSON=$(curl -sf -b "$COOKIE_JAR" "${TRACCAR_URL}/api/server" || echo '{}')
  # Force registration=false on server settings
  PUT_HTTP=$(curl -s -o /dev/null -w '%{http_code}' \
    -X PUT "${TRACCAR_URL}/api/server" \
    -b "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -d "$(printf '%s' "$SERVER_JSON" | sed 's/"registration":true/"registration":false/' | sed 's/"registration":null/"registration":false/')")

  rm -f "$COOKIE_JAR"

  if [ "$PUT_HTTP" = "200" ]; then
    echo "Public registration disabled on Traccar server."
  else
    echo "WARN: Could not disable registration via API (HTTP ${PUT_HTTP}). WEB_REGISTRATION=false env still applies."
  fi
fi

ENABLE_TRACCAR_TOTP="${ENABLE_TRACCAR_TOTP:-true}"
if [ "$ENABLE_TRACCAR_TOTP" = "true" ]; then
  echo "==> Enabling Traccar TOTP (server attribute totpEnable)..."
  ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  TOTP_FORCE="${TOTP_FORCE:-false}" \
    "$ROOT_DIR/scripts/enable-traccar-totp.sh" || {
    echo "WARN: Could not enable TOTP — run manually: ./scripts/enable-traccar-totp.sh"
  }
fi

echo "Bootstrap complete."
exit 0
