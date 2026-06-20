#!/usr/bin/env bash
# One-shot Hetzner bootstrap — clone, Docker, secrets, HTTP deploy.
#
# Run from Mac Terminal (NOT inside an SSH session):
#
#   scp gps-tracker-pro/scripts/bootstrap-hetzner.sh root@SERVER:/root/
#   ssh -t root@SERVER 'bash /root/bootstrap-hetzner.sh'
#
# Non-interactive (recommended — avoids stdin/read issues):
#   ssh root@SERVER 'ADMIN_EMAIL=you@domain.com CERTBOT_EMAIL=you@domain.com bash /root/bootstrap-hetzner.sh'
#
# Optional env (skip prompts):
#   ADMIN_EMAIL=you@domain.com CERTBOT_EMAIL=you@domain.com DOMAIN=gps-tracker-pro.ma bash bootstrap-hetzner.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/mouadsaidani461-collab/gps-tracker-pro.git}"
CLONE_DIR="${CLONE_DIR:-/opt/gps-tracker-pro}"
APP_DIR="${APP_DIR:-${CLONE_DIR}/gps-tracker-pro}"
DOMAIN="${DOMAIN:-gps-tracker-pro.ma}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

echo "==> Capture GPS — Hetzner bootstrap"
echo "    App dir: ${APP_DIR}"

echo "==> Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl openssl ca-certificates ufw gnupg dnsutils

echo "==> Docker (official install script)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
docker --version
docker compose version

echo "==> Firewall"
ufw default deny incoming || true
ufw default allow outgoing || true
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
echo "y" | ufw enable || true

echo "==> Clone repository"
mkdir -p "$(dirname "$CLONE_DIR")"
if [ -d "${CLONE_DIR}/.git" ]; then
  git -C "$CLONE_DIR" fetch origin
  git -C "$CLONE_DIR" reset --hard origin/master
else
  rm -rf "$CLONE_DIR"
  git clone "$REPO_URL" "$CLONE_DIR"
fi

if [ ! -f "${APP_DIR}/scripts/deploy-production.sh" ]; then
  echo "ERROR: Expected ${APP_DIR}/scripts/deploy-production.sh — check repo layout."
  exit 1
fi

cd "$APP_DIR"
chmod +x scripts/*.sh

if [ -z "${ADMIN_EMAIL:-}" ]; then
  read -r -p "Admin login email (ADMIN_EMAIL): " ADMIN_EMAIL </dev/tty
fi
if [ -z "${CERTBOT_EMAIL:-}" ]; then
  read -r -p "Certbot email (CERTBOT_EMAIL) [${ADMIN_EMAIL}]: " CERTBOT_EMAIL </dev/tty
  CERTBOT_EMAIL="${CERTBOT_EMAIL:-$ADMIN_EMAIL}"
fi

echo "==> Generate secrets"
mkdir -p secrets
openssl rand -hex 32 > secrets/traccar_service_token
openssl rand -base64 24 > secrets/admin_password
openssl rand -base64 24 > secrets/postgres_password
echo "$CERTBOT_EMAIL" > secrets/certbot_email
chmod 600 secrets/*

cp -n .env.production.example .env.production 2>/dev/null || cp .env.production.example .env.production

# shellcheck disable=SC1091
set -a
source .env.production
set +a

export DOMAIN="$DOMAIN"
export ADMIN_EMAIL="$ADMIN_EMAIL"
export ADMIN_NAME="${ADMIN_NAME:-Admin}"
export CERTBOT_EMAIL="$CERTBOT_EMAIL"
export TRACCAR_SERVICE_TOKEN="$(tr -d '\n\r' < secrets/traccar_service_token)"
export ADMIN_PASSWORD="$(tr -d '\n\r' < secrets/admin_password)"
export POSTGRES_PASSWORD="$(tr -d '\n\r' < secrets/postgres_password)"

cat > .env.production <<EOF
DOMAIN=${DOMAIN}
CERTBOT_EMAIL=${CERTBOT_EMAIL}
VITE_APP_NAME="Capture Tracking GPS"
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_API_BASE_URL=/api
IMAGE_TAG=latest
TRACCAR_URL=http://traccar:8082
POSTGRES_DB=traccar
POSTGRES_USER=traccar
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_NAME=${ADMIN_NAME}
TRACCAR_SERVICE_TOKEN=${TRACCAR_SERVICE_TOKEN}
GPS_PUBLIC_PORT=127.0.0.1:5023
EOF
chmod 600 .env.production

echo "==> Validate secrets"
./scripts/validate-production-secrets.sh
./scripts/audit-secrets.sh

echo "==> Deploy stack (HTTP — test on server IP before DNS)"
./scripts/deploy-production.sh http

IP="$(curl -4 -sf --max-time 10 ifconfig.me || hostname -I | awk '{print $1}')"
cat <<EOF

Bootstrap complete.

  App:    http://${IP}/
  API:    http://${IP}/api/server
  Login:  ${ADMIN_EMAIL}
  Password saved in: ${APP_DIR}/secrets/admin_password

  cat ${APP_DIR}/secrets/admin_password

Next (after DNS A records → ${IP}):
  cd ${APP_DIR}
  ./scripts/deploy-production.sh init
  ./scripts/deploy-production.sh verify

EOF
