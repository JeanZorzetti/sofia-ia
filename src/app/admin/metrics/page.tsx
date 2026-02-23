'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, TrendingUp, CreditCard, Key, RefreshCw, Mail, BarChart3 } from 'lucide-react'

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
