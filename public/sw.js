const CACHE_NAME = 'sofia-ai-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
]

// Install: abre o cache e adiciona os assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Ignora erros em assets que não puderem ser cacheados no install
        console.warn('[SW] Failed to cache some assets:', err)
      })
    })
  )
  // Ativa imediatamente sem esperar o reload
  self.skipWaiting()
})

// Activate: remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Toma controle de todas as páginas abertas imediatamente
  self.clients.claim()
})

// Fetch: estratégia Network First para navegação, Cache First para assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições non-GET e de outros domínios
  if (request.method !== 'GET') return
  if (!url.origin.includes(self.location.origin) && !url.origin.includes('sofiaia.roilabs.com.br')) return

  // Ignora chamadas de API (sempre network)
  if (url.pathname.startsWith('/api/')) return

  // Para navegação (páginas HTML): Network First com fallback para /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Salva a resposta no cache
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })
          return response
        })
        .catch(() => {
          return caches.match('/offline') || caches.match('/')
        })
    )
    return
  }

  // Para assets estáticos: Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })
          return response
        })
      })
    )
    return
  }
})

// Push notifications (Web Push API)
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Sofia AI', body: event.data.text() }
  }

  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/dashboard' },
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Sofia AI', options)
  )
})

// Clique na notificação: abre ou foca a janela
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
