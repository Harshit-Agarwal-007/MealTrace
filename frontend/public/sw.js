const CACHE_NAME = 'mealtrace-v1';

// Assets to pre-cache
const CACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  // If the request is for the backend API, handle caching the QR specifically
  if (e.request.url.includes('/api/v1/resident/qr-code')) {
    e.respondWith(
      caches.match(e.request).then(res => {
        // Return from cache if we have it, else try network
        return res || fetch(e.request).then(netRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, netRes.clone());
            return netRes;
          });
        });
      }).catch(() => {
        // If network fails and no cache, maybe return a fallback offline graphic
        return caches.match('/icon-192x192.png'); 
      })
    );
  } else {
    // Normal cache-first network fallback for static assets
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});
