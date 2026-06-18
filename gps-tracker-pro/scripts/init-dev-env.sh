#!/usr/bin/env bash
# Create .env for local Docker and fill Traccar bootstrap secrets when empty.
#
# Usage:
#   ./scripts/init-dev-env.sh
#   docker compose --env-file .env up -d --build

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.example "$ENV_FILE"
  echo "Created ${ENV_FILE} from .env.example"
fi

env_value() {
  local key="$1"
  local line val
  line=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1 || true)
  [ -z "$line" ] && return 0
  val="${line#*=}"
  val="${val%$'\r'}"
  val="${val#\"}"; val="${val%\"}"
  val="${val#\'}"; val="${val%\'}"
  printf '%s' "$val"
}

set_env_var() {
  local key="$1"
  local value="$2"
  local quoted="$value"
  if [[ "$value" == *" "* ]]; then
    quoted="\"${value}\""
  fi
  if grep -qE "^${key}=" "$ENV_FILE"; then
    perl -i -pe "s/^\Q${key}\E=.*/${key}=${quoted}/" "$ENV_FILE"
  else
    echo "${key}=${quoted}" >> "$ENV_FILE"
  fi
}

ensure_var() {
  local key="$1"
  local generator="$2"
  if [ -z "$(env_value "$key")" ]; then
    set_env_var "$key" "$($generator)"
    echo "  set ${key}"
  fi
}

echo "==> Initializing ${ENV_FILE} for local Docker"

ensure_var ADMIN_EMAIL 'echo admin@localhost.dev'
ensure_var ADMIN_PASSWORD 'openssl rand -base64 18'
ensure_var TRACCAR_SERVICE_TOKEN 'openssl rand -hex 32'

echo "OK: ${ENV_FILE} ready — run:"
echo "  ./scripts/validate-env.sh .env docker"
echo "  docker compose --env-file .env up -d --build"
