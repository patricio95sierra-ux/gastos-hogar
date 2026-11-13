// Service Worker — Gastos del Hogar
// Estrategia: red primero, caché como respaldo offline
// No intercepta Firebase ni dominios externos

const CACHE_NAME = 'gastos-v1';
const SELF_ORIGIN = self.location.origin;

// Recursos propios a cachear (archivos locales del sitio)
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Dominios externos que NO interceptamos nunca
const EXTERNAL_SKIP = [
  'firebaseio.com',
  'googleapis.com',
  'gstatic.com',
  'firebase.google.com',
  'cdnjs.cloudflare.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // No interceptar dominios externos (Firebase, CDNs, etc.)
  if (url.origin !== SELF_ORIGIN) return;
  if (EXTERNAL_SKIP.some(d => url.hostname.includes(d))) return;
  // No interceptar requests que no sean GET
  if (event.request.method !== 'GET') return;

  // Estrategia: red primero → caché como respaldo
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar copia en caché si es válida
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin red: servir desde caché
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback a index.html para navegación
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
