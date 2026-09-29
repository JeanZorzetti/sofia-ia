'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CreditCard, Check, Zap, Crown, Building2, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PLANS, type PaidPlanId } from '@/lib/plans'
import { parseTaxId } from '@/lib/tax-id'
import { CURRENT_TERMS_VERSION } from '@/lib/terms'

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
}

interface BillingState {
  paid: boolean
  plan: string | null
  status: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAt: string | null
  canWithdraw: boolean
  withdrawUntil: string | null
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

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const dateBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
const planName = (id: string | null) => PLANS[(id ?? 'free') as keyof typeof PLANS]?.name ?? 'Free'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function BillingPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<'portal' | 'withdraw' | null>(null)
  const [subscribePlan, setSubscribePlan] = useState<PaidPlanId | null>(null)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  async function load(showSpinner = true): Promise<BillingState | null> {
    try {
      if (showSpinner) setLoading(true)
      const res = await fetch('/api/billing')
      const json = await res.json()
      if (!json.success) {
        toast.error('Não conseguimos carregar sua cobrança. Tente atualizar a página.')
        return null
      }
      setSummary(json.data.summary)
      setBilling(json.data.billing)
      return json.data.billing
    } catch {
      toast.error('Sem conexão com o servidor. Confira sua internet e tente de novo.')
      return null
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  // The webhook, not the redirect, changes the plan: poll until it lands (spec 013 US1 cenário 4).
  async function pollUntil(done: (b: BillingState) => boolean): Promise<boolean> {
    for (let i = 0; i < 20; i++) {
      await sleep(3000)
      const b = await load(false)
      if (b && done(b)) return true
    }
    return false
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    const plan = params.get('plan')
    if (checkout || plan) window.history.replaceState(null, '', '/dashboard/billing')

    load().then(async (b) => {
      if (checkout === 'canceled') setNotice('Pagamento não concluído. Nenhum valor foi cobrado.')
      if ((plan === 'pro' || plan === 'business') && !b?.paid) setSubscribePlan(plan)
      if (checkout === 'success' && !b?.paid) {
        setConfirming(true)
        const ok = await pollUntil((x) => x.paid)
        setConfirming(false)
        if (ok) toast.success('Pagamento confirmado. Seu plano está ativo.')
        else setNotice('O pagamento ainda está em confirmação. Atualize esta página em alguns minutos.')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openPortal() {
    setBusy('portal')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        window.location.assign(json.data.url)
        return
      }
      toast.error('Não conseguimos abrir a gestão da assinatura agora. Tente novamente em instantes.')
    } catch {
      toast.error('Sem conexão com o servidor. Confira sua internet e tente de novo.')
    }
    setBusy(null)
  }

  async function withdraw() {
    setBusy('withdraw')
    try {
      const res = await fetch('/api/billing/withdraw', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast.success(
          `Desistência confirmada. Estorno de ${brl(json.data.refunded / 100)} solicitado; ele aparece no cartão conforme o prazo do banco.`,
        )
        await pollUntil((b) => !b.paid)
      } else if (json.error === 'not_eligible') {
        toast.error('O prazo de 7 dias para desistir já passou. Para parar as próximas cobranças, cancele em Gerenciar assinatura.')
      } else {
        toast.error('Não conseguimos concluir a desistência agora. Tente novamente em instantes; se persistir, escreva para contato@roilabs.com.br.')
      }
    } catch {
      toast.error('Sem conexão com o servidor. Confira sua internet e tente de novo.')
    }
    setBusy(null)
  }

  const effectivePlanId = summary?.plan || 'free'
  const effectivePlan = PLANS[effectivePlanId as keyof typeof PLANS] || PLANS.free
  const paidPlanId = billing?.paid ? billing.plan : null
  const inTrial = !!billing?.trialEndsAt

  const planList = [
    { id: 'free', data: PLANS.free },
    { id: 'pro', data: PLANS.pro, popular: true },
    { id: 'business', data: PLANS.business },
  ] as const

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Carregando cobrança">
        <Loader2 className="h-8 w-8 text-white/60 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cobrança e planos</h1>
          <p className="text-white/60 mt-1">Gerencie sua assinatura e acompanhe o uso</p>
        </div>
        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white" onClick={() => load()}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Atualizar
        </Button>
      </div>

      {/* Live states: payment confirmation and one-off notices */}
      <div role="status" aria-live="polite">
        {confirming && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
            Confirmando seu pagamento… isso leva alguns segundos.
          </div>
        )}
        {notice && !confirming && (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80">{notice}</div>
        )}
      </div>

      {/* Current Plan Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = planIcons[effectivePlanId] || Zap
                return <Icon className={`h-8 w-8 ${planColors[effectivePlanId] || 'text-white'}`} aria-hidden="true" />
              })()}
              <div>
                <CardTitle className="text-white text-2xl">Plano {effectivePlan.name}</CardTitle>
                <CardDescription className="text-white/60 mt-1 flex flex-wrap items-center gap-2">
                  {billing?.paid && billing.status === 'past_due' && (
                    <Badge variant="outline" className="text-orange-400 border-orange-400">Pagamento recusado</Badge>
                  )}
                  {billing?.paid && billing.status === 'active' && (
                    <Badge variant="outline" className="text-green-400 border-green-400">Ativo</Badge>
                  )}
                  {inTrial && (
                    <Badge variant="outline" className="text-blue-400 border-blue-400">Teste grátis</Badge>
                  )}
                  {inTrial && (
                    <span className="text-xs text-white/60">
                      Até {dateBR(billing!.trialEndsAt!)}. Nenhuma cobrança automática.
                    </span>
                  )}
                  {billing?.paid && billing.cancelAt && (
                    <span className="text-xs text-white/60">
                      Assinatura cancelada. Você mantém o plano {planName(paidPlanId)} até {dateBR(billing.cancelAt)}.
                    </span>
                  )}
                  {billing?.paid && !billing.cancelAt && billing.currentPeriodEnd && (
                    <span className="text-xs text-white/60">Renova em {dateBR(billing.currentPeriodEnd)}</span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              {billing?.paid && effectivePlan.priceBRL > 0 ? (
                <>
                  <div className="text-4xl font-bold text-white">R$ {effectivePlan.priceBRL}</div>
                  <div className="text-sm text-white/60">/mês</div>
                </>
              ) : (
                <div className="text-2xl font-bold text-white/60">Grátis</div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {summary && (
              <>
                <UsageBar label="Agentes" current={summary.agents.current} limit={summary.agents.limit} percentage={summary.agents.percentage} />
                <UsageBar label="Mensagens este mês" current={summary.messages.current} limit={summary.messages.limit} percentage={summary.messages.percentage} />
                <UsageBar label="Bases de conhecimento" current={summary.knowledgeBases.current} limit={summary.knowledgeBases.limit} percentage={summary.knowledgeBases.percentage} />
              </>
            )}
          </div>

          {billing?.paid && (
            <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
              {billing.status === 'past_due' && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-orange-200">
                    <strong>Pagamento recusado.</strong> O banco não autorizou a cobrança da renovação. Atualize o cartão
                    para manter o plano {planName(paidPlanId)}; sem pagamento, a assinatura é encerrada em até 7 dias.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap items-start gap-4">
                <div>
                  <Button className="button-luxury" onClick={openPortal} disabled={!!busy}>
                    {busy === 'portal' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />}
                    {billing.status === 'past_due' ? 'Atualizar cartão' : 'Gerenciar assinatura'}
                  </Button>
                  <p className="text-xs text-white/50 mt-1">Trocar cartão, mudar de plano ou cancelar.</p>
                </div>
                {billing.canWithdraw && (
                  <div>
                    <Button variant="outline" className="border-white/20 text-white/80" onClick={() => setWithdrawOpen(true)} disabled={!!busy}>
                      {busy === 'withdraw' && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
                      Desistir e receber o valor de volta
                    </Button>
                    <p className="text-xs text-white/50 mt-1">Disponível até {dateBR(billing.withdrawUntil!)}.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan limit warning */}
      {summary && summary.messages.limit !== -1 && summary.messages.percentage >= 90 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <AlertCircle className="h-5 w-5 text-orange-400 shrink-0" aria-hidden="true" />
          <p className="text-sm text-orange-200">
            Você usou {summary.messages.percentage.toFixed(0)}% das mensagens do mês. Assine um plano maior para continuar sem interrupção.
          </p>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Planos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planList.map(({ id, data, ...rest }) => {
            const popular = 'popular' in rest
            const Icon = planIcons[id] || Zap
            const isCurrent = paidPlanId ? id === paidPlanId : id === 'free' && !inTrial

            let action: React.ReactNode
            if (isCurrent) {
              action = <Button className="w-full bg-white/10 hover:bg-white/20" disabled>Plano atual</Button>
            } else if (id === 'free') {
              action = paidPlanId ? (
                <Button className="w-full" variant="ghost" onClick={openPortal} disabled={!!busy}>Cancelar assinatura</Button>
              ) : (
                <Button className="w-full bg-white/5 text-white/60" variant="ghost" disabled>Plano após o teste grátis</Button>
              )
            } else if (paidPlanId) {
              action = (
                <Button className="w-full button-luxury" onClick={openPortal} disabled={!!busy}>Mudar para {data.name}</Button>
              )
            } else {
              action = (
                <Button className="w-full button-luxury" onClick={() => setSubscribePlan(id)}>
                  <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
                  Assinar o plano {data.name}
                </Button>
              )
            }

            return (
              <Card key={id} className={`glass-card relative ${isCurrent ? `ring-2 ${planRingColors[id] || 'ring-white/20'}` : ''}`}>
                {popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-yellow-500 text-black font-bold">POPULAR</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`h-10 w-10 ${planColors[id]}`} aria-hidden="true" />
                    {isCurrent && (
                      <Badge variant="outline" className={`${planColors[id]} border-current`}>Plano atual</Badge>
                    )}
                  </div>
                  <CardTitle className="text-white text-2xl">{data.name}</CardTitle>
                  <div className="flex items-end gap-1 mt-2">
                    {data.priceBRL > 0 ? (
                      <>
                        <span className="text-4xl font-bold text-white">R$ {data.priceBRL}</span>
                        <span className="text-white/60 mb-1">/mês</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-white/60">Grátis</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {data.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/80">
                        <Check className="h-5 w-5 text-green-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {action}
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
              <CreditCard className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Pagamento seguro pela Stripe</h3>
              <p className="text-white/60 text-sm mt-1">
                Pagamento com cartão de crédito, processado pela Stripe. Nenhum dado do cartão fica na Polaris.
                Cancele quando quiser; nos 7 dias após o pagamento, você pode desistir e receber o valor de volta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SubscribeDialog
        key={subscribePlan ?? 'closed'} // remount = clean form every time it opens
        plan={subscribePlan}
        onClose={() => setSubscribePlan(null)}
        onAlreadySubscribed={() => {
          setSubscribePlan(null)
          toast.info('Você já tem uma assinatura ativa.')
          load()
        }}
      />

      <AlertDialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Desistir da assinatura?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Devolvemos o valor integral pago nesta assinatura, no mesmo cartão. Sua conta volta ao plano Free agora e
              seus dados continuam nela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-white border-white/20">Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={withdraw}>Desistir e receber o valor de volta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Summary shown before sending the customer to Stripe (spec 013 FR-003/004/005). */
function SubscribeDialog({
  plan,
  onClose,
  onAlreadySubscribed,
}: {
  plan: PaidPlanId | null
  onClose: () => void
  onAlreadySubscribed: () => void
}) {
  const [taxId, setTaxId] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [taxError, setTaxError] = useState<string | null>(null)
  const [termsError, setTermsError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!plan) return null
  const data = PLANS[plan]

  async function submit(e: FormEvent) {
    e.preventDefault()
    const validTax = !!parseTaxId(taxId)
    setTaxError(validTax ? null : 'Confira o CPF ou CNPJ: os dígitos não conferem.')
    setTermsError(!accepted)
    setFormError(null)
    if (!validTax || !accepted) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, taxId, acceptedTermsVersion: CURRENT_TERMS_VERSION }),
      })
      const json = await res.json()
      if (json.success) {
        window.location.assign(json.data.url)
        return
      }
      if (json.error === 'invalid_tax_id') setTaxError('Confira o CPF ou CNPJ: os dígitos não conferem.')
      else if (json.error === 'terms_not_accepted') setTermsError(true)
      else if (json.error === 'already_subscribed') return onAlreadySubscribed()
      else setFormError('Não conseguimos abrir o pagamento agora. Nenhum valor foi cobrado. Tente novamente em instantes.')
    } catch {
      setFormError('Sem conexão com o servidor. Nenhum valor foi cobrado. Confira sua internet e tente de novo.')
    }
    setSubmitting(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Assinar o plano {data.name}</DialogTitle>
          <DialogDescription className="text-white/70">{brl(data.priceBRL)} por mês</DialogDescription>
        </DialogHeader>

        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
          Renova automaticamente todo mês no mesmo cartão, até você cancelar.
        </p>
        <p className="text-sm text-white/70">
          Cancele quando quiser em Gerenciar assinatura. Nos 7 dias após o pagamento, você pode desistir e receber o
          valor de volta.
        </p>

        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tax-id">CPF ou CNPJ</Label>
            <Input
              id="tax-id"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="ex.: 000.000.000-00"
              autoComplete="off"
              aria-invalid={!!taxError}
              aria-describedby={taxError ? 'tax-id-hint tax-id-error' : 'tax-id-hint'}
            />
            <p id="tax-id-hint" className="text-xs text-white/60">Usamos para emitir a nota fiscal.</p>
            {taxError && <p id="tax-id-error" className="text-xs text-red-300">{taxError}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <input
                id="accept-terms"
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 accent-violet-500"
                aria-invalid={termsError}
                aria-describedby={termsError ? 'accept-terms-error' : undefined}
              />
              <label htmlFor="accept-terms" className="text-sm text-white/80">
                Li e aceito os{' '}
                <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">
                  Termos de Uso<span className="sr-only"> (abre em nova aba)</span>
                </a>
              </label>
            </div>
            {termsError && (
              <p id="accept-terms-error" className="text-xs text-red-300">Para assinar, aceite os Termos de Uso.</p>
            )}
          </div>

          {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Voltar</Button>
            <Button type="submit" className="button-luxury" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
              {submitting ? 'Abrindo pagamento…' : 'Ir para pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UsageBar({ label, current, limit, percentage }: { label: string; current: number; limit: number; percentage: number }) {
  const isUnlimited = limit === -1
  const pct = isUnlimited ? 0 : Math.min(percentage, 100)
  const barColor = pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-orange-400' : 'bg-green-400'

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
            <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          {pct > 0 && <p className="text-xs text-white/40 mt-1">{(100 - pct).toFixed(1)}% restante</p>}
        </>
      )}
    </div>
  )
}
