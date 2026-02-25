'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * InstallPWA
 * Detecta o evento beforeinstallprompt e exibe um botão "Instalar App"
 * quando disponível (Chrome/Edge em Desktop e Android).
 */
export function InstallPWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Verifica se o usuário já dispensou o banner nesta sessão
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed')
    if (wasDismissed) {
      setDismissed(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) return

    setInstalling(true)
    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        setInstallPrompt(null)
        setDismissed(true)
      }
    } catch (error) {
      console.warn('[PWA] Install failed:', error)
    } finally {
      setInstalling(false)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    sessionStorage.setItem('pwa-install-dismissed', '1')
  }

  // Não exibe se não há prompt ou se foi dispensado
  if (!installPrompt || dismissed) return null

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 text-xs h-8"
        onClick={handleInstall}
        disabled={installing}
      >
        <Download className="h-3 w-3" />
        {installing ? 'Instalando...' : 'Instalar App'}
      </Button>
      <button
        onClick={handleDismiss}
        className="text-white/30 hover:text-white/60 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
