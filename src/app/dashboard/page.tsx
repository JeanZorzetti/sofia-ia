'use client'

import { useEffect, useState } from 'react'
import { useApiHealth } from '@/hooks/use-polaris-api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import { CheckCircle, XCircle, Users, Play, ListChecks, Clock, DollarSign, Zap } from 'lucide-react'
import Link from 'next/link'
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard'

const TeamsActivityChart = dynamic(() => import('./teams/TeamsActivityChart'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-white/5" />,
})

interface TeamsOverview {
  teams: number
  runsTotal: number
  runsCompleted: number
  runsFailed: number
  runsRunning: number
  successRate: number
  tasksExecuted: number
  avgDurationMs?: number
  totalTokens?: number
  totalCost?: number
}

interface RecentRun {
  id: string
  teamId: string
  teamName: string
  status: string
  startedAt: string
  durationMs: number | null
}

interface TimelinePoint {
  date: string
  runs: number
  tasks: number
  cost: number
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default'
  if (status === 'failed' || status === 'rate_limited' || status === 'cancelled') return 'destructive'
  return 'secondary'
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: 'Concluída',
    failed: 'Falhou',
    running: 'Em execução',
    pending: 'Pendente',
    rate_limited: 'Rate limit',
    cancelled: 'Cancelada',
  }
  return labels[status] ?? status
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [overview, setOverview] = useState<TeamsOverview | null>(null)
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([])
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userId, setUserId] = useState<string>('')

  const { isHealthy } = useApiHealth()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      const parsedUser = JSON.parse(user)
      setUserId(parsedUser.id)

      fetch('/api/auth/profile')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.user?.onboardingCompleted === false) {
            window.location.href = '/onboarding'
          }
        })
        .catch(() => {
          const onboardingCompleted = localStorage.getItem('onboarding_completed')
          if (!onboardingCompleted) {
            setTimeout(() => setShowOnboarding(true), 1000)
          }
        })
    }
  }, [])

  useEffect(() => {
    async function fetchOverview() {
      setLoading(true)
      setError(false)
      try {
        const response = await fetch(`/api/teams/overview?period=${period}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setOverview(data.overview)
          setRecentRuns(data.recentRuns ?? [])
          setTimeline(data.timeline ?? [])
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [period, retryCount])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-6 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/60 mt-1">Visão geral da operação de Teams</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={period === '7d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('7d')}
            >
              7 dias
            </Button>
            <Button
              variant={period === '30d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('30d')}
            >
              30 dias
            </Button>
            <Button
              variant={period === '90d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('90d')}
            >
              90 dias
            </Button>
          </div>
          <Badge
            variant={isHealthy ? 'default' : 'destructive'}
            className="flex items-center gap-2"
          >
            {isHealthy ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isHealthy ? 'Sistema Online' : 'Sistema Offline'}
          </Badge>
        </div>
      </div>

      {error ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-white/60 mb-4">Não foi possível carregar os dados.</p>
            <Button
              onClick={() => {
                setError(false)
                setRetryCount((c) => c + 1)
              }}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : !overview || overview.teams === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum Team encontrado</h3>
            <p className="text-white/60 mb-6">Comece criando seu primeiro Team de agentes</p>
            <Link href="/dashboard/teams">
              <Button variant="default">Criar Team</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Row 1 — primary metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/60">Teams Ativos</p>
                    <p className="text-3xl font-bold text-white mt-2">{overview.teams}</p>
                  </div>
                  <Users className="h-12 w-12 text-cyan-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/60">Execuções no Período</p>
                    <p className="text-3xl font-bold text-white mt-2">{overview.runsTotal}</p>
                  </div>
                  <Play className="h-12 w-12 text-blue-400" />
                </div>
                <p className="text-xs text-white/40 mt-2">No período selecionado</p>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/60">Taxa de Sucesso</p>
                    <p className="text-3xl font-bold text-white mt-2">{`${overview.successRate}%`}</p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-green-400" />
                </div>
                <p className="text-xs text-white/40 mt-2">{overview.runsCompleted} concluídas</p>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/60">Tasks Executadas</p>
                    <p className="text-3xl font-bold text-white mt-2">{overview.tasksExecuted}</p>
                  </div>
                  <ListChecks className="h-12 w-12 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2 — rich metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/60">Tokens Totais</p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {overview.totalTokens != null
                        ? overview.totalTokens.toLocaleString('pt-BR')
                        : '—'}
                    </p>
                  </div>
                  <Zap className="h-10 w-10 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/60">Custo Total</p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {overview.totalCost != null
                        ? `$${Number(overview.totalCost).toFixed(4)}`
                        : '—'}
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/60">Duração Média</p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {formatDuration(overview.avgDurationMs ?? null)}
                    </p>
                  </div>
                  <Clock className="h-10 w-10 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3 — chart + recent runs */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Atividade no Período</CardTitle>
                <Link href="/dashboard/teams">
                  <Button variant="ghost" size="sm">
                    Ver Teams
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <TeamsActivityChart data={timeline} />
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Execuções Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {recentRuns.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">
                    Nenhuma execução no período.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentRuns.map((run) => (
                      <Link
                        key={run.id}
                        href={`/dashboard/teams/${run.teamId}`}
                        className="flex items-center justify-between rounded-lg p-3 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium text-white truncate">
                            {run.teamName}
                          </span>
                          <span className="text-xs text-white/40">
                            {formatDate(run.startedAt)}
                            {run.durationMs != null && (
                              <> · {formatDuration(run.durationMs)}</>
                            )}
                          </span>
                        </div>
                        <Badge
                          variant={statusBadgeVariant(run.status)}
                          className="ml-3 shrink-0 text-xs"
                        >
                          {statusLabel(run.status)}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        userId={userId}
      />
    </div>
  )
}
