const CACHE_NAME = 'trade-smart-live-v3'
const CORE_ASSETS = ['/', '/manifest.json', '/icon.svg', '/apple-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  const request = event.request
  const isMutable = request.mode === 'navigate' || request.url.includes('/api/') || request.url.includes('/_next/')
  event.respondWith(fetch(request).then((response) => {
    if (response.ok && !isMutable) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
    return response
  }).catch(() => caches.match(request).then((cached) => cached || caches.match('/'))))
})
