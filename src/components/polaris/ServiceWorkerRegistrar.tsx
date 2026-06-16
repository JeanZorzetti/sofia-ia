'use client'

import { useEffect } from 'react'

/**
 * ServiceWorkerRegistrar
 * Componente client-side que registra o service worker do PWA.
 * Não renderiza nada visualmente.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // Nova versão disponível — pode notificar o usuário se quiser
              console.log('[SW] Nova versão disponível. Recarregue para atualizar.')
            }
          })
        })
      } catch (error) {
        // Silencia erros de registro (ex: em desenvolvimento com HTTPS bloqueado)
        console.warn('[SW] Registro falhou:', error)
      }
    }

    registerSW()
  }, [])

  return null
}
