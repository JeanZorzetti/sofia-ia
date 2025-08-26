// Service Worker temporariamente simplificado para resolver MIME type issues
console.log('🚀 Sofia IA PWA Service Worker carregado (modo simplificado)');

// Apenas registrar o SW sem interceptar requests por enquanto
self.addEventListener('install', (event) => {
  console.log('🚀 Sofia IA PWA - Service Worker instalando...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🔄 Sofia IA PWA - Service Worker ativando...');
  self.clients.claim();
});