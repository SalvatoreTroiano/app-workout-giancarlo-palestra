const CACHE_NAME = 'workout-giancarlo-v3';


const FILES_TO_CACHE = [
  '/app-workout-giancarlo-palestra/',
  '/app-workout-giancarlo-palestra/index.html',
  '/app-workout-giancarlo-palestra/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request))
  );
});
