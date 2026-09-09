/* FORGE · service worker: la app abre sin conexión.
   Estrategia: la página se pide primero a la red (así llegan las actualizaciones)
   y, si no hay conexión, se sirve la última copia guardada. */
const VERSION = 'forge-1.8.0';
const CORE = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Página principal: red primero, copia si falla
  if (req.mode === 'navigate' || url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Fuentes y librerías externas: copia primero, red para actualizar
  if (/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.host)) {
    e.respondWith(caches.match(req).then(hit => { const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; }).catch(() => hit); return hit || net; }));
  }
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
