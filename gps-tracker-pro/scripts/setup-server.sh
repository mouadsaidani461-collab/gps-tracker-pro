#!/usr/bin/env bash
# Bootstrap a fresh Hetzner Ubuntu server for Capture GPS production.
#
# Run as root on the server (once):
#   curl -fsSL .../setup-server.sh | bash
#   or: sudo DEPLOYER_SSH_PUBKEY="$(cat ~/.ssh/id_ed25519.pub)" ./scripts/setup-server.sh
#
# Installs: Docker, Compose plugin, certbot, jq, ufw, age, rclone (optional)
# Creates: deployer user with docker group + SSH key

set -euo pipefail

DEPLOYER_USER="${DEPLOYER_USER:-deployer}"
DEPLOYER_SSH_PUBKEY="${DEPLOYER_SSH_PUBKEY:-}"
APP_DIR="${APP_DIR:-/opt/gps-tracker-pro}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> System update"
apt-get update -qq
apt-get upgrade -y -qq

echo "==> Base packages"
apt-get install -y -qq \
  ca-certificates curl git jq ufw gnupg age \
  openssl dnsutils netcat-openbsd

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
systemctl enable --now docker

echo "==> certbot (host — optional; primary renewal is Docker certbot service)"
apt-get install -y -qq certbot || true

echo "==> rclone (optional — for backups)"
if ! command -v rclone >/dev/null 2>&1; then
  curl -fsSL https://rclone.org/install.sh | bash || echo "WARN: rclone install skipped"
fi

echo "==> Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
# Uncomment if GPS devices connect directly:
# ufw allow 5023/tcp
echo "y" | ufw enable || true

echo "==> User: ${DEPLOYER_USER}"
if ! id "$DEPLOYER_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$DEPLOYER_USER"
fi
usermod -aG docker "$DEPLOYER_USER"

DEPLOYER_HOME="$(eval echo "~${DEPLOYER_USER}")"
mkdir -p "${DEPLOYER_HOME}/.ssh"
chmod 700 "${DEPLOYER_HOME}/.ssh"

if [ -n "$DEPLOYER_SSH_PUBKEY" ]; then
  echo "$DEPLOYER_SSH_PUBKEY" >> "${DEPLOYER_HOME}/.ssh/authorized_keys"
  sort -u "${DEPLOYER_HOME}/.ssh/authorized_keys" -o "${DEPLOYER_HOME}/.ssh/authorized_keys"
  echo "SSH public key added for ${DEPLOYER_USER}"
else
  echo "WARN: Set DEPLOYER_SSH_PUBKEY to enable passwordless SSH for CI/CD"
fi
chmod 600 "${DEPLOYER_HOME}/.ssh/authorized_keys"
chown -R "${DEPLOYER_USER}:${DEPLOYER_USER}" "${DEPLOYER_HOME}/.ssh"

echo "==> App directory: ${APP_DIR}"
mkdir -p "$APP_DIR"
chown "${DEPLOYER_USER}:${DEPLOYER_USER}" "$APP_DIR"

echo "==> Backup directory"
mkdir -p /var/backups/capture-gps
chown "${DEPLOYER_USER}:${DEPLOYER_USER}" /var/backups/capture-gps

cat <<EOF

Setup complete.

Next steps (as ${DEPLOYER_USER}):
  git clone <repo> ${APP_DIR}
  cd ${APP_DIR}/gps-tracker-pro
  cp .env.production.example .env.production
  # fill secrets + HETZNER_DNS_API_TOKEN
  ./scripts/deploy-production.sh init

Cron suggestions (crontab -e):
  0 2 * * * ${APP_DIR}/gps-tracker-pro/scripts/backup.sh >> /var/log/capture-backup.log 2>&1
  */5 * * * * ${APP_DIR}/gps-tracker-pro/scripts/monitor.sh >> /var/log/capture-monitor.log 2>&1

GitHub Secrets for CD:
  HETZNER_HOST, HETZNER_SSH_KEY, HETZNER_USER=deployer
  HETZNER_DNS_API_TOKEN (for init DNS)

EOF
