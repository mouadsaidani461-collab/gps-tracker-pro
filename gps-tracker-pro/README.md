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

- Email: `mouadsaidani461@gmail.com` (example)
- Password: your Traccar password
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
docker compose up --build
```

Set `VITE_API_BASE_URL` at build time to your Traccar URL for production.

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
