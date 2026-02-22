'use client'

import { useEffect, useState } from 'react'

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

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-400',
  pro: 'bg-blue-500',
  business: 'bg-purple-600',
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data)
        } else {
          setError(json.error || 'Falha ao carregar analytics')
        }
      })
      .catch(() => setError('Erro de rede'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const maxSignups = Math.max(...data.signupsPerDay.map((d) => d.count), 1)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Analytics de Produto</h1>

      {/* NPS Score */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-6">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">NPS Score</p>
          <p className={`text-4xl font-bold ${
            data.nps.score === null
              ? 'text-gray-400'
              : data.nps.score >= 50
              ? 'text-green-600'
              : data.nps.score >= 0
              ? 'text-yellow-500'
              : 'text-red-500'
          }`}>
            {data.nps.score === null ? '—' : data.nps.score}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">{data.nps.totalResponses} resposta(s)</p>
          <p className="text-xs text-gray-400 mt-1">Score de -100 a 100</p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Funil de Conversao</h2>
        <div className="space-y-3">
          {data.funnel.map((step) => (
            <div key={step.step}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{step.label}</span>
                <span className="text-gray-500">
                  {step.count.toLocaleString()} ({step.pct}%)
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${step.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Distribuicao de Planos</h2>
        <div className="flex gap-4 flex-wrap">
          {data.planDistribution.map((p) => {
            const total = data.planDistribution.reduce((s, x) => s + x.count, 0)
            const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
            return (
              <div key={p.plan} className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${PLAN_COLORS[p.plan] || 'bg-gray-400'}`} />
                <div>
                  <p className="font-semibold capitalize text-gray-800">{p.plan}</p>
                  <p className="text-sm text-gray-500">{p.count} usuarios ({pct}%)</p>
                </div>
              </div>
            )
          })}
          {data.planDistribution.length === 0 && (
            <p className="text-gray-400 text-sm">Sem dados de planos</p>
          )}
        </div>
      </div>

      {/* Signups per day */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Cadastros (ultimos 30 dias)</h2>
        {data.signupsPerDay.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum cadastro no periodo</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {data.signupsPerDay.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-blue-400 hover:bg-blue-600 rounded-t transition-colors cursor-default"
                  style={{ height: `${Math.round((d.count / maxSignups) * 100)}%`, minHeight: '4px' }}
                />
                <span className="text-xs text-gray-400 hidden group-hover:block absolute -top-6 bg-gray-800 text-white px-1 py-0.5 rounded text-[10px] whitespace-nowrap">
                  {d.date}: {d.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Events Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Eventos (ultimos 7 dias)</h2>
        {data.eventsTimeline.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum evento no periodo</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-2 text-gray-500 font-medium">Data</th>
                  {Array.from(
                    new Set(data.eventsTimeline.flatMap((d) => Object.keys(d.events)))
                  ).map((evt) => (
                    <th key={evt} className="pb-2 text-gray-500 font-medium px-2 text-center">
                      {evt.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.eventsTimeline.map((row) => {
                  const allEvents = Array.from(
                    new Set(data.eventsTimeline.flatMap((d) => Object.keys(d.events)))
                  )
                  return (
                    <tr key={row.date} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 text-gray-700">{row.date}</td>
                      {allEvents.map((evt) => (
                        <td key={evt} className="py-2 px-2 text-center text-gray-600">
                          {row.events[evt] || '—'}
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
    </div>
  )
}
