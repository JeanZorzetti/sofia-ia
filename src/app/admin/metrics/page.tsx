'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, TrendingUp, CreditCard, RefreshCw, Mail, BarChart3, Zap, Bot, Database } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Metrics {
  users: { total: number; newLast7: number; newLast30: number }
  subscriptions: {
    active: number
    mrr: number
    breakdown: { plan: string; count: number; mrr: number }[]
  }
  apiKeys: { active: number }
  leads: { total: number }
  recentUsers: {
    id: string; name: string; email: string; role: string
    createdAt: string; lastLogin: string | null
  }[]
  dailySignups: { date: string; count: number }[]
  funnel: { signups: number; withAgent: number; withExecution: number; paid: number }
  engagement: { orchestrationsExecuted: number; agentsCreated: number; kbsCreated: number; documentsAdded: number }
}

export default function AdminMetricsPage() {
  const [data, setData] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/metrics')
      const json = await res.json()
      if (json.success) setData(json.data)
      else setError(json.error || 'Erro ao carregar métricas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <RefreshCw className="w-6 h-6 text-white/40 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )

  if (!data) return null

  const freeUsers = data.users.total - data.subscriptions.active
  const conversionRate = data.users.total > 0
    ? ((data.subscriptions.active / data.users.total) * 100).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" /> Métricas
            </h1>
            <p className="text-foreground-tertiary text-sm">KPIs da plataforma em tempo real</p>
          </div>
          <button onClick={load} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'MRR Estimado', value: `R$ ${data.subscriptions.mrr.toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'text-green-400', sub: `${data.subscriptions.active} pagantes` },
            { label: 'Total Usuários', value: data.users.total.toString(), icon: Users, color: 'text-blue-400', sub: `+${data.users.newLast7} últimos 7d` },
            { label: 'Conversão', value: `${conversionRate}%`, icon: CreditCard, color: 'text-purple-400', sub: `${freeUsers} no free` },
            { label: 'Leads CRM', value: data.leads.total.toString(), icon: Mail, color: 'text-yellow-400', sub: `${data.apiKeys.active} API keys ativas` },
          ].map(card => (
            <div key={card.label} className="glass-card p-5 rounded-xl">
              <card.icon className={`w-5 h-5 mb-3 ${card.color}`} />
              <div className="text-2xl font-bold text-white mb-0.5">{card.value}</div>
              <div className="text-xs text-white/40">{card.label}</div>
              <div className="text-xs text-white/30 mt-1">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Planos */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-5 rounded-xl">
            <h2 className="font-semibold text-white mb-4 text-sm">Breakdown por Plano</h2>
            {data.subscriptions.breakdown.length === 0 ? (
              <p className="text-white/30 text-sm">Nenhuma assinatura ativa ainda.</p>
            ) : (
              <div className="space-y-3">
                {data.subscriptions.breakdown.map(p => (
                  <div key={p.plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="capitalize text-white text-sm font-medium">{p.plan}</span>
                      <span className="text-xs text-white/40">{p.count} usuário{p.count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-sm text-green-400 font-medium">
                      {p.mrr > 0 ? `R$ ${p.mrr.toLocaleString('pt-BR')}/mês` : 'Custom'}
                    </span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <span className="text-white/40 text-xs">Total MRR</span>
                  <span className="text-white font-bold">R$ {data.subscriptions.mrr.toLocaleString('pt-BR')}/mês</span>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card p-5 rounded-xl">
            <h2 className="font-semibold text-white mb-4 text-sm">Crescimento de Usuários</h2>
            <div className="space-y-3">
              {[
                { label: 'Total de usuários', value: data.users.total },
                { label: 'Novos nos últimos 7 dias', value: data.users.newLast7 },
                { label: 'Novos nos últimos 30 dias', value: data.users.newLast30 },
                { label: 'Usuários free', value: freeUsers },
                { label: 'Usuários pagantes', value: data.subscriptions.active },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">{row.label}</span>
                  <span className="text-white font-medium text-sm">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Signups diários (sparkline) + Funil de conversão */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Sparkline */}
          <div className="glass-card p-5 rounded-xl">
            <h2 className="font-semibold text-white mb-1 text-sm">Signups — últimos 30 dias</h2>
            <p className="text-white/30 text-xs mb-4">{data.users.newLast30} no período</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={data.dailySignups} margin={{ top: 2, right: 2, left: -32, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                  tickFormatter={v => v.slice(5)} // MM-DD
                  interval={6}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#signupGrad)" name="Signups" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Funil de conversão */}
          <div className="glass-card p-5 rounded-xl">
            <h2 className="font-semibold text-white mb-4 text-sm">Funil de Conversão</h2>
            {(() => {
              const steps = [
                { label: 'Signups', value: data.funnel.signups, color: 'bg-blue-500' },
                { label: 'Criou agente', value: data.funnel.withAgent, color: 'bg-violet-500' },
                { label: 'Executou', value: data.funnel.withExecution, color: 'bg-amber-500' },
                { label: 'Pagante', value: data.funnel.paid, color: 'bg-green-500' },
              ]
              const max = steps[0].value || 1
              return (
                <div className="space-y-3">
                  {steps.map((step, i) => {
                    const pct = Math.round((step.value / max) * 100)
                    const rate = i > 0 && steps[i - 1].value > 0
                      ? `${((step.value / steps[i - 1].value) * 100).toFixed(0)}% do anterior`
                      : '100%'
                    return (
                      <div key={step.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/60 text-xs">{step.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white/30 text-xs">{rate}</span>
                            <span className="text-white font-medium text-sm w-8 text-right">{step.value}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${step.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Engagement (últimos 30 dias) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Orquestrações executadas', value: data.engagement.orchestrationsExecuted, icon: Zap, color: 'text-amber-400', sub: 'últimos 30d' },
            { label: 'Agentes criados', value: data.engagement.agentsCreated, icon: Bot, color: 'text-violet-400', sub: 'últimos 30d' },
            { label: 'Knowledge Bases', value: data.engagement.kbsCreated, icon: Database, color: 'text-cyan-400', sub: 'últimos 30d' },
            { label: 'Documentos adicionados', value: data.engagement.documentsAdded, icon: Mail, color: 'text-pink-400', sub: 'últimos 30d' },
          ].map(card => (
            <div key={card.label} className="glass-card p-4 rounded-xl">
              <card.icon className={`w-4 h-4 mb-2 ${card.color}`} />
              <div className="text-xl font-bold text-white mb-0.5">{card.value}</div>
              <div className="text-xs text-white/40">{card.label}</div>
              <div className="text-xs text-white/20 mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Usuários recentes */}
        <div className="glass-card rounded-xl">
          <div className="p-4 border-b border-white/5">
            <h2 className="font-semibold text-white text-sm">Usuários Recentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-white/40 font-medium">Nome</th>
                  <th className="text-left p-4 text-white/40 font-medium">Email</th>
                  <th className="p-4 text-white/40 font-medium text-center">Role</th>
                  <th className="p-4 text-white/40 font-medium text-center">Cadastro</th>
                  <th className="p-4 text-white/40 font-medium text-center">Último login</th>
                </tr>
              </thead>
              <tbody>
                {data.recentUsers.map(u => (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                    <td className="p-4 text-white font-medium">{u.name}</td>
                    <td className="p-4 text-white/60 text-xs">{u.email}</td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-white/5 text-white/40'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-center text-white/40 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-center text-white/40 text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
