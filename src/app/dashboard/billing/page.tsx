'use client'

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Check, Zap, Crown, Building2, Calendar } from 'lucide-react'

export default function BillingPage() {
  const currentPlan = {
    name: 'PROFESSIONAL',
    price: 97,
    tokens_used: 32450,
    tokens_limit: 50000,
    renewal_date: '2026-03-08'
  }

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 67,
      icon: Zap,
      color: 'text-blue-400',
      popular: false,
      features: [
        'Até 20.000 tokens/mês',
        '1 instância WhatsApp',
        'Automações básicas',
        'Relatórios semanais',
        'Suporte por email'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 97,
      icon: Crown,
      color: 'text-yellow-400',
      popular: true,
      features: [
        'Até 50.000 tokens/mês',
        '3 instâncias WhatsApp',
        'Todas as automações',
        'Relatórios em tempo real',
        'Suporte prioritário',
        'Personalização da IA'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 297,
      icon: Building2,
      color: 'text-purple-400',
      popular: false,
      features: [
        'Tokens ilimitados',
        'Instâncias ilimitadas',
        'Automações personalizadas',
        'API dedicada',
        'Suporte 24/7',
        'Gerente de conta',
        'SLA garantido'
      ]
    }
  ]

  const billingHistory = [
    {
      id: 1,
      date: '2026-02-08',
      description: 'Plano Professional - Renovação',
      amount: 97,
      status: 'paid'
    },
    {
      id: 2,
      date: '2026-01-08',
      description: 'Plano Professional - Renovação',
      amount: 97,
      status: 'paid'
    },
    {
      id: 3,
      date: '2025-12-08',
      description: 'Plano Professional - Renovação',
      amount: 97,
      status: 'paid'
    },
    {
      id: 4,
      date: '2025-11-08',
      description: 'Plano Starter - Renovação',
      amount: 67,
      status: 'paid'
    }
  ]

  const tokenUsagePercentage = (currentPlan.tokens_used / currentPlan.tokens_limit) * 100

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-white">Cobrança</h1>
        <p className="text-white/60 mt-1">Gerencie seu plano e histórico de pagamentos</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl">
                Plano {currentPlan.name}
              </CardTitle>
              <CardDescription className="text-white/60 mt-1">
                Próxima renovação em {new Date(currentPlan.renewal_date).toLocaleDateString('pt-BR')}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">
                R$ {currentPlan.price}
              </div>
              <div className="text-sm text-white/60">/mês</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/60">Uso de Tokens</span>
                <span className="text-white font-medium">
                  {currentPlan.tokens_used.toLocaleString('pt-BR')} / {currentPlan.tokens_limit.toLocaleString('pt-BR')}
                </span>
              </div>
              <Progress value={tokenUsagePercentage} className="h-3" />
              <p className="text-xs text-white/40 mt-2">
                {(100 - tokenUsagePercentage).toFixed(1)}% restante neste ciclo
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-lg bg-white/5 text-center">
                <div className="text-xs text-white/60">Tokens Usados</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {currentPlan.tokens_used.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-white/5 text-center">
                <div className="text-xs text-white/60">Tokens Restantes</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {(currentPlan.tokens_limit - currentPlan.tokens_used).toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-white/5 text-center">
                <div className="text-xs text-white/60">Próxima Renovação</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {new Date(currentPlan.renewal_date).getDate()} dias
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Planos Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = plan.name.toUpperCase() === currentPlan.name
            return (
              <Card
                key={plan.id}
                className={`glass-card hover-scale relative ${
                  isCurrentPlan ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-yellow-500 text-black font-bold">
                      POPULAR
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`h-10 w-10 ${plan.color}`} />
                    {isCurrentPlan && (
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        Plano Atual
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-4xl font-bold text-white">R$ {plan.price}</span>
                    <span className="text-white/60 mb-1">/mês</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-white/80">
                        <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      isCurrentPlan
                        ? 'bg-white/10 hover:bg-white/20'
                        : 'button-luxury'
                    }`}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? 'Plano Ativo' : 'Assinar Agora'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Histórico de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {billingHistory.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{payment.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-white/40" />
                      <p className="text-sm text-white/60">
                        {new Date(payment.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">
                    R$ {payment.amount.toFixed(2)}
                  </p>
                  <Badge variant="outline" className="text-green-400 border-green-400 text-xs mt-1">
                    Pago
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
