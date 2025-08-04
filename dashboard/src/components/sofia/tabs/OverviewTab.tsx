import React from 'react';
import { TrendingUp, MessageSquare, Target, Users, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardData, useRecentConversations, useApiHealth, formatStatsForDisplay } from '@/hooks/useSofiaApi';

export const OverviewTab = () => {
  // 🔗 Hooks para dados reais
  const { data, loading, error, refresh } = useDashboardData();
  const { conversations, loading: conversationsLoading } = useRecentConversations();
  const { isHealthy, healthData } = useApiHealth();

  // 📊 Formatar stats para display
  const statsCards = data ? formatStatsForDisplay(data.stats) : [];

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <h1 className="text-foreground">Carregando Dashboard...</h1>
          </div>
          <p className="text-foreground-secondary text-lg">
            Buscando dados em tempo real do backend
          </p>
        </div>
      </div>
    );
  }

  // ❌ Error state
  if (error) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <WifiOff className="h-6 w-6 text-red-400" />
            <h1 className="text-foreground">Erro de Conexão</h1>
          </div>
          <p className="text-red-400 text-lg">
            {error}
          </p>
          <Button onClick={refresh} className="button-luxury">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  // ✅ Success state com dados reais
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Section com Status */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-4">
          <h1 className="text-foreground">Dashboard SOFIA IA</h1>
          <Badge className={`${isHealthy ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
            <div className="flex items-center space-x-1">
              {isHealthy ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isHealthy ? 'Online' : 'Offline'}</span>
            </div>
          </Badge>
        </div>
        <p className="text-foreground-secondary text-lg">
          Inteligência artificial conversando e convertendo para você
        </p>
        {data?.last_updated && (
          <p className="text-foreground-tertiary text-sm">
            Última atualização: {new Date(data.last_updated).toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      {/* Stats Grid com Dados Reais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          // Mapear icons
          const getIcon = (iconName: string) => {
            switch (iconName) {
              case 'MessageSquare': return MessageSquare;
              case 'Target': return Target;
              case 'Users': return Users;
              case 'TrendingUp': return TrendingUp;
              default: return MessageSquare;
            }
          };
          
          const Icon = getIcon(stat.icon);
          
          return (
            <Card key={stat.title} className="glass-card hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-light text-foreground-secondary tracking-wide-sofia">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extralight text-foreground mb-1">
                  {stat.value}
                </div>
                <p className={`text-sm ${stat.color}`}>
                  {stat.change} últimas 24h
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart and Chat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Chart com Dados Reais */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground font-light tracking-wider-sofia">
              Atividade das Últimas 24h
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.activity_chart || []}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--foreground-tertiary))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--foreground-tertiary))', fontSize: 12 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {data?.activity_chart && (
              <div className="mt-4 text-center">
                <p className="text-xs text-foreground-tertiary">
                  Total de {data.activity_chart.reduce((sum, item) => sum + item.value, 0)} conversas registradas
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Preview com Dados Reais */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground font-light tracking-wider-sofia">
              Sofia IA em Ação
            </CardTitle>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Tempo Real</span>
              </div>
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 h-64 overflow-y-auto custom-scrollbar">
              {conversationsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        max-w-xs px-4 py-2 rounded-card text-sm font-light
                        ${message.type === 'sent'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-xs opacity-70">
                          {message.user}
                        </div>
                        {message.lead_score && (
                          <Badge className="text-xs px-1 py-0">
                            {message.lead_score}
                          </Badge>
                        )}
                      </div>
                      <div>{message.message}</div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs opacity-50">
                          {message.time}
                        </div>
                        {message.automated && (
                          <Badge className="text-xs px-1 py-0 bg-blue-500/20 text-blue-400">
                            IA
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-foreground-tertiary">
                  <p>Nenhuma conversa recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Distribution (Nova seção com dados reais) */}
      {data?.leads_by_status && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-foreground font-light tracking-wider-sofia">
              Distribuição de Leads por Temperatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center space-y-2">
                <div className="text-2xl font-extralight text-blue-400">
                  {data.leads_by_status.cold}
                </div>
                <p className="text-sm text-foreground-secondary">Frios</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl font-extralight text-yellow-400">
                  {data.leads_by_status.warm}
                </div>
                <p className="text-sm text-foreground-secondary">Mornos</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl font-extralight text-orange-400">
                  {data.leads_by_status.hot}
                </div>
                <p className="text-sm text-foreground-secondary">Quentes</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl font-extralight text-red-400">
                  {data.leads_by_status.immediate}
                </div>
                <p className="text-sm text-foreground-secondary">Imediatos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && healthData && (
        <Card className="glass-card border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-blue-400 font-light tracking-wider-sofia">
              Debug - API Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-foreground-tertiary overflow-x-auto">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};