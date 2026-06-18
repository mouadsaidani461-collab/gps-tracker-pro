# Capture Tracking GPS

لوحة تتبع الأسطول — React + Vite + Traccar API (Morocco 🇲🇦)

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4
- React Router DOM
- Leaflet (react-leaflet)
- Traccar REST + WebSocket

## Prerequisites

- **Traccar** running on `http://localhost:8082`
- Node.js 20+

## Getting Started

```bash
npm install
cp .env.example .env   # optional — defaults to /api proxy
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

Vite proxies `/api` → `http://localhost:8082` (cookies + WebSocket).

### Login

Use your **Traccar user** (Settings → Users on port 8082):

- Email: your Traccar admin email
- Password: your Traccar password (min 12 chars for production bootstrap)
- 2FA: optional field if TOTP enabled on Traccar

## Features

| Module | Source |
|--------|--------|
| Auth | Traccar session cookie |
| Vehicles | `/api/devices` + `/api/positions` + WS |
| Geofences | `/api/geofences` CRUD (circle + polygon) |
| Geofence ↔ Device | `/api/permissions` |
| Reports | `/api/reports/trips`, `events`, `summary` |
| Users (admin) | `/api/users` CRUD |
| Settings profile | `PUT /api/users/{id}` |
| Notifications | WebSocket events |

## Build

```bash
npm run build
npm run preview
```

## Docker

```bash
cd gps-tracker-pro
cp .env.production.example .env.production
# Edit .env.production — set ADMIN_EMAIL, ADMIN_PASSWORD, TRACCAR_SERVICE_TOKEN
docker compose -f docker-compose.production.yml --env-file .env.production up --build -d
```

- **App:** http://localhost:8080 (or `FRONTEND_PORT` in `.env.production`; edge nginx serves HTTPS in production)
- **Traccar admin:** internal only in production (via `/api` proxy)
- API + WebSocket proxied via nginx (`/api` → Traccar) — same-origin cookies, no CORS needed.

### First-time Traccar user (required)

Docker Traccar starts with an **empty database** — there is no default `admin/admin`.
Production bootstrap runs automatically via `traccar-init`. For manual dev setup:

```bash
cp .env.example .env
# Fill ADMIN_EMAIL, ADMIN_PASSWORD (min 12 chars), TRACCAR_SERVICE_TOKEN in .env
docker compose up -d
```

Or run the bootstrap script directly:

```bash
TRACCAR_URL=http://localhost:8082 \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='your-strong-password-here' \
TRACCAR_SERVICE_TOKEN='your-64-char-hex-token' \
./scripts/setup-traccar-admin.sh
```

Then login at http://localhost:3000/login with the same email/password.

**Verify proxy:**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/server   # 200
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/api/session \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'email=YOUR_EMAIL&password=YOUR_PASSWORD'                                 # 200
```

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/ROADMAP.md](./docs/ROADMAP.md) | خارطة الطريق — المراحل 0–5 |
| [docs/DEPLOY-HETZNER.md](./docs/DEPLOY-HETZNER.md) | نشر الإنتاج على Hetzner |
| [docs/TOTP-ENROLLMENT.md](./docs/TOTP-ENROLLMENT.md) | تفعيل 2FA |

## Project Structure

```
src/
├── context/       # Auth, Socket, Vehicle, Geofence, Notification
├── services/      # traccarApi, reportMapper, deviceMapper
├── hooks/         # useVehicles, useGeofences, useReports
├── pages/         # Dashboard, Map, Vehicles, Reports, Users, Settings
├── components/    # layout/, map/, dashboard/, ui/
└── utils/         # geofenceUtils, constants, formatters
```
