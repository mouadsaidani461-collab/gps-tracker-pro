#!/usr/bin/env bash
# Validate required environment variables before Docker build / compose.
#
# Usage:
#   ./scripts/validate-env.sh [.env]              # Vite + TRACCAR_URL
#   ./scripts/validate-env.sh .env docker         # + Traccar bootstrap secrets
#   ./scripts/validate-env.sh .env.production production

set -euo pipefail

ENV_FILE="${1:-.env}"
MODE="${2:-dev}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/$ENV_FILE" ] && [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Environment file not found: ${ENV_FILE}"
  echo ""
  echo "  Development:"
  echo "    cp .env.example .env"
  echo "    # edit VITE_APP_NAME, VITE_MAP_TILE_URL, TRACCAR_URL, ADMIN_EMAIL"
  echo ""
  echo "  Production:"
  echo "    cp .env.production.example .env.production"
  echo "    # fill secrets — never commit .env.production"
  exit 1
fi

ENV_PATH="$ENV_FILE"
if [ -f "$ROOT/$ENV_FILE" ]; then
  ENV_PATH="$ROOT/$ENV_FILE"
fi

# shellcheck disable=SC1090
set -a && source "$ENV_PATH" && set +a

fail() {
  echo "ERROR: $1"
  echo "  Fix in: ${ENV_PATH}"
  exit 1
}

require_nonempty() {
  local name="$1"
  local hint="$2"
  if [ -z "${!name:-}" ]; then
    echo ""
    fail "${name} is missing or empty. ${hint}"
  fi
}

echo "==> Validating ${ENV_PATH} (mode: ${MODE})"

require_nonempty VITE_APP_NAME "Example: VITE_APP_NAME=GPS Tracker Pro"
require_nonempty VITE_MAP_TILE_URL "Example: VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
require_nonempty TRACCAR_URL "Example: TRACCAR_URL=http://localhost:8082"

if [ "$MODE" = "docker" ] || [ "$MODE" = "production" ]; then
  require_nonempty ADMIN_EMAIL "Run: ./scripts/init-dev-env.sh  (or set ADMIN_EMAIL=admin@localhost.dev)"
  require_nonempty ADMIN_PASSWORD "Run: ./scripts/init-dev-env.sh  (or: openssl rand -base64 24)"
  require_nonempty TRACCAR_SERVICE_TOKEN "Run: ./scripts/init-dev-env.sh  (or: openssl rand -hex 32)"
fi

if [ "$MODE" = "production" ]; then
  require_nonempty DOMAIN "Example: DOMAIN=gps-tracker-pro.ma"
  require_nonempty VITE_API_BASE_URL "Production usually: VITE_API_BASE_URL=/api"
  require_nonempty CERTBOT_EMAIL "Let's Encrypt contact email"
  if [ -x "$ROOT/scripts/validate-production-secrets.sh" ]; then
    "$ROOT/scripts/validate-production-secrets.sh" "$ENV_PATH"
  fi
fi

echo "OK: required variables present in ${ENV_PATH}"
