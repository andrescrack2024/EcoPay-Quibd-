/* ==========================================================================
   EcoPay Quibdó - Service Worker Robusto v10.0.0
   Soporte 100% Offline y Tolerancia a Fallos con ignoreSearch: true
   ========================================================================== */

const CACHE_NAME = 'ecopay-shell-v10.0.0';
const WEATHER_CACHE_NAME = 'ecopay-weather-v10.0';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './assets/hero.jpg',
  './assets/card1.jpg',
  './assets/card2.jpg',
  './assets/card3.jpg',
  './assets/card4.jpg',
  './assets/worker.jpg',
  './assets/truck.jpg',
  './assets/river.jpg',
  './assets/bin.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW EcoPay v10] Cacheando App Shell completo...');
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== WEATHER_CACHE_NAME) {
            console.log('[SW EcoPay v10] Purgando caché obsoleta:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Solicitudes Open-Meteo
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(WEATHER_CACHE_NAME).then((c) => c.put(request, clone));
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          return new Response(JSON.stringify({
            offline: true,
            current: { time: new Date().toISOString(), precipitation: 0, weather_code: 3, temperature_2m: 26 },
            hourly: { time: [new Date().toISOString()], precipitation_probability: [40], precipitation: [0] }
          }), { headers: { 'Content-Type': 'application/json' } });
        })
    );
    return;
  }

  // Navegación HTML
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match('./index.html', { ignoreSearch: true }) || caches.match('./', { ignoreSearch: true });
        })
    );
    return;
  }

  // Archivos estáticos (CSS, JS, Imágenes) con ignoreSearch: true
  event.respondWith(
    fetch(request)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return networkRes;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
