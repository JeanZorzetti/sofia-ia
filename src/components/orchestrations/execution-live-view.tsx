'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useExecutionStream, ExecutionUpdate } from '@/hooks/use-execution-stream'
import { AnimatedStepTimeline } from './animated-step-timeline'
import { OrchestrationFlowCanvas } from './flow-canvas'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, AlertCircle, CheckCircle2, Wifi, WifiOff, Network } from 'lucide-react'
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

  const { latestUpdate, isConnected, connectionError } = useExecutionStream({
    orchestrationId,
    enabled: true,
    onUpdate: (update) => {
      setExecutionState(update)
    },
    onError: (error) => {
      console.error('Execution stream error:', error)
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
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-white/40">Progresso</p>
                <p className="text-lg font-semibold text-white">
                  {agentResults.length}/{enrichedSteps.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40">Tokens Usados</p>
                <p className="text-lg font-semibold text-white">
                  {agentResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40">Duração</p>
                <p className="text-lg font-semibold text-white">
                  {currentExecution.completedAt && currentExecution.startedAt
                    ? `${((new Date(currentExecution.completedAt).getTime() - new Date(currentExecution.startedAt).getTime()) / 1000).toFixed(1)}s`
                    : isRunning
                    ? 'Em andamento...'
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
