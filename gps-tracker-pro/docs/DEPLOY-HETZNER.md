# Hetzner Production Deploy — GPS Tracker Pro

Deploy **https://gps-tracker-pro.ma** on Hetzner CX33 with Docker Compose, Let's Encrypt SSL, hardened Traccar, and no public API ports.

## Architecture

```
Internet :443/:80
    └── edge (nginx + SSL + HSTS + CSP)
            └── frontend (React SPA + /api proxy)
                    └── traccar:8082 (internal only)
GPS devices → optional :5023 (bind via GPS_PUBLIC_PORT)
```

- **8082** is never published to the public internet.
- **5023** defaults to `127.0.0.1:5023` — open only if trackers connect directly to this host.

## 1. Server prep (Hetzner CX33)

```bash
# Ubuntu 24.04
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin ufw curl

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

nano .env.production   # ADMIN_EMAIL, CERTBOT_EMAIL, DOMAIN, secrets

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

## 4. DNS (required before SSL)

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

1. Build frontend image
2. Start Traccar + bootstrap admin
3. Start edge on **HTTP** with ACME webroot (`edge.local.conf`)
4. Obtain Let's Encrypt certificate via certbot
5. Render `edge.conf` from template and switch to **HTTPS**
6. Persist `EDGE_NGINX_CONF=./docker/nginx/edge.conf` in `.env.production`
7. Start certbot renew loop

## 6. Verify

```bash
./scripts/deploy-production.sh verify
curl -s https://gps-tracker-pro.ma/api/server | head -c 200
curl -sI https://gps-tracker-pro.ma/ | grep -i strict-transport
```

## 7. Updates

```bash
git pull
./scripts/deploy-production.sh deploy
```

## Security checklist

- [ ] `.env.production` and `.env` not in git (see `.gitignore`)
- [ ] `./scripts/audit-secrets.sh` passes
- [ ] `./scripts/validate-production-secrets.sh` passes
- [ ] Secrets rotated if `.env` was ever committed
- [ ] `ADMIN_PASSWORD` ≥ 12 chars
- [ ] `TRACCAR_SERVICE_TOKEN` 32+ hex
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
| WebSocket disconnects | Edge → frontend nginx handles `Upgrade` |

## PostgreSQL (المرحلة 3)

انظر [ROADMAP.md](./ROADMAP.md) — المرحلة 3: migration من H2 إلى PostgreSQL.
