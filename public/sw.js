

// ⚠️ Cambiá este número cada vez que hagas un deploy con cambios
const CACHE_VERSION = 'sanjose-v1.1';
const CACHE_NAME = CACHE_VERSION;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Instalación: pre-cachear assets estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versión:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Error al cachear algunos assets:', err);
      });
    })
  );
  // Forzar activación inmediata sin esperar a que se cierren las pestañas
  self.skipWaiting();
});

// Activación: limpiar TODOS los caches viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando versión:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Eliminando cache viejo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Tomar control de todos los clientes abiertos inmediatamente
      return self.clients.claim();
    })
  );
});

// Estrategia: Network First para HTML (siempre fresco), Cache First para assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API de Netlify/GAS → siempre network, nunca cachear
  if (url.pathname === '/api' || url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, error: 'Sin conexión. Verificá tu internet.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // index.html → Network First: intenta red, cae a cache solo si falla
  if (event.request.destination === 'document' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Guardamos la versión fresca en cache
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Otros assets (íconos, manifest) → Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || event.request.method !== 'GET') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Mensaje desde el frontend para forzar actualización
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
