'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  Building2,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { PLANS } from '@/lib/mercadopago'

interface UsageSummary {
  plan: string
  planData: {
    name: string
    priceBRL: number
    maxAgents: number
    maxMessagesPerMonth: number
    maxKnowledgeBases: number
  }
  agents: { current: number; limit: number; percentage: number }
  messages: { current: number; limit: number; percentage: number }
  knowledgeBases: { current: number; limit: number; percentage: number }
  subscription: {
    status: string
    currentPeriodEnd: string | null
    mercadoPagoPaymentId: string | null
  } | null
}

const planIcons: Record<string, React.ElementType> = {
  free: Zap,
  pro: Crown,
  business: Building2,
}

const planColors: Record<string, string> = {
  free: 'text-blue-400',
  pro: 'text-yellow-400',
  business: 'text-purple-400',
}

const planRingColors: Record<string, string> = {
  free: 'ring-blue-400',
  pro: 'ring-yellow-400',
  business: 'ring-purple-400',
}

function formatLimit(val: number): string {
  return val === -1 ? 'Ilimitado' : val.toLocaleString('pt-BR')
}

export default function BillingPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingData()
  }, [])

  async function fetchBillingData() {
    try {
      setLoading(true)
      const res = await fetch('/api/billing')
      const json = await res.json()
      if (json.success) {
        setSummary(json.data.summary)
      } else {
        toast.error('Erro ao carregar dados de cobrança')
      }
    } catch {
      toast.error('Erro ao conectar com servidor')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planId: string) {
    if (planId === 'free') return
    try {
      setCheckoutLoading(planId)
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const json = await res.json()
      if (json.success && json.data.checkoutUrl) {
        window.open(json.data.checkoutUrl, '_blank')
      } else {
        toast.error(json.error || 'Erro ao gerar link de pagamento')
      }
    } catch {
      toast.error('Erro ao conectar com servidor de pagamento')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const currentPlanId = summary?.plan || 'free'
  const currentPlanData = PLANS[currentPlanId as keyof typeof PLANS] || PLANS.free

  const planList = [
    { id: 'free', data: PLANS.free },
    { id: 'pro', data: PLANS.pro, popular: true },
    { id: 'business', data: PLANS.business },
  ]

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      active: { label: 'Ativo', className: 'text-green-400 border-green-400' },
      pending: { label: 'Pendente', className: 'text-yellow-400 border-yellow-400' },
      canceled: { label: 'Cancelado', className: 'text-red-400 border-red-400' },
      past_due: { label: 'Vencido', className: 'text-orange-400 border-orange-400' },
      trialing: { label: 'Trial', className: 'text-blue-400 border-blue-400' },
    }
    const s = map[status] || { label: status, className: 'text-white/60 border-white/20' }
    return (
      <Badge variant="outline" className={s.className}>
        {s.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-white/60 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cobranca e Planos</h1>
          <p className="text-white/60 mt-1">Gerencie seu plano e acompanhe o uso</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white"
          onClick={fetchBillingData}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Current Plan Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = planIcons[currentPlanId] || Zap
                return <Icon className={`h-8 w-8 ${planColors[currentPlanId] || 'text-white'}`} />
              })()}
              <div>
                <CardTitle className="text-white text-2xl">
                  Plano {currentPlanData.name}
                </CardTitle>
                <CardDescription className="text-white/60 mt-1 flex items-center gap-2">
                  {summary?.subscription
                    ? statusBadge(summary.subscription.status)
                    : statusBadge('active')}
                  {summary?.subscription?.currentPeriodEnd && (
                    <span className="text-xs text-white/40">
                      Renova em{' '}
                      {new Date(summary.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              {currentPlanData.priceBRL > 0 ? (
                <>
                  <div className="text-4xl font-bold text-white">
                    R$ {currentPlanData.priceBRL}
                  </div>
                  <div className="text-sm text-white/60">/mes</div>
                </>
              ) : (
                <div className="text-2xl font-bold text-white/60">Gratis</div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {/* Agents usage */}
            {summary && (
              <>
                <UsageBar
                  label="Agentes"
                  current={summary.agents.current}
                  limit={summary.agents.limit}
                  percentage={summary.agents.percentage}
                />
                <UsageBar
                  label="Mensagens este mes"
                  current={summary.messages.current}
                  limit={summary.messages.limit}
                  percentage={summary.messages.percentage}
                />
                <UsageBar
                  label="Bases de Conhecimento"
                  current={summary.knowledgeBases.current}
                  limit={summary.knowledgeBases.limit}
                  percentage={summary.knowledgeBases.percentage}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan limit warning */}
      {summary && summary.messages.limit !== -1 && summary.messages.percentage >= 90 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <AlertCircle className="h-5 w-5 text-orange-400 shrink-0" />
          <p className="text-sm text-orange-200">
            Voce usou {summary.messages.percentage.toFixed(0)}% das suas mensagens mensais.
            Faca upgrade para continuar sem interrupcoes.
          </p>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Planos Disponiveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planList.map(({ id, data, popular }) => {
            const Icon = planIcons[id] || Zap
            const isCurrentPlan = id === currentPlanId
            const isLoading = checkoutLoading === id

            return (
              <Card
                key={id}
                className={`glass-card relative ${
                  isCurrentPlan ? `ring-2 ${planRingColors[id] || 'ring-white/20'}` : ''
                }`}
              >
                {popular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-yellow-500 text-black font-bold">POPULAR</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`h-10 w-10 ${planColors[id]}`} />
                    {isCurrentPlan && (
                      <Badge variant="outline" className={`${planColors[id]} border-current`}>
                        Plano Atual
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-white text-2xl">{data.name}</CardTitle>
                  <div className="flex items-end gap-1 mt-2">
                    {data.priceBRL > 0 ? (
                      <>
                        <span className="text-4xl font-bold text-white">R$ {data.priceBRL}</span>
                        <span className="text-white/60 mb-1">/mes</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-white/60">Gratis</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {data.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/80">
                        <Check className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button className="w-full bg-white/10 hover:bg-white/20" disabled>
                      Plano Ativo
                    </Button>
                  ) : id === 'free' ? (
                    <Button
                      className="w-full bg-white/5 hover:bg-white/10 text-white/60"
                      variant="ghost"
                      disabled
                    >
                      Downgrade
                    </Button>
                  ) : (
                    <Button
                      className="w-full button-luxury"
                      onClick={() => handleUpgrade(id)}
                      disabled={!!checkoutLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Gerando link...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Assinar Agora
                          <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Payment info */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Pagamento seguro via Mercado Pago</h3>
              <p className="text-white/60 text-sm mt-1">
                Aceitamos PIX, cartao de credito e boleto. O pagamento e processado de forma segura
                pelo Mercado Pago. Ao clicar em "Assinar Agora", voce sera redirecionado para a
                pagina de checkout.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UsageBar({
  label,
  current,
  limit,
  percentage,
}: {
  label: string
  current: number
  limit: number
  percentage: number
}) {
  const isUnlimited = limit === -1
  const pct = isUnlimited ? 0 : Math.min(percentage, 100)
  const barColor =
    pct >= 90
      ? 'bg-red-400'
      : pct >= 70
      ? 'bg-orange-400'
      : 'bg-green-400'

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-white/60">{label}</span>
        <span className="text-white font-medium">
          {current.toLocaleString('pt-BR')} / {isUnlimited ? 'Ilimitado' : limit.toLocaleString('pt-BR')}
        </span>
      </div>
      {!isUnlimited && (
        <>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct > 0 && (
            <p className="text-xs text-white/40 mt-1">
              {(100 - pct).toFixed(1)}% restante
            </p>
          )}
        </>
      )}
    </div>
  )
}
