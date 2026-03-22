// public/sw.js
const CACHE_NAME = 'sanjose-v1.5';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // IMPORTANTE: Ignorar peticiones que no sean http o https (evita error de chrome-extension)
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // La API siempre va a la red, nunca al caché
  if (url.pathname === '/api') {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({success:false, error:'Sin red'}), {headers:{'Content-Type':'application/json'}}))
    );
    return;
  }

  // Estrategia: Red primero, si falla, Caché
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (event.request.method === 'GET' && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
