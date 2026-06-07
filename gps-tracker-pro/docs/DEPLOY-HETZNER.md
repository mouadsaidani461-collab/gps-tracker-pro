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

Point DNS:

| Record | Value |
|---|---|
| `A` gps-tracker-pro.ma | `<HETZNER_IP>` |
| `A` www.gps-tracker-pro.ma | `<HETZNER_IP>` |

## 2. Secrets (rotate defaults)

```bash
cd gps-tracker-pro
cp .env.production.example .env.production

# Generate strong secrets
openssl rand -hex 32    # → TRACCAR_SERVICE_TOKEN
openssl rand -base64 24 # → ADMIN_PASSWORD (min 12 chars)

# Edit .env.production — NEVER use admin123 or capture-bootstrap-change-me
nano .env.production
```

## 3. First deploy

```bash
chmod +x scripts/deploy-production.sh scripts/setup-traccar-admin.sh
./scripts/deploy-production.sh init
```

This will:

1. Build the hardened frontend image (`node:24-alpine` → `nginx:alpine-slim`)
2. Start Traccar with `WEB_REGISTRATION=false`
3. Bootstrap admin via service token
4. Disable public registration via Traccar API
5. Obtain Let's Encrypt certificate
6. Start edge nginx with HSTS + CSP

## 4. Verify

```bash
./scripts/deploy-production.sh verify
curl -s https://gps-tracker-pro.ma/api/server | jq .
curl -sI https://gps-tracker-pro.ma/ | grep -i strict-transport
```

Expected: HTTP 200 from `/api/server`, `Strict-Transport-Security` header present.

## 5. Updates

```bash
git pull
./scripts/deploy-production.sh deploy
```

## Security checklist

- [ ] `.env.production` not in git (see `.gitignore`)
- [ ] `ADMIN_PASSWORD` ≥ 12 chars, not `admin123`
- [ ] `TRACCAR_SERVICE_TOKEN` rotated (32+ hex)
- [ ] Port 8082 not in `ufw` / Hetzner firewall
- [ ] `docker scout quickview capture-tracking-gps:latest` — 0 HIGH
- [ ] Login works; public `/api/users` POST without token returns 401

## Troubleshooting

| Issue | Fix |
|---|---|
| certbot fails | Ensure DNS propagated; port 80 open |
| edge won't start | Certs missing — re-run `deploy-production.sh init` |
| Bootstrap failed | Check `docker logs traccar-init`; verify service token |
| WebSocket disconnects | Edge proxy must pass `Upgrade` — handled by frontend nginx |

## Week 1.2 preview (PostgreSQL)

See `docker-compose.production.yml` — add `postgres` service and switch `traccar.production.xml` to PostgreSQL driver (planned Week 1.2).
