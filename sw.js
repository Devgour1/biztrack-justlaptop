// BizTrack Service Worker - Offline Support
const CACHE_NAME = 'biztrack-v1';
const ASSETS = [
  './',
  './index.html',
  './orders.html',
  './products.html',
  './finances.html',
  './invoice.html',
  './help.html',
  './about.html',
  './styles.css',
  './script.js',
  './orders.js',
  './products.js',
  './finances.js',
  './help.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/apexcharts/3.45.2/apexcharts.min.js',
  'https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;0,900&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
