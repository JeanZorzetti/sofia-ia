'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Repeat2,
  Quote,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Calendar,
  Users,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileInsights {
  since: string
  until: string
  totalViews: number
  totalLikes: number
  totalReplies: number
  totalReposts: number
  totalQuotes: number
}

interface PostWithInsights {
  id: string
  text?: string
  timestamp: string
  permalink?: string
  insights: {
    views: number
    likes: number
    replies: number
    reposts: number
    quotes: number
  }
}

interface ThreadsData {
  profile: { username: string; name?: string; followers_count?: number } | null
  insights7d: ProfileInsights | null
  insights30d: ProfileInsights | null
  recentPosts: { id: string; text?: string; timestamp: string; permalink?: string }[]
  postsWithInsights: PostWithInsights[]
  username: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function engRate(insights: { views: number; likes: number; replies: number; reposts: number; quotes: number }): number {
  const total = insights.likes + insights.replies + insights.reposts + insights.quotes
  return insights.views > 0 ? (total / insights.views) * 100 : 0
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function snippet(text: string | undefined, max = 100): string {
  if (!text) return '(sem texto)'
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

// ─── Post Row ─────────────────────────────────────────────────────────────────

function PostRow({ post, rank }: { post: PostWithInsights; rank: number }) {
  const rate = engRate(post.insights)
  const total = post.insights.likes + post.insights.replies + post.insights.reposts + post.insights.quotes

  const rateColor =
    rate >= 7 ? 'text-emerald-400' :
    rate >= 4 ? 'text-amber-400' :
    'text-gray-500'

  const trend =
    rate >= 7 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> :
    rate >= 4 ? <Minus className="h-3.5 w-3.5 text-amber-400" /> :
    <TrendingDown className="h-3.5 w-3.5 text-red-400" />

  return (
    <div className="flex items-start gap-4 rounded-xl border border-white/8 bg-white/3 p-4 transition-all hover:border-white/15 hover:bg-white/5">
      {/* Rank */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/8 text-sm font-bold text-gray-500">
        #{rank}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-sm text-gray-300 leading-relaxed">{snippet(post.text, 120)}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmt(post.insights.views)}</span>
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmt(post.insights.likes)}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{fmt(post.insights.replies)}</span>
          <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" />{fmt(post.insights.reposts)}</span>
          <span className="flex items-center gap-1"><Quote className="h-3 w-3" />{fmt(post.insights.quotes)}</span>
          <span className="text-gray-700">·</span>
          <span className={`flex items-center gap-1 font-medium ${rateColor}`}>
            {trend}{rate.toFixed(1)}% eng.
          </span>
          <span className="text-gray-700">·</span>
          <span>{fmtDate(post.timestamp)}</span>
        </div>
      </div>

      {/* Total interactions */}
      <div className="flex-shrink-0 text-right">
        <div className="text-lg font-bold text-white">{fmt(total)}</div>
        <div className="text-xs text-gray-600">interações</div>
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-xs text-purple-500 hover:text-purple-300 transition-colors"
          >
            ver <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────

function MiniBarChart({
  data,
  maxVal,
  color,
}: {
  data: { label: string; value: number }[]
  maxVal: number
  color: string
}) {
  return (
    <div className="flex h-28 items-end gap-1">
      {data.map(({ label, value }) => {
        const h = maxVal > 0 ? (value / maxVal) * 100 : 0
        return (
          <div key={label} className="group flex flex-1 flex-col items-center gap-1">
            <div className="relative flex w-full flex-col items-center justify-end" style={{ height: '88px' }}>
              <div
                className={`w-full rounded-t-sm transition-all ${color}`}
                style={{ height: `${h}%`, minHeight: h > 0 ? '2px' : '0' }}
              />
              <div className="pointer-events-none absolute -top-6 hidden rounded bg-black/80 px-1.5 py-0.5 text-xs text-white group-hover:block">
                {fmt(value)}
              </div>
            </div>
            <span className="text-[9px] text-gray-600 truncate w-full text-center">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ThreadsAnalyticsPage() {
  const [data, setData] = useState<ThreadsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<7 | 30>(7)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const res = await fetch(`/api/threads/insights?days=${period}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erro ao buscar dados'); return }
      setData(json.data)
    } catch {
      setError('Erro de rede')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const insights = period === 30 ? data?.insights30d : data?.insights7d
  const totalEng = insights
    ? insights.totalLikes + insights.totalReplies + insights.totalReposts + insights.totalQuotes
    : 0
  const engRateProfile = insights && insights.totalViews > 0
    ? ((totalEng / insights.totalViews) * 100).toFixed(1)
    : '–'

  // Top posts sorted by total interactions
  const topPosts = [...(data?.postsWithInsights ?? [])].sort((a, b) => {
    const ta = a.insights.likes + a.insights.replies + a.insights.reposts + a.insights.quotes
    const tb = b.insights.likes + b.insights.replies + b.insights.reposts + b.insights.quotes
    return tb - ta
  })

  // Chart data for posts
  const chartData = topPosts.map((p) => ({
    label: fmtDate(p.timestamp),
    value: p.insights.views,
  }))
  const maxViews = Math.max(...chartData.map((d) => d.value), 1)

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Performance da Agência</h1>
              <p className="text-sm text-gray-500">
                {data?.profile?.username ? `@${data.profile.username}` : 'Threads'} — métricas e análise de conteúdo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Period toggle */}
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    period === d
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">{error}</p>
              {error.includes('não conectada') && (
                <a href="/dashboard/integrations" className="text-xs text-red-400/70 underline hover:text-red-400">
                  Conectar Threads →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm text-gray-500">Buscando métricas do Threads...</p>
          </div>
        ) : data && (
          <>
            {/* Profile row */}
            {data.profile && (
              <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-lg font-bold text-white">
                  {data.profile.username?.[0]?.toUpperCase() ?? 'T'}
                </div>
                <div>
                  <div className="font-semibold text-white">@{data.profile.username}</div>
                  {data.profile.name && <div className="text-sm text-gray-500">{data.profile.name}</div>}
                </div>
                {data.profile.followers_count !== undefined && (
                  <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    <div>
                      <div className="text-lg font-bold text-white">{fmt(data.profile.followers_count)}</div>
                      <div className="text-xs text-gray-500">seguidores</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats grid */}
            {insights ? (
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Views" value={fmt(insights.totalViews)} icon={Eye} color="bg-indigo-500/80" />
                <StatCard label="Likes" value={fmt(insights.totalLikes)} icon={Heart} color="bg-pink-500/80" />
                <StatCard label="Replies" value={fmt(insights.totalReplies)} icon={MessageCircle} color="bg-blue-500/80" />
                <StatCard label="Reposts" value={fmt(insights.totalReposts)} icon={Repeat2} color="bg-emerald-500/80" />
                <StatCard label="Quotes" value={fmt(insights.totalQuotes)} icon={Quote} color="bg-amber-500/80" />
                <StatCard
                  label="Engajamento"
                  value={`${engRateProfile}%`}
                  icon={TrendingUp}
                  color="bg-purple-500/80"
                  sub={`${period}d · ${fmt(totalEng)} interações`}
                />
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
                Insights de perfil indisponíveis — reconecte o Threads com o scope{' '}
                <code className="text-xs">threads_manage_insights</code> em /dashboard/integrations.
              </div>
            )}

            {/* Chart + top posts */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Views chart */}
              {chartData.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white">Views por post (top 5)</span>
                  </div>
                  <MiniBarChart data={chartData} maxVal={maxViews} color="bg-indigo-500/60" />
                </div>
              )}

              {/* Engagement chart */}
              {topPosts.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">Engajamento por post (top 5)</span>
                  </div>
                  <MiniBarChart
                    data={topPosts.map((p) => ({
                      label: fmtDate(p.timestamp),
                      value: Math.round(engRate(p.insights) * 10) / 10,
                    }))}
                    maxVal={Math.max(...topPosts.map((p) => engRate(p.insights)), 1)}
                    color="bg-purple-500/60"
                  />
                </div>
              )}
            </div>

            {/* Top posts table */}
            {topPosts.length > 0 && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">Top Posts</span>
                  </div>
                  <span className="text-xs text-gray-600">ordenado por interações</span>
                </div>
                <div className="space-y-3">
                  {topPosts.map((post, i) => (
                    <PostRow key={post.id} post={post} rank={i + 1} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent posts (sem insights) */}
            {data.recentPosts.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-white">Posts Recentes</span>
                  <span className="text-xs text-gray-600">(últimos {data.recentPosts.length})</span>
                </div>
                <div className="space-y-2">
                  {data.recentPosts.map((post) => (
                    <div key={post.id} className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/3 px-3 py-2">
                      <span className="flex-1 text-xs text-gray-400 line-clamp-1">{snippet(post.text, 80)}</span>
                      <span className="flex-shrink-0 text-xs text-gray-600">{fmtDate(post.timestamp)}</span>
                      {post.permalink && (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-gray-600 hover:text-purple-400 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!data.recentPosts.length && !topPosts.length && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="mb-4 h-12 w-12 text-gray-700" />
                <h3 className="mb-2 text-base font-semibold text-white">Nenhum dado disponível</h3>
                <p className="text-sm text-gray-500">
                  Publique posts no Threads para começar a ver métricas de performance aqui.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
