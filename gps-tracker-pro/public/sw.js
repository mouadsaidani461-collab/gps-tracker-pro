/* Capture Tracking GPS — service worker (app shell + offline fallback) */
/* Build version token below is replaced at build time by vite.config.js */
self.__BUILD_VERSION__ = '@CAPTURE_BUILD_VERSION@';
const CACHE_NAME = 'gps-tracker-pro-v' + self.__BUILD_VERSION__;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json?v=2',
  '/favicon.ico?v=2',
  '/16x16.png?v=2',
  '/32x32.png?v=2',
  '/180x180.png?v=2',
  '/192x192.png?v=2',
  '/512x512.png?v=2',
  '/maskable-icon.png?v=2',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/logo.svg',
];

const OFFLINE_BODY = `<!doctype html>
<html lang="en" dir="auto">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#020617" />
  <title>Capture Tracking GPS — Offline</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      font-family: Inter, system-ui, sans-serif;
      background: #020617;
      color: #f1f5f9;
      text-align: start;
    }
    main {
      max-width: 22rem;
      text-align: center;
    }
    h1 {
      font-size: 1.125rem;
      font-weight: 700;
      margin-block-end: 0.5rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.9375rem;
      line-height: 1.5;
      margin-block-end: 1.25rem;
    }
    button {
      border: 0;
      border-radius: 0.5rem;
      padding: 0.625rem 1.25rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      background: #06b6d4;
      color: #020617;
    }
  </style>
</head>
<body>
  <main>
    <h1 dir="auto">You are offline</h1>
    <p dir="auto">Live fleet data needs a network connection. Check your connection and try again.</p>
    <button type="button" onclick="location.reload()">Retry</button>
  </main>
</body>
</html>`;

function offlineResponse() {
  return new Response(OFFLINE_BODY, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;
  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached || offlineResponse();
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});
