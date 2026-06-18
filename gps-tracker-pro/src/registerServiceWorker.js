/**
 * Register production service worker and notify AppUpdateBanner on new version.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(
              new CustomEvent('capture:sw-update', { detail: { worker } }),
            );
          }
        });
      });
    }).catch(() => {
      // SW optional — app works without offline shell
    });
  });
}
