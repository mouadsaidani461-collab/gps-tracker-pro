# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS build

# Patch Alpine packages (node:20-alpine ships 11 HIGH CVEs in bundled npm)
RUN apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite embeds VITE_* variables at build time
ARG VITE_APP_NAME="Capture Tracking GPS"
ARG VITE_API_BASE_URL="/api"
ARG VITE_MAP_TILE_URL="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"

ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_MAP_TILE_URL=$VITE_MAP_TILE_URL

RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM nginx:alpine-slim AS production

# Apply Alpine security patches (slim image has fewer packages = smaller attack surface)
RUN apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

LABEL org.opencontainers.image.title="Capture Tracking GPS" \
      org.opencontainers.image.description="GPS fleet tracking dashboard (React SPA)"

RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
