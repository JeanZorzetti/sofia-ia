import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  Users,
  MessageSquare,
  BarChart3,
  CreditCard,
  Activity,
  TrendingUp,
  ArrowRight,
  BrainCircuit,
  Clock,
  Star,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getAdminData() {
  const [
    totalUsers,
    totalLeads,
    totalConversations,
    totalMessages,
    totalAgents,
    totalOrchestrations,
    planGroups,
    recentUsers,
    recentEvents,
    npsEntries,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.lead.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.agent.count(),
    prisma.agentOrchestration.count(),
    prisma.subscription.groupBy({ by: ['plan'], _count: { plan: true } }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        subscription: { select: { plan: true, status: true } },
      },
    }),
    prisma.analyticsEvent.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: { event: true, userId: true, createdAt: true },
    }),
    prisma.npsFeedback.findMany({ select: { score: true } }),
    prisma.subscription.count({ where: { status: 'active', plan: { not: 'free' } } }),
  ])

  let npsScore: number | null = null
  if (npsEntries.length > 0) {
    const promoters = npsEntries.filter((n) => n.score >= 9).length
    const detractors = npsEntries.filter((n) => n.score <= 6).length
    npsScore = Math.round(((promoters - detractors) / npsEntries.length) * 100)
  }

  return {
    stats: {
      totalUsers,
      totalLeads,
      totalConversations,
      totalMessages,
      totalAgents,
      totalOrchestrations,
      activeSubscriptions,
    },
    planGroups,
    recentUsers,
    recentEvents,
    nps: { score: npsScore, total: npsEntries.length },
  }
}

function formatDate(date: Date | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  pro: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  business: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

export default async function AdminPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const data = await getAdminData()

  const statCards = [
    { label: 'Usuários', value: data.stats.totalUsers, icon: Users, color: 'text-blue-400' },
    { label: 'Leads', value: data.stats.totalLeads, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Conversas', value: data.stats.totalConversations, icon: MessageSquare, color: 'text-yellow-400' },
    { label: 'Mensagens', value: data.stats.totalMessages, icon: Activity, color: 'text-pink-400' },
    { label: 'Agentes IA', value: data.stats.totalAgents, icon: BrainCircuit, color: 'text-purple-400' },
    { label: 'Orquestrações', value: data.stats.totalOrchestrations, icon: BarChart3, color: 'text-indigo-400' },
    { label: 'Assinaturas Pagas', value: data.stats.activeSubscriptions, icon: CreditCard, color: 'text-emerald-400' },
    {
      label: 'NPS',
      value: data.nps.score === null ? '—' : data.nps.score,
      icon: Star,
      color: data.nps.score === null ? 'text-gray-400' : data.nps.score >= 50 ? 'text-green-400' : 'text-yellow-400',
    },
  ]

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
            <span className="text-white/60 text-sm">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin/analytics" className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1">
              Analytics <ArrowRight className="w-3 h-3" />
            </Link>
            <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1">
              Dashboard <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded">{user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-white/40 text-sm mt-1">Visão geral da plataforma Sofia AI</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-white/40 uppercase tracking-wider">{card.label}</span>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value.toLocaleString('pt-BR')}</p>
            </div>
          ))}
        </div>

        {/* Plans + NPS row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Plan distribution */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Distribuição de Planos</h2>
            {data.planGroups.length === 0 ? (
              <p className="text-white/30 text-sm">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {data.planGroups.map((g) => {
                  const total = data.planGroups.reduce((s, x) => s + x._count.plan, 0)
                  const pct = total > 0 ? Math.round((g._count.plan / total) * 100) : 0
                  return (
                    <div key={g.plan}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`px-2 py-0.5 rounded border text-xs capitalize ${PLAN_BADGE[g.plan] || PLAN_BADGE.free}`}>
                          {g.plan}
                        </span>
                        <span className="text-white/40">{g._count.plan} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500/60 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* NPS */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Net Promoter Score</h2>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className={`text-5xl font-bold ${
                  data.nps.score === null ? 'text-white/20'
                  : data.nps.score >= 50 ? 'text-green-400'
                  : data.nps.score >= 0 ? 'text-yellow-400'
                  : 'text-red-400'
                }`}>
                  {data.nps.score === null ? '—' : data.nps.score}
                </p>
                <p className="text-white/30 text-xs mt-1">de -100 a 100</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-white/50">{data.nps.total} resposta{data.nps.total !== 1 ? 's' : ''}</p>
                {data.nps.score !== null && (
                  <p className={`text-xs ${
                    data.nps.score >= 50 ? 'text-green-400'
                    : data.nps.score >= 0 ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>
                    {data.nps.score >= 50 ? 'Excelente' : data.nps.score >= 0 ? 'Bom' : 'Precisa melhorar'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Usuários Recentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/5">
                  <th className="pb-3 text-white/30 font-medium">Nome</th>
                  <th className="pb-3 text-white/30 font-medium">Email</th>
                  <th className="pb-3 text-white/30 font-medium px-3">Plano</th>
                  <th className="pb-3 text-white/30 font-medium px-3">Último Login</th>
                  <th className="pb-3 text-white/30 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-white/80 font-medium">{u.name}</td>
                    <td className="py-3 text-white/50">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded border text-xs capitalize ${
                        PLAN_BADGE[u.subscription?.plan ?? 'free'] || PLAN_BADGE.free
                      }`}>
                        {u.subscription?.plan ?? 'free'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-white/40 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {formatDate(u.lastLogin)}
                    </td>
                    <td className="py-3 text-white/40">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Eventos Recentes</h2>
            <Link
              href="/dashboard/admin/analytics"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              Ver analytics completo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.recentEvents.length === 0 ? (
            <p className="text-white/30 text-sm">Nenhum evento registrado</p>
          ) : (
            <div className="space-y-2">
              {data.recentEvents.map((ev, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 flex-shrink-0" />
                    <span className="text-white/70 text-sm font-mono">{ev.event}</span>
                    {ev.userId && (
                      <span className="text-white/25 text-xs font-mono truncate max-w-[120px]">
                        {ev.userId.slice(0, 8)}…
                      </span>
                    )}
                  </div>
                  <span className="text-white/30 text-xs flex-shrink-0">{formatDate(ev.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
