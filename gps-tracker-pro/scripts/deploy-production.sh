#!/usr/bin/env bash
# Deploy Capture GPS on Hetzner (CX33 or similar)
#
# Usage:
#   ./scripts/deploy-production.sh http     # pre-DNS: HTTP only on server IP
#   ./scripts/deploy-production.sh init     # first-time SSL + stack (DNS required)
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

load_secret_file() {
  local var_name="$1"
  local file_path="$2"
  if [ -f "$file_path" ]; then
    # shellcheck disable=SC2163
    export "$var_name=$(tr -d '\n\r' < "$file_path")"
  fi
}

load_secret_file TRACCAR_SERVICE_TOKEN secrets/traccar_service_token
load_secret_file ADMIN_PASSWORD secrets/admin_password
load_secret_file CERTBOT_EMAIL secrets/certbot_email

DOMAIN="${DOMAIN:-gps-tracker-pro.ma}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

check_dns() {
  local resolved
  resolved=$(dig +short "$DOMAIN" A 2>/dev/null | head -1 || true)
  if [ -z "$resolved" ]; then
    echo "ERROR: DNS A record for ${DOMAIN} not found. Point DNS before init."
    echo "       For pre-DNS testing use: ./scripts/deploy-production.sh http"
    exit 1
  fi
  echo "DNS OK: ${DOMAIN} → ${resolved}"
}

persist_ssl_edge_config() {
  if grep -q '^EDGE_NGINX_CONF=' .env.production 2>/dev/null; then
    if grep -q '^EDGE_NGINX_CONF=./docker/nginx/edge.local.conf' .env.production; then
      sed -i.bak 's|^EDGE_NGINX_CONF=.*|EDGE_NGINX_CONF=./docker/nginx/edge.conf|' .env.production
      rm -f .env.production.bak
    fi
  else
    echo 'EDGE_NGINX_CONF=./docker/nginx/edge.conf' >> .env.production
  fi
  # shellcheck disable=SC1091
  set -a && source .env.production && set +a
}

cmd_http() {
  echo "==> Pre-SSL HTTP deploy (edge.local.conf, test via http://<SERVER_IP>/)"
  ./scripts/validate-production-secrets.sh .env.production
  $COMPOSE up -d --build
  cmd_verify
}

cmd_init() {
  ./scripts/validate-production-secrets.sh .env.production
  check_dns

  if [ -z "$CERTBOT_EMAIL" ]; then
    echo "Set CERTBOT_EMAIL in .env.production"
    exit 1
  fi

  echo "==> Building application image..."
  $COMPOSE build frontend

  echo "==> Starting core services..."
  $COMPOSE up -d traccar
  echo "Waiting for Traccar health..."
  sleep 15
  $COMPOSE up traccar-init
  $COMPOSE up -d frontend

  echo "==> Rendering edge SSL config..."
  chmod +x scripts/render-edge-conf.sh
  ./scripts/render-edge-conf.sh

  echo "==> Starting edge on HTTP (ACME webroot)..."
  EDGE_NGINX_CONF=./docker/nginx/edge.local.conf $COMPOSE up -d edge

  echo "Waiting for edge :80..."
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1/" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  echo "==> Obtaining Let's Encrypt certificate for ${DOMAIN}..."
  docker run --rm \
    -v capture-gps-production_certbot-etc:/etc/letsencrypt \
    -v capture-gps-production_certbot-www:/var/www/certbot \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" -d "www.${DOMAIN}" \
    --email "$CERTBOT_EMAIL" --agree-tos --non-interactive --no-eff-email

  echo "==> Switching edge to HTTPS..."
  persist_ssl_edge_config
  $COMPOSE up -d --force-recreate edge certbot

  cmd_verify
}

cmd_deploy() {
  ./scripts/validate-production-secrets.sh .env.production
  if [ -f docker/nginx/edge.conf.template ] && [ ! -f docker/nginx/edge.conf ]; then
    ./scripts/render-edge-conf.sh
  fi
  $COMPOSE up -d --build
  cmd_verify
}

cmd_verify() {
  echo "==> Health checks..."
  $COMPOSE ps

  echo "==> Internal Traccar API (via frontend proxy)..."
  FRONTEND_CID=$($COMPOSE ps -q frontend 2>/dev/null || true)
  if [ -n "$FRONTEND_CID" ]; then
    docker exec "$FRONTEND_CID" wget -qO- http://127.0.0.1/api/server | head -c 200
    echo ""
  fi

  echo "==> Public HTTP (local edge)..."
  if curl -sf "http://127.0.0.1/api/server" | head -c 120; then
    echo ""
    echo "OK: http://127.0.0.1/api/server"
  else
    echo "WARN: Local HTTP check failed."
  fi

  echo "==> Public HTTPS (${DOMAIN})..."
  if curl -sf "https://${DOMAIN}/api/server" | head -c 200; then
    echo ""
    echo "OK: https://${DOMAIN}/api/server"
    curl -sI "https://${DOMAIN}/" | grep -iE 'strict-transport|content-security|x-frame' || true
  else
    echo "WARN: HTTPS check failed (DNS/SSL may not be ready). Pre-SSL: use ./scripts/deploy-production.sh http"
  fi

  echo "==> Docker Scout (optional)..."
  docker scout quickview capture-tracking-gps:latest 2>/dev/null || echo "Install Docker Scout for CVE scan."
}

case "${1:-deploy}" in
  http) cmd_http ;;
  init) cmd_init ;;
  deploy) cmd_deploy ;;
  verify) cmd_verify ;;
  *)
    echo "Usage: $0 {http|init|deploy|verify}"
    exit 1
    ;;
esac
