'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useExecutionStream, ExecutionUpdate, AgentEvent } from '@/hooks/use-execution-stream'
import { AnimatedStepTimeline } from './animated-step-timeline'
import { OrchestrationFlowCanvas } from './flow-canvas'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, AlertCircle, CheckCircle2, Wifi, WifiOff, Network, Clock, Zap, Coins, Bot } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Agent {
  id: string
  name: string
}

interface AgentStep {
  agentId: string
  role: string
}

interface ExecutionLiveViewProps {
  orchestrationId: string
  orchestrationName: string
  agentSteps: AgentStep[]
  agents: Agent[]
  executionId?: string
  initialStatus?: 'pending' | 'running' | 'completed' | 'failed'
  strategy?: string
}

export function ExecutionLiveView({
  orchestrationId,
  orchestrationName,
  agentSteps,
  agents,
  executionId,
  initialStatus,
  strategy = 'sequential'
}: ExecutionLiveViewProps) {
  const [executionState, setExecutionState] = useState<ExecutionUpdate | null>(null)
  const [liveAgentEvents, setLiveAgentEvents] = useState<AgentEvent[]>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const { latestUpdate, agentEvents, isConnected, connectionError } = useExecutionStream({
    orchestrationId,
    enabled: true,
    onUpdate: (update) => {
      setExecutionState(update)
    },
    onAgentEvent: (event) => {
      setLiveAgentEvents(prev => [...prev, event])
      if (event.type === 'started' && event.agentId) {
        setActiveAgentId(event.agentId)
      }
      if (event.type === 'completed') {
        setActiveAgentId(null)
      }
    },
    onError: (error) => {
      console.error('Execution stream error:', error)
    },
    onDone: (summary) => {
      console.log('Execution done:', summary)
    }
  })

  // Use latest update or initialize from props
  const currentExecution = latestUpdate || executionState

  const isRunning = currentExecution?.status === 'running'
  const agentResults = currentExecution?.agentResults || []

  // Find current step index
  const currentStepIndex = agentResults.length

  // Enrich steps with agent names
  const enrichedSteps = agentSteps.map(step => ({
    ...step,
    agentName: agents.find(a => a.id === step.agentId)?.name || 'Unknown Agent'
  }))

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
    return String(tokens)
  }

  const getStatusBadge = () => {
    if (!currentExecution) {
      return (
        <Badge variant="outline" className="bg-gray-500/20 text-gray-300">
          Aguardando...
        </Badge>
      )
    }

    switch (currentExecution.status) {
      case 'running':
        return (
          <Badge className="bg-blue-500 animate-pulse gap-1">
            <Activity className="h-3 w-3" />
            Executando em Tempo Real
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-500 gap-1">
            <AlertCircle className="h-3 w-3" />
            Falhou
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-yellow-500 gap-1">
            <AlertCircle className="h-3 w-3" />
            Cancelado
          </Badge>
        )
      case 'rate_limited':
        return (
          <Badge className="bg-orange-500 gap-1">
            <AlertCircle className="h-3 w-3" />
            Rate Limited
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-500/20 text-gray-300">
            Pendente
          </Badge>
        )
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Execução ao Vivo</CardTitle>
          <div className="flex items-center gap-2">
            {/* Connection status */}
            {isConnected ? (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <Wifi className="h-3 w-3" />
                <span>Conectado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <WifiOff className="h-3 w-3" />
                <span>Desconectado</span>
              </div>
            )}

            {getStatusBadge()}
          </div>
        </div>

        {currentExecution?.executionId && (
          <div className="text-xs text-white/40 mt-1">
            ID: {currentExecution.executionId}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Error Display */}
        {currentExecution?.error && (
          <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Erro na Execução</p>
                <p className="text-xs text-red-300/80 mt-1">{currentExecution.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Error */}
        {connectionError && (
          <div className="mb-4 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-2">
              <WifiOff className="h-4 w-4 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Erro de Conexão</p>
                <p className="text-xs text-yellow-300/80 mt-1">{connectionError.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Per-Agent Live Feedback Bars */}
        {isRunning && agentResults.length > 0 && (
          <div className="mb-4 space-y-2">
            <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Feedback por Agente
            </h4>
            {agentResults.map((result, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${activeAgentId === result.agentId
                    ? 'bg-blue-500/10 border-blue-500/30 animate-pulse'
                    : result.status === 'rejected'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-white/5 border-white/10'
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${activeAgentId === result.agentId
                    ? 'bg-blue-500/20 text-blue-300'
                    : result.status === 'rejected'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-green-500/20 text-green-300'
                  }`}>
                  <Bot className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {result.agentName || `Step ${i + 1}`}
                    </span>
                    <span className="text-xs text-white/40">{result.role}</span>
                  </div>
                  {result.outputPreview && (
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {result.output?.slice(0, 80)}...
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-white/40 shrink-0">
                  {result.durationMs != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(result.durationMs)}
                    </span>
                  )}
                  {result.tokensUsed > 0 && (
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {formatTokens(result.tokensUsed)}
                    </span>
                  )}
                  {result.status === 'rejected' ? (
                    <Badge variant="outline" className="text-red-400 border-red-400/30 text-[10px] h-5">
                      Rejeitado
                    </Badge>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                </div>
              </div>
            ))}

            {/* Currently running agent indicator */}
            {activeAgentId && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-blue-500/30 bg-blue-500/5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-blue-300">
                    {agents.find(a => a.id === activeAgentId)?.name || 'Processando...'}
                  </span>
                  <p className="text-xs text-blue-300/50">Gerando resposta...</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs: Timeline vs Flow */}
        <Tabs defaultValue="timeline" className="mt-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="timeline" className="gap-2">
              <Activity className="h-3 w-3" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="flow" className="gap-2">
              <Network className="h-3 w-3" />
              Grafo Visual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            {enrichedSteps.length > 0 ? (
              <AnimatedStepTimeline
                steps={enrichedSteps}
                results={agentResults}
                isRunning={isRunning}
                currentStepIndex={currentStepIndex}
              />
            ) : (
              <div className="text-center py-8 text-white/60">
                Nenhum agente configurado
              </div>
            )}
          </TabsContent>

          <TabsContent value="flow" className="mt-4">
            {enrichedSteps.length > 0 ? (
              <OrchestrationFlowCanvas
                steps={enrichedSteps}
                results={agentResults}
                isRunning={isRunning}
                currentStepIndex={currentStepIndex}
                strategy={strategy}
              />
            ) : (
              <div className="text-center py-8 text-white/60">
                Nenhum agente configurado
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Progress Summary */}
        {currentExecution && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-white/40">Progresso</p>
                <p className="text-lg font-semibold text-white">
                  {agentResults.filter(r => r.status !== 'rejected').length}/{enrichedSteps.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40">Tokens Usados</p>
                <p className="text-lg font-semibold text-white">
                  {formatTokens(agentResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40">Duração</p>
                <p className="text-lg font-semibold text-white">
                  {currentExecution.durationMs
                    ? formatDuration(currentExecution.durationMs)
                    : currentExecution.completedAt && currentExecution.startedAt
                      ? formatDuration(new Date(currentExecution.completedAt).getTime() - new Date(currentExecution.startedAt).getTime())
                      : isRunning
                        ? 'Em andamento...'
                        : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40">Custo Est.</p>
                <p className="text-lg font-semibold text-white">
                  {currentExecution.estimatedCost
                    ? `$${currentExecution.estimatedCost.toFixed(4)}`
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
