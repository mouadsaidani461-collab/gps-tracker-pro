#!/usr/bin/env bash
# Preflight: refuse weak or placeholder production secrets before deploy/SSL.
#
# Usage:
#   ./scripts/validate-production-secrets.sh [.env.production]

set -euo pipefail

ENV_FILE="${1:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing ${ENV_FILE} — copy from .env.production.example"
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
load_secret_file() {
  local var_name="$1"
  local file_path="$2"
  if [ -f "$file_path" ]; then
    # shellcheck disable=SC2163
    export "$var_name=$(tr -d '\n\r' < "$file_path")"
  fi
}
load_secret_file TRACCAR_SERVICE_TOKEN "$ROOT/secrets/traccar_service_token"
load_secret_file ADMIN_PASSWORD "$ROOT/secrets/admin_password"
load_secret_file CERTBOT_EMAIL "$ROOT/secrets/certbot_email"

fail() {
  echo "ERROR: $1"
  exit 1
}

warn() {
  echo "WARN: $1"
}

is_placeholder() {
  case "$1" in
    ''|admin123|changeme|traccar|capture-bootstrap-change-me) return 0 ;;
  esac
  case "$1" in
    CHANGE_ME*|change_me*|your-*|example.com) return 0 ;;
  esac
  return 1
}

[ -n "${DOMAIN:-}" ] || fail "DOMAIN is required"
[ -n "${CERTBOT_EMAIL:-}" ] || fail "CERTBOT_EMAIL is required for SSL"
[ -n "${ADMIN_EMAIL:-}" ] || fail "ADMIN_EMAIL is required"
[ -n "${ADMIN_PASSWORD:-}" ] || fail "ADMIN_PASSWORD is required"
[ -n "${TRACCAR_SERVICE_TOKEN:-}" ] || fail "TRACCAR_SERVICE_TOKEN is required"

if is_placeholder "$ADMIN_PASSWORD"; then
  fail "ADMIN_PASSWORD is a placeholder or known weak default"
fi

if [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
  fail "ADMIN_PASSWORD must be at least 12 characters"
fi

if is_placeholder "$TRACCAR_SERVICE_TOKEN"; then
  fail "TRACCAR_SERVICE_TOKEN is a placeholder or known weak default"
fi

if [ "${#TRACCAR_SERVICE_TOKEN}" -lt 32 ]; then
  fail "TRACCAR_SERVICE_TOKEN must be at least 32 characters (use: openssl rand -hex 32)"
fi

if [ "$CERTBOT_EMAIL" = "admin@example.com" ]; then
  warn "CERTBOT_EMAIL is still admin@example.com — set a real address for Let's Encrypt"
fi

if [ "$ADMIN_EMAIL" = "admin@example.com" ]; then
  warn "ADMIN_EMAIL is admin@example.com — use your real admin login email"
fi

echo "OK: Production secrets passed preflight (${ENV_FILE})"
