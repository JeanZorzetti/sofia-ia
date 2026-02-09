'use client'

import { useEffect, useState } from 'react'
import { useRecentConversations, useApiHealth } from '@/hooks/use-sofia-api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MessageSquare, TrendingUp, Target, Percent, Loader2, CheckCircle, XCircle, Users, Workflow, Calendar } from 'lucide-react'
import Link from 'next/link'
import { OnboardingWizard } from '@/components/onboarding-wizard'

interface AnalyticsOverview {
  conversationsStarted: number
  conversationsCompleted: number
  conversationsActive: number
  messagesSent: number
  messagesReceived: number
  messagesTotal: number
  leadsCreated: number
  leadsQualified: number
  conversionCount: number
  conversionRate: number
  qualificationRate: number
  avgResponseTime: number
  aiInteractions: number
  activeAgents: number
  activeWorkflows: number
}

interface TimelineData {
  date: string
  conversationsStarted: number
  messagesSent: number
  messagesReceived: number
  leadsCreated: number
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null)
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userId, setUserId] = useState<string>('')

  const { data: conversations, loading: conversationsLoading } = useRecentConversations()
  const { isHealthy } = useApiHealth()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      const parsedUser = JSON.parse(user)
      setUserId(parsedUser.id)

      const onboardingCompleted = localStorage.getItem('onboarding_completed')
      if (!onboardingCompleted) {
        setTimeout(() => setShowOnboarding(true), 1000)
      }
    }
  }, [])

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      try {
        const response = await fetch(`/api/analytics/overview?period=${period}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setAnalytics(data.overview)
          setTimeline(data.timeline)
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  const stats = [
    {
      title: 'Conversas Ativas',
      value: analytics?.conversationsActive || 0,
      icon: MessageSquare,
      color: 'text-blue-400',
      subtitle: `${analytics?.conversationsStarted || 0} iniciadas no período`
    },
    {
      title: 'Taxa de Conversão',
      value: `${analytics?.conversionRate || 0}%`,
      icon: Percent,
      color: 'text-green-400',
      subtitle: `${analytics?.conversionCount || 0} leads convertidos`
    },
    {
      title: 'Leads Qualificados',
      value: analytics?.leadsQualified || 0,
      icon: Target,
      color: 'text-purple-400',
      subtitle: `${analytics?.qualificationRate || 0}% de qualificação`
    },
    {
      title: 'Tempo Médio Resposta',
      value: `${Math.round(analytics?.avgResponseTime || 0)}s`,
      icon: TrendingUp,
      color: 'text-yellow-400',
      subtitle: `${analytics?.aiInteractions || 0} interações IA`
    }
  ]

  const chartData = timeline.map(day => ({
    date: new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    mensagens: day.messagesSent + day.messagesReceived,
    conversas: day.conversationsStarted,
    leads: day.leadsCreated,
  }))

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/60 mt-1">Visão geral do sistema</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/60">{stat.title}</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <Icon className={`h-12 w-12 ${stat.color}`} />
                </div>
                <p className="text-xs text-white/40 mt-2">{stat.subtitle}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card hover-scale">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Agentes Ativos</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {analytics?.activeAgents || 0}
                </p>
              </div>
              <Users className="h-10 w-10 text-cyan-400" />
            </div>
            <Link href="/dashboard/agents">
              <Button variant="ghost" size="sm" className="w-full mt-4 text-cyan-400">
                Ver agentes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-card hover-scale">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Workflows Ativos</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {analytics?.activeWorkflows || 0}
                </p>
              </div>
              <Workflow className="h-10 w-10 text-orange-400" />
            </div>
            <Link href="/dashboard/workflows">
              <Button variant="ghost" size="sm" className="w-full mt-4 text-orange-400">
                Ver workflows
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-card hover-scale">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Total Mensagens</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {analytics?.messagesTotal || 0}
                </p>
              </div>
              <MessageSquare className="h-10 w-10 text-pink-400" />
            </div>
            <div className="text-xs text-white/40 mt-4">
              {analytics?.messagesSent || 0} enviadas • {analytics?.messagesReceived || 0} recebidas
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Atividade no Período</CardTitle>
          <Link href="/dashboard/analytics">
            <Button variant="ghost" size="sm">
              Ver detalhes
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Line
                type="monotone"
                dataKey="mensagens"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Mensagens"
              />
              <Line
                type="monotone"
                dataKey="conversas"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                name="Conversas"
              />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
                name="Leads"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Conversas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {conversationsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          ) : (
            <div className="space-y-4">
              {conversations?.slice(0, 5).map((conversation: any) => (
                <div
                  key={conversation.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {conversation.contact_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {conversation.contact_name || 'Usuário Anônimo'}
                      </p>
                      <p className="text-sm text-white/60">
                        {conversation.last_message || 'Sem mensagens'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                      {conversation.status || 'Ativo'}
                    </Badge>
                    <p className="text-xs text-white/40 mt-1">
                      {new Date(conversation.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        userId={userId}
      />
    </div>
  )
}
