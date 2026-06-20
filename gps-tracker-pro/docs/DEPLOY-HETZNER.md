# Hetzner Production Deploy — GPS Tracker Pro

Deploy **https://gps-tracker-pro.ma** on Hetzner CX33 with Docker Compose, Let's Encrypt SSL, hardened Traccar, and no public API ports.

## Architecture

```
Internet :443/:80
    └── edge (nginx + SSL + HSTS + CSP)
            └── app (React SPA + /api proxy)
                    └── traccar:8082 (internal only)
                            └── postgres:5432 (internal only)
GPS devices → optional :5023 (bind via GPS_PUBLIC_PORT)
```

- **8082** is never published to the public internet.
- **5023** defaults to `127.0.0.1:5023` — open only if trackers connect directly to this host.

## 1. Server prep (Hetzner CX33)

One-shot bootstrap (recommended):

```bash
sudo DEPLOYER_SSH_PUBKEY="$(cat ~/.ssh/id_ed25519.pub)" ./scripts/setup-server.sh
```

Or manually:

```bash
# Ubuntu 24.04
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin ufw curl jq certbot age

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Only if GPS devices hit this server directly:
# sudo ufw allow 5023/tcp
sudo ufw enable
```

## 2. Secrets

```bash
cd gps-tracker-pro
git pull
cp .env.production.example .env.production

openssl rand -hex 32    # → TRACCAR_SERVICE_TOKEN
openssl rand -base64 24 # → ADMIN_PASSWORD (min 12 chars)
openssl rand -base64 24 # → POSTGRES_PASSWORD

nano .env.production   # ADMIN_EMAIL, CERTBOT_EMAIL, DOMAIN, secrets
# Optional: HETZNER_DNS_API_TOKEN (or secrets/hetzner_dns_api_token)

./scripts/validate-production-secrets.sh
./scripts/audit-secrets.sh
```

## 3. Pre-DNS / pre-SSL test (HTTP on server IP)

Before pointing DNS, verify the stack on Hetzner IP:

```bash
chmod +x scripts/deploy-production.sh scripts/setup-traccar-admin.sh scripts/render-edge-conf.sh
./scripts/deploy-production.sh http
```

Test: `http://<HETZNER_IP>/` and `http://<HETZNER_IP>/api/server`

Uses `edge.local.conf` (HTTP only, no certificates required).

## 4. DNS

**Automatic (Hetzner DNS API):** set `HETZNER_DNS_API_TOKEN` in `.env.production` or GitHub Secrets — `init` creates/updates A records.

**Manual:**

| Record | Value |
|---|---|
| `A` gps-tracker-pro.ma | `<HETZNER_IP>` |
| `A` www.gps-tracker-pro.ma | `<HETZNER_IP>` |

Verify: `dig +short gps-tracker-pro.ma A`

## 5. First SSL deploy

```bash
./scripts/deploy-production.sh init
```

This will:

1. Create/update Hetzner DNS A records (if API token set)
2. Build app image
3. Start PostgreSQL + Traccar + bootstrap admin
4. Start edge on **HTTP** with ACME webroot (`edge.local.conf`)
5. Obtain Let's Encrypt certificate via certbot
6. Render `edge.conf` from template and switch to **HTTPS**
7. Persist `EDGE_NGINX_CONF=./docker/nginx/edge.conf` in `.env.production`
8. Start certbot renew loop

Stack file: `docker-compose.prod.yml` (PostgreSQL 14, app, edge, certbot).

## 6. Verify

```bash
./scripts/deploy-production.sh verify
curl -s https://gps-tracker-pro.ma/api/server | head -c 200
curl -sI https://gps-tracker-pro.ma/ | grep -i strict-transport
```

## 7. Updates

Manual:

```bash
git pull
./scripts/deploy-production.sh deploy
```

CI/CD (GitHub Actions): push to `main`/`master` runs `.github/workflows/cd.yml` → SSH deploy + verify.

Required GitHub Secrets: `HETZNER_HOST`, `HETZNER_SSH_KEY`, optional `DEPLOY_PATH`, `SLACK_WEBHOOK_URL`.

## 8. Backups

```bash
# Daily (cron): encrypted pg_dump + traccar volume → rclone/S3
0 2 * * * /opt/gps-tracker-pro/gps-tracker-pro/scripts/backup.sh
```

Configure in `.env.production`: `AGE_PUBLIC_KEY` or `BACKUP_GPG_RECIPIENT`, `RCLONE_REMOTE` or `AWS_S3_BUCKET`. Retention: 7 days.

## 9. Monitoring

```bash
# Every 5 min (cron)
*/5 * * * * /opt/gps-tracker-pro/gps-tracker-pro/scripts/monitor.sh
```

Checks: Traccar :8082, HTTPS, disk >80%, SSL <30 days, memory/CPU. Alerts via `ALERT_WEBHOOK_URL` or Mailgun/SendGrid.

## Security checklist

- [ ] `.env.production` and `.env` not in git (see `.gitignore`)
- [ ] `./scripts/audit-secrets.sh` passes
- [ ] `./scripts/validate-production-secrets.sh` passes
- [ ] Secrets rotated if `.env` was ever committed
- [ ] `ADMIN_PASSWORD` ≥ 12 chars
- [ ] `TRACCAR_SERVICE_TOKEN` 32+ hex
- [ ] `POSTGRES_PASSWORD` ≥ 12 chars
- [ ] Port 8082 not in `ufw` / Hetzner firewall
- [ ] Login works; public `/api/users` POST without token returns 401

## Troubleshooting

| Issue | Fix |
|---|---|
| `init` DNS error | Point A records first; use `deploy-production.sh http` for pre-DNS |
| certbot fails | DNS propagated; port 80 open; edge running with ACME location |
| edge won't start (SSL) | Certs missing — re-run `init` or check `/etc/letsencrypt/live/` |
| Bootstrap failed | `docker logs traccar-init`; verify service token |
| Old icons in browser | Hard refresh Cmd+Shift+R; bump `?v=` in manifest |
| WebSocket disconnects | Edge → app nginx handles `Upgrade` |

## PostgreSQL

Production uses **PostgreSQL 14** via `docker-compose.prod.yml`. Password only in `.env.production` / `secrets/postgres_password` — never in compose files.

Fresh server: `init` creates a new database. Migrating from H2 requires a separate migration window (see ROADMAP.md).
