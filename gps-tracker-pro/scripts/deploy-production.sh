#!/usr/bin/env bash
# Deploy Capture GPS on Hetzner (CX33 or similar)
#
# Usage:
#   ./scripts/deploy-production.sh init     # first-time SSL + stack
#   ./scripts/deploy-production.sh deploy   # rebuild + restart
#   ./scripts/deploy-production.sh verify   # smoke tests
#
# Requires: docker, docker compose, .env.production

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker-compose.production.yml --env-file .env.production"

if [ ! -f .env.production ]; then
  echo "Missing .env.production — copy from .env.production.example and set secrets."
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env.production && set +a

DOMAIN="${DOMAIN:-gps-tracker-pro.ma}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

cmd_init() {
  echo "==> Building application image..."
  $COMPOSE build frontend

  echo "==> Starting core services (without edge SSL)..."
  $COMPOSE up -d traccar
  echo "Waiting for Traccar health..."
  sleep 15
  $COMPOSE up traccar-init
  $COMPOSE up -d frontend

  echo "==> Obtaining Let's Encrypt certificate for ${DOMAIN}..."
  if [ -z "$CERTBOT_EMAIL" ]; then
    echo "Set CERTBOT_EMAIL in .env.production"
    exit 1
  fi

  docker run --rm \
    -v capture-gps-production_certbot-etc:/etc/letsencrypt \
    -v capture-gps-production_certbot-www:/var/www/certbot \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" -d "www.${DOMAIN}" \
    --email "$CERTBOT_EMAIL" --agree-tos --non-interactive --no-eff-email

  echo "==> Starting edge proxy + certbot renew loop..."
  $COMPOSE up -d edge certbot

  cmd_verify
}

cmd_deploy() {
  $COMPOSE up -d --build
  cmd_verify
}

cmd_verify() {
  echo "==> Health checks..."
  $COMPOSE ps

  echo "==> Internal Traccar API (via frontend proxy)..."
  FRONTEND_CID=$($COMPOSE ps -q frontend)
  docker exec "$FRONTEND_CID" wget -qO- http://127.0.0.1/api/server | head -c 200
  echo ""

  echo "==> Public HTTPS (run from server with DNS pointed)..."
  if curl -sf "https://${DOMAIN}/api/server" | head -c 200; then
    echo ""
    echo "OK: https://${DOMAIN}/api/server"
  else
    echo "WARN: Public HTTPS check failed (DNS/SSL may still be propagating)."
    echo "Try: curl -v https://${DOMAIN}/api/server"
  fi

  echo "==> Security headers..."
  curl -sI "https://${DOMAIN}/" | grep -iE 'strict-transport|content-security|x-frame' || true

  echo "==> Docker Scout (optional)..."
  docker scout quickview capture-tracking-gps:latest 2>/dev/null || echo "Install Docker Scout for CVE scan."
}

case "${1:-deploy}" in
  init) cmd_init ;;
  deploy) cmd_deploy ;;
  verify) cmd_verify ;;
  *)
    echo "Usage: $0 {init|deploy|verify}"
    exit 1
    ;;
esac
