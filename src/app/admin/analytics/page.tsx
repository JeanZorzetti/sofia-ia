'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BrainCircuit, TrendingUp, Users, BarChart3, Star } from 'lucide-react'

interface FunnelStep {
  step: string
  label: string
  count: number
  pct: number
}

interface PlanGroup {
  plan: string
  count: number
}

interface EventsTimelineDay {
  date: string
  events: Record<string, number>
}

interface SignupDay {
  date: string
  count: number
}

interface AnalyticsData {
  signupsPerDay: SignupDay[]
  funnel: FunnelStep[]
  planDistribution: PlanGroup[]
  eventsTimeline: EventsTimelineDay[]
  nps: { score: number | null; totalResponses: number }
}

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  pro: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  business: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data)
        else setError(json.error || 'Falha ao carregar analytics')
      })
      .catch(() => setError('Erro de rede'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">Sofia AI</span>
            <span className="text-white/20 mx-1">/</span>
            <Link href="/admin" className="text-white/50 text-sm hover:text-white transition-colors">Admin</Link>
            <span className="text-white/20 mx-1">/</span>
            <span className="text-white/60 text-sm">Analytics</span>
          </div>
          <Link href="/admin" className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics de Produto</h1>
          <p className="text-white/40 text-sm mt-1">Funil de conversão, eventos e NPS</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* NPS + Signups row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* NPS */}
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6 flex items-center gap-5">
                <Star className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">NPS Score</p>
                  <p className={`text-4xl font-bold ${
                    data.nps.score === null ? 'text-white/20'
                    : data.nps.score >= 50 ? 'text-green-400'
                    : data.nps.score >= 0 ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>
                    {data.nps.score === null ? '—' : data.nps.score}
                  </p>
                  <p className="text-white/30 text-xs mt-1">{data.nps.totalResponses} resposta{data.nps.totalResponses !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Signups bar chart */}
              <div className="md:col-span-2 bg-white/[0.03] border border-white/5 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-blue-400" />
                  <p className="text-xs text-white/40 uppercase tracking-wider">Cadastros — últimos 30 dias</p>
                </div>
                {data.signupsPerDay.length === 0 ? (
                  <p className="text-white/25 text-sm">Nenhum cadastro no período</p>
                ) : (
                  <div className="flex items-end gap-1 h-20">
                    {(() => {
                      const max = Math.max(...data.signupsPerDay.map((d) => d.count), 1)
                      return data.signupsPerDay.map((d) => (
                        <div key={d.date} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-blue-500/50 hover:bg-blue-400/70 rounded-t transition-colors cursor-default"
                            style={{ height: `${Math.round((d.count / max) * 100)}%`, minHeight: '3px' }}
                          />
                          <span className="hidden group-hover:block absolute -top-7 bg-gray-800 text-white px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap z-10">
                            {d.date}: {d.count}
                          </span>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Funil de Conversão</h2>
              </div>
              <div className="space-y-4">
                {data.funnel.map((step, i) => (
                  <div key={step.step}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white/25 text-xs w-4">{i + 1}.</span>
                        <span className="text-white/80">{step.label}</span>
                      </div>
                      <span className="text-white/40 tabular-nums">
                        {step.count.toLocaleString('pt-BR')}
                        <span className="ml-2 text-white/25">({step.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${step.pct}%`,
                          background: `hsl(${220 - i * 20}, 70%, 60%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan Distribution */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Distribuição de Planos</h2>
              </div>
              {data.planDistribution.length === 0 ? (
                <p className="text-white/25 text-sm">Sem dados</p>
              ) : (
                <div className="grid sm:grid-cols-3 gap-4">
                  {data.planDistribution.map((p) => {
                    const total = data.planDistribution.reduce((s, x) => s + x.count, 0)
                    const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
                    return (
                      <div key={p.plan} className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2 py-0.5 rounded border text-xs capitalize ${PLAN_BADGE[p.plan] || PLAN_BADGE.free}`}>
                            {p.plan}
                          </span>
                          <span className="text-white/40 text-sm">{pct}%</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{p.count.toLocaleString('pt-BR')}</p>
                        <p className="text-xs text-white/30 mt-0.5">usuário{p.count !== 1 ? 's' : ''}</p>
                        <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Events Timeline */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-green-400" />
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Eventos — últimos 7 dias</h2>
              </div>
              {data.eventsTimeline.length === 0 ? (
                <p className="text-white/25 text-sm">Nenhum evento no período</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-white/5">
                        <th className="pb-3 text-white/30 font-medium">Data</th>
                        {Array.from(
                          new Set(data.eventsTimeline.flatMap((d) => Object.keys(d.events)))
                        ).map((evt) => (
                          <th key={evt} className="pb-3 text-white/30 font-medium px-3 text-center text-xs">
                            {evt.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {data.eventsTimeline.map((row) => {
                        const allEvents = Array.from(
                          new Set(data.eventsTimeline.flatMap((d) => Object.keys(d.events)))
                        )
                        return (
                          <tr key={row.date} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 text-white/60 font-mono text-xs">{row.date}</td>
                            {allEvents.map((evt) => (
                              <td key={evt} className="py-2.5 px-3 text-center text-white/50">
                                {row.events[evt] ? (
                                  <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">
                                    {row.events[evt]}
                                  </span>
                                ) : (
                                  <span className="text-white/15">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
