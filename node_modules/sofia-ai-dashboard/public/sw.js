// 🚀 SOFIA IA - SERVICE WORKER PWA
// Versão do cache - incrementar para forçar atualização
const CACHE_NAME = 'sofia-ia-v1.0.0';
const OFFLINE_URL = '/';

// Arquivos essenciais para cache
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Arquivos de API para cache estratégico
const API_CACHE_PATTERNS = [
  /\/api\/dashboard\/overview/,
  /\/api\/conversations\/recent/,
  /\/api\/leads/,
  /\/health/
];

// 🟢 INSTALAÇÃO DO SERVICE WORKER
self.addEventListener('install', (event) => {
  console.log('🚀 Sofia IA PWA - Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cache criado:', CACHE_NAME);
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('✅ Arquivos core cacheados');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Erro no cache inicial:', error);
      })
  );
});

// 🔄 ATIVAÇÃO DO SERVICE WORKER
self.addEventListener('activate', (event) => {
  console.log('🔄 Sofia IA PWA - Service Worker ativando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker ativado');
        return self.clients.claim();
      })
  );
});

// 📡 INTERCEPTAÇÃO DE REQUISIÇÕES
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Estratégia Cache First para assets estáticos
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            console.log('📦 Servindo do cache:', request.url);
            return response;
          }
          
          return fetch(request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, responseClone));
              }
              return response;
            });
        })
        .catch(() => {
          console.log('🔄 Recurso não disponível offline:', request.url);
        })
    );
    return;
  }
  
  // Estratégia Network First para APIs com fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache respostas de API importantes
          if (response.status === 200 && 
              API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          console.log('🔄 API offline, tentando cache:', request.url);
          return caches.match(request)
            .then(response => {
              if (response) {
                console.log('📦 API do cache:', request.url);
                return response;
              }
              
              // Resposta offline padrão para APIs críticas
              if (url.pathname.includes('/dashboard/overview')) {
                return new Response(JSON.stringify({
                  conversas_hoje: 0,
                  taxa_conversao: 0,
                  leads_qualificados: 0,
                  growth_rate: 0,
                  offline: true
                }), {
                  headers: { 'Content-Type': 'application/json' }
                });
              }
              
              throw new Error('Recurso não disponível offline');
            });
        })
    );
    return;
  }
  
  // Estratégia Cache First para navegação
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/')
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request);
        })
        .catch(() => {
          return caches.match('/');
        })
    );
    return;
  }
});

// 💾 CACHE STRATEGY DINÂMICO
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_API_RESPONSE') {
    const { url, data } = event.data;
    
    caches.open(CACHE_NAME)
      .then(cache => {
        const response = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
        cache.put(url, response);
        console.log('📦 Cache API manual:', url);
      });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 🔔 PREPARAÇÃO PARA PUSH NOTIFICATIONS (FUTURO)
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification recebida');
  
  const options = {
    body: event.data ? event.data.text() : 'Nova atualização Sofia IA',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore', 
        title: 'Abrir Sofia IA',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close', 
        title: 'Fechar',
        icon: '/icon-72x72.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Sofia IA', options)
  );
});

console.log('🚀 Sofia IA PWA Service Worker carregado com sucesso!');