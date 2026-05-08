const CACHE_NAME = 'gullycric-v2';

// Only cache assets that actually exist
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fails atomically — only cache files we know exist
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch(() => {
            // Silently skip assets that fail to cache
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept Supabase API or WebSocket calls
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Never cache POST/PUT/DELETE
  if (event.request.method !== 'GET') {
    return;
  }

  // Cache-first for known static shell assets
  if (ASSETS_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Network-first for everything else (JS bundles, API)
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
