'use client'

/**
 * UpgradeModal — shown when user hits plan limits (soft block).
 *
 * Triggered via custom event:
 *   window.dispatchEvent(new CustomEvent('show-upgrade-modal', {
 *     detail: { resource: 'agents', current: 2, limit: 2, plan: 'free' }
 *   }))
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, X, Bot, MessageSquare, Database, ArrowRight } from 'lucide-react'

interface UpgradeModalDetail {
  resource?: 'agents' | 'messages' | 'knowledge_bases'
  current?: number
  limit?: number
  plan?: string
  message?: string
}

const RESOURCE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  agents: { label: 'agentes de IA', icon: Bot },
  messages: { label: 'mensagens mensais', icon: MessageSquare },
  knowledge_bases: { label: 'knowledge bases', icon: Database },
}

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 297/mês',
    highlight: true,
    features: ['20 agentes', '5.000 mensagens/mês', '10 Knowledge Bases', 'Suporte prioritário'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 'R$ 997/mês',
    highlight: false,
    features: ['Agentes ilimitados', 'Mensagens ilimitadas', 'KBs ilimitadas', 'White-label'],
  },
]

export function UpgradeModal() {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<UpgradeModalDetail>({})

  useEffect(() => {
    function handler(e: Event) {
      const custom = e as CustomEvent<UpgradeModalDetail>
      setDetail(custom.detail || {})
      setOpen(true)
    }
    window.addEventListener('show-upgrade-modal', handler)
    return () => window.removeEventListener('show-upgrade-modal', handler)
  }, [])

  if (!open) return null

  const resourceInfo = detail.resource ? RESOURCE_LABELS[detail.resource] : null
  const Icon = resourceInfo?.icon

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600/20 to-blue-600/20 border-b border-white/5 px-6 py-5">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {detail.plan === 'free' ? 'Limite do plano Free atingido' : 'Limite atingido'}
              </h2>
              {resourceInfo && detail.current !== undefined && (
                <p className="text-sm text-white/50 flex items-center gap-1.5 mt-0.5">
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {detail.current}/{detail.limit} {resourceInfo.label} utilizados
                </p>
              )}
              {!resourceInfo && detail.message && (
                <p className="text-sm text-white/50 mt-0.5">{detail.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 py-5">
          <p className="text-sm text-white/50 mb-4">Faça upgrade para continuar criando sem limites:</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`rounded-xl p-4 border transition-colors ${
                  plan.highlight
                    ? 'border-violet-500/50 bg-violet-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {plan.highlight && (
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Recomendado</span>
                )}
                <div className="font-bold text-white text-base mt-0.5">{plan.name}</div>
                <div className={`text-sm font-medium mb-3 ${plan.highlight ? 'text-violet-300' : 'text-white/50'}`}>
                  {plan.price}
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="text-xs text-white/60 flex items-center gap-1.5">
                      <span className="text-green-400 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard/billing"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Ver planos e fazer upgrade <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="mt-2 w-full py-2 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Continuar no plano Free
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Helper: dispatch the upgrade modal event from anywhere.
 */
export function showUpgradeModal(detail: UpgradeModalDetail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail }))
}
