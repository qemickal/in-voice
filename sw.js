/* Service Worker — caché offline */
const CACHE = 'mc-pwa-v15';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/layout.js',
  './js/render.js',
  './js/pdf.js',
  './js/sync.js',
  './js/app.js',
  './assets/js/jspdf.umd.min.js',
  './assets/fonts/spacegrotesk-latin.woff2',
  './assets/fonts/SpaceGrotesk-Light.ttf',
  './assets/fonts/SpaceGrotesk-Regular.ttf',
  './assets/fonts/SpaceGrotesk-Medium.ttf',
  './assets/fonts/SpaceGrotesk-Bold.ttf',
  './assets/img/logo-blue.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
