'use client'

import { useEffect, useState } from 'react'
import { useApiHealth } from '@/hooks/use-polaris-api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import { CheckCircle, XCircle, Users, Play, ListChecks } from 'lucide-react'
import Link from 'next/link'
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard'

// recharts is heavy + DOM-only → code-split, load client-side on demand.
const DashboardActivityChart = dynamic(() => import('./DashboardActivityChart'), {
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

export default function DashboardPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [overview, setOverview] = useState<TeamsOverview | null>(null)
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

      // Check onboarding status from API (authoritative source)
      fetch('/api/auth/profile')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.user?.onboardingCompleted === false) {
            // Redirect to dedicated onboarding page
            window.location.href = '/onboarding'
          }
        })
        .catch(() => {
          // Fallback: check localStorage
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/60">Teams Ativos</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {overview.teams}
                    </p>
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
                    <p className="text-3xl font-bold text-white mt-2">
                      {overview.runsTotal}
                    </p>
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
                    <p className="text-3xl font-bold text-white mt-2">
                      {`${overview.successRate}%`}
                    </p>
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
                    <p className="text-3xl font-bold text-white mt-2">
                      {overview.tasksExecuted}
                    </p>
                  </div>
                  <ListChecks className="h-12 w-12 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

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
              <DashboardActivityChart data={[]} />
            </CardContent>
          </Card>
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
