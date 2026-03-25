'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'

interface ImpersonateButtonProps {
  userId: string
  userName: string
}

export function ImpersonateButton({ userId, userName }: ImpersonateButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleImpersonate() {
    if (!confirm(`Entrar como "${userName}"?`)) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao impersonar usuário')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleImpersonate}
      disabled={loading}
      title={`Entrar como ${userName}`}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white/40 hover:text-orange-400 hover:bg-orange-400/10 transition-colors disabled:opacity-40"
    >
      <LogIn className="w-3 h-3" />
      {loading ? '...' : 'Entrar'}
    </button>
  )
}
