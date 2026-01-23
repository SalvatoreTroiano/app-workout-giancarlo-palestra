// service-worker.js
const CACHE_VERSION = 'v4';
const CACHE_NAME = `workout-giancarlo-${CACHE_VERSION}-${new Date().toISOString().split('T')[0]}`;

// Risorse da mettere in cache
const FILES_TO_CACHE = [
  '/app-workout-giancarlo-palestra/',
  '/app-workout-giancarlo-palestra/index.html',
  '/app-workout-giancarlo-palestra/manifest.json',
  'https://cdn.tailwindcss.com'
];

// Installa il Service Worker
self.addEventListener('install', event => {
  console.log(`Service Worker ${CACHE_NAME}: Installato`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Mettendo in cache le risorse');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        // Forza l'attivazione immediata del nuovo service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Errore durante l\'installazione:', error);
      })
  );
});

// Attiva il Service Worker e pulisci le vecchie cache
self.addEventListener('activate', event => {
  console.log(`Service Worker ${CACHE_NAME}: Attivato`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Elimina tutte le cache che non sono quella corrente
          if (!cacheName.includes(CACHE_NAME)) {
            console.log(`Service Worker: Rimozione vecchia cache ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Prendi il controllo di tutti i client
      return self.clients.claim();
    })
    .then(() => {
      // Invia messaggio alla pagina principale per notificare l'attivazione
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            cacheName: CACHE_NAME
          });
        });
      });
    })
  );
});

// Intercetta le richieste
self.addEventListener('fetch', event => {
  const requestUrl = event.request.url;
  
  // Non cache le richieste di stampa PDF, blob o richieste non GET
  if (requestUrl.includes('blob:') || 
      event.request.method !== 'GET' ||
      requestUrl.includes('chrome-extension://') ||
      requestUrl.includes('safari-extension://') ||
      requestUrl.includes('moz-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se la risorsa è in cache, restituiscila
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Altrimenti fai la richiesta e metti in cache
        return fetch(event.request)
          .then(response => {
            // Controlla se la risposta è valida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona la risposta per metterla in cache
            const responseToCache = response.clone();

            // Metti in cache solo se è della stessa origine o risorse importanti
            const requestUrl = event.request.url;
            const isSameOrigin = requestUrl.startsWith(self.location.origin);
            const isImportantResource = FILES_TO_CACHE.some(url => 
              requestUrl.includes(url.replace('https://cdn.tailwindcss.com', '')) ||
              requestUrl === url
            );

            if (isSameOrigin || isImportantResource) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                })
                .catch(error => {
                  console.warn('Cache put failed:', error);
                });
            }

            return response;
          })
          .catch(error => {
            console.error('Fetch fallito:', error);
            // Fallback per la homepage
            if (event.request.mode === 'navigate') {
              return caches.match('/app-workout-giancarlo-palestra/index.html');
            }
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
  );
});

// Gestisci i messaggi dalla pagina principale
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('Ricevuto comando per pulire la cache');
    
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log(`Pulizia cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Notifica che la cache è stata pulita
      event.ports && event.ports[0] && event.ports[0].postMessage({ 
        type: 'CACHE_CLEARED' 
      });
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});