/**
 * Service Worker - Comunidad San José
 * ⚠️ Importante: Incrementá el número de versión (v1.x) cada vez que realices 
 * cambios en el CSS o JS para que los usuarios reciban la actualización.
 */
const CACHE_VERSION = 'sanjose-v1.3';
const CACHE_NAME = CACHE_VERSION;

// Lista de archivos para funcionamiento offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Si tenés archivos CSS o JS externos locales, agregalos acá
];

// 1. Instalación: Guardar archivos estáticos en el caché
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando nueva versión:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Error al cachear assets:', err);
      });
    })
  );
  // Forzar que el nuevo SW tome el control inmediatamente
  self.skipWaiting();
});

// 2. Activación: Limpiar versiones viejas de caché
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado y listo.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Borrando caché antiguo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Reclamar el control de todas las pestañas abiertas
  return self.clients.claim();
});

// 3. Estrategias de carga (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ESTRATEGIA PARA API: Network Only (No cachear datos de la base de datos)
  if (url.pathname === '/api') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Si falla la red al llamar a la API, devolvemos un error JSON amigable
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Sin conexión. No se pudo conectar con el servidor.' 
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // ESTRATEGIA PARA HTML: Network First (Intentar red, si falla usar caché)
  if (event.request.destination === 'document' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Si la respuesta es válida, guardamos una copia fresca
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Si no hay internet, cargamos el index desde el caché
          return caches.match('/index.html');
        })
    );
    return;
  }

  // ESTRATEGIA PARA ASSETS (Imágenes, íconos, etc): Cache First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        // Solo cacheamos respuestas exitosas
        if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        return networkResponse;
      }).catch(() => {
        // Si falla todo, devolvemos una respuesta vacía o error silencioso
        return new Response('Offline');
      });
    })
  );
});
