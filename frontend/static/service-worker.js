// Unified and improved service worker for Beyond-QWERTY
const CACHE_NAME = 'bank-form-cache-v2';
const urlsToCache = [
  '/',
  '/auth/auth_form.html',
  '/bankform/bank_form.html',
  '/static/auth_style.css',
  '/static/bank_style.css',
  '/static/auth_script.js',
  '/static/bank_script.js',
  '/static/icon.png',
  '/static/icon-512x512.png',
  '/static/manifest.json',
];

// Install event: cache all required assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});

// Fetch event: serve from cache, fallback to network, fallback to offline page
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // Optionally, return a fallback page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/auth/auth_form.html');
        }
      });
    })
  );
});
