'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, X } from 'lucide-react'

function getImpersonatingCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('sofia_impersonating='))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

export function ImpersonationBanner() {
  const [adminName, setAdminName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setAdminName(getImpersonatingCookie())
  }, [])

  if (!adminName) return null

  async function handleRestore() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/impersonate/restore', { method: 'POST' })
      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        alert('Erro ao restaurar sessão admin')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm bg-orange-500/15 border-b border-orange-500/30 text-orange-300">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Você está visualizando como outro usuário —{' '}
          <span className="opacity-60 text-xs">logado originalmente como {adminName}</span>
        </span>
      </div>
      <button
        onClick={handleRestore}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-orange-500/20 hover:bg-orange-500/30 transition-colors disabled:opacity-50"
      >
        <X className="w-3 h-3" />
        {loading ? 'Restaurando...' : 'Voltar para admin'}
      </button>
    </div>
  )
}
