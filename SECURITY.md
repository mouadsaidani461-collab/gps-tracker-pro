# Security — Secret rotation & history cleanup

This repository previously contained sensitive material in git history (SSH private key, `ADMIN_PASSWORD`, `TRACCAR_SERVICE_TOKEN`). Treat those credentials as **compromised** until rotated everywhere they were used.

## 1. Clean git history (one-time)

```bash
# From repository root
cp scripts/passwords.txt.example scripts/passwords.txt
# Edit scripts/passwords.txt — add literal: lines for any known leaked values

./scripts/clean-secrets.sh

# Review, then force-push (coordinate with collaborators first)
git push --force --all
git push --force --tags
```

Install local protection for future commits:

```bash
./scripts/setup-git-hooks.sh
```

## 2. Rotate SSH keys

**Where the old key may have been used:**

| System | Action |
|--------|--------|
| **GitHub** | Settings → SSH and GPG keys → remove old key → add new public key |
| **Hetzner** | Cloud Console → Security → SSH keys → remove old → add new; update `~/.ssh/authorized_keys` on the server |
| **Local machine** | `ssh-keygen -t ed25519 -C "your-email@example.com"` → store in `~/.ssh/`, never in the repo |

After rotation, verify login:

```bash
ssh -T git@github.com
ssh root@YOUR_HETZNER_IP
```

## 3. Rotate application secrets

Generate new values (never reuse leaked ones):

```bash
openssl rand -base64 24   # ADMIN_PASSWORD (min 12 characters)
openssl rand -hex 32      # TRACCAR_SERVICE_TOKEN
```

**Update on each environment:**

| Location | Files / steps |
|----------|----------------|
| **Hetzner production** | `gps-tracker-pro/secrets/admin_password`, `secrets/traccar_service_token`, `.env.production` |
| **Local Docker** | `gps-tracker-pro/.env` |
| **Traccar** | Service token in `docker-compose.production.yml` → `WEB_SERVICE_ACCOUNT_TOKEN`; restart stack after change |

On the server:

```bash
cd gps-tracker-pro
./scripts/validate-production-secrets.sh
./scripts/deploy-production.sh deploy
```

Re-bootstrap is only needed if the admin user password changed and you cannot log in — otherwise update via Traccar admin UI or API.

## 4. Rotation checklist

- [ ] Run `./scripts/clean-secrets.sh` and force-push history
- [ ] Revoke old SSH key (GitHub + Hetzner + any other host)
- [ ] Generate and deploy new `ADMIN_PASSWORD`
- [ ] Generate and deploy new `TRACCAR_SERVICE_TOKEN`
- [ ] Restart Docker stack on Hetzner
- [ ] Confirm login at `/login` and WebSocket notifications
- [ ] Run `./scripts/setup-git-hooks.sh` on every developer machine
- [ ] Run `gps-tracker-pro/scripts/audit-secrets.sh` before deploy

## 5. What must never be committed

- Private keys (`id_ed25519`, `id_rsa`, `*.pem`, `*.key`)
- `.env`, `.env.production`, `scripts/passwords.txt`
- `gps-tracker-pro/secrets/*` (except `*.example` and `README`)
- Real passwords or hex tokens in docs, scripts, or ROADMAP

Use `secrets/*.example` and `.env.production.example` for documentation only.

## 6. Reporting issues

If you discover exposed credentials, rotate immediately and notify the repository owner. Do not open a public issue with secret values.
