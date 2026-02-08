'use client'

import { useDashboardData, useRecentConversations, useApiHealth } from '@/hooks/use-sofia-api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MessageSquare, TrendingUp, Target, Percent, Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function DashboardPage() {
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData()
  const { data: conversations, loading: conversationsLoading } = useRecentConversations()
  const { isHealthy, healthData } = useApiHealth()

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  const stats = [
    {
      title: 'Conversas Ativas',
      value: dashboardData?.stats?.active_conversations || 0,
      icon: MessageSquare,
      color: 'text-blue-400'
    },
    {
      title: 'Taxa de Conversão',
      value: `${dashboardData?.stats?.conversion_rate || 0}%`,
      icon: Percent,
      color: 'text-green-400'
    },
    {
      title: 'Leads Qualificados',
      value: dashboardData?.stats?.qualified_leads || 0,
      icon: Target,
      color: 'text-purple-400'
    },
    {
      title: 'Crescimento',
      value: `+${dashboardData?.stats?.growth_percentage || 0}%`,
      icon: TrendingUp,
      color: 'text-yellow-400'
    }
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/60 mt-1">Visão geral do sistema</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="glass-card hover-scale">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">{stat.title}</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <Icon className={`h-12 w-12 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Atividade dos Últimos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData?.activity_chart || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="day"
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
                dataKey="messages"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
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
    </div>
  )
}
