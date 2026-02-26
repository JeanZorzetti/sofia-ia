'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, X } from 'lucide-react'

interface TrialInfo {
  status: string
  trialEndsAt: string | null
}

export function TrialBanner() {
  const [trial, setTrial] = useState<TrialInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check dismissal from session storage (resets on tab close)
    if (typeof window !== 'undefined' && sessionStorage.getItem('trial_banner_dismissed')) {
      setDismissed(true)
      return
    }

    fetch('/api/user/usage')
      .then(r => r.json())
      .then(data => {
        if (data.subscription?.status === 'trialing' && data.subscription?.trialEndsAt) {
          setTrial({ status: 'trialing', trialEndsAt: data.subscription.trialEndsAt })
        }
      })
      .catch(() => {})
  }, [])

  function dismiss() {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('trial_banner_dismissed', '1')
    }
  }

  if (!trial || dismissed) return null

  const endsAt = new Date(trial.trialEndsAt!)
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  if (daysLeft <= 0) return null

  const isUrgent = daysLeft <= 2

  return (
    <div className={`flex items-center justify-between px-4 py-2 text-sm ${
      isUrgent
        ? 'bg-amber-500/15 border-b border-amber-500/30 text-amber-300'
        : 'bg-violet-500/10 border-b border-violet-500/20 text-violet-300'
    }`}>
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          {isUrgent ? (
            <>Trial Pro expira em <strong>{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</strong> — não perca o acesso</>
          ) : (
            <>Você está no <strong>Trial Pro</strong> — {daysLeft} dias restantes</>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/billing"
          className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
            isUrgent
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200'
              : 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-200'
          }`}
        >
          Fazer upgrade
        </Link>
        <button onClick={dismiss} className="opacity-50 hover:opacity-100 transition-opacity">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
