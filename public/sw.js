const CACHE_NAME = 'trade-smart-live-v1'
const CORE_ASSETS = ['/', '/manifest.json', '/icon.svg', '/apple-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (event.request.url.startsWith(self.location.origin)) {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
    }
    return response
  }).catch(() => caches.match('/'))))
})
