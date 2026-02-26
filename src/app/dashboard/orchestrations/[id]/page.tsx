'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Calendar,
  Eye,
  FastForward,
  Pencil,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
} from 'lucide-react'
import { AnalyticsDashboard } from '@/components/orchestrations/analytics-dashboard'
import { EditableFlowCanvas } from '@/components/orchestrations/editable-flow-canvas'
import { ExecutionHistory } from '@/components/orchestrations/execution-history'
import { ExecutionLiveView } from '@/components/orchestrations/execution-live-view'
import { OrchestrationFlowCanvas } from '@/components/orchestrations/flow-canvas'
import { OutputWebhooksManager } from '@/components/dashboard/orchestrations/OutputWebhooksManager'
import { ScheduleDialog } from '@/components/dashboard/orchestrations/ScheduleDialog'
import { useOrchestrationDetail } from '@/components/dashboard/orchestrations/useOrchestrationDetail'

export default function OrchestrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()

  const {
    orchestration,
    agents,
    loading,
    executeDialogOpen, setExecuteDialogOpen,
    executionInput, setExecutionInput,
    executing,
    isEditingGraph, setIsEditingGraph,
    savingGraph,
    continueDialogOpen, setContinueDialogOpen,
    continueFromStepIndex, setContinueFromStepIndex,
    outputWebhooks, setOutputWebhooks,
    savingWebhooks,
    scheduleDialogOpen, setScheduleDialogOpen,
    editDialogOpen, setEditDialogOpen,
    editingOrchestration, setEditingOrchestration,
    handleExecute,
    handleStopExecution,
    handleContinueFromStep,
    handleSaveWebhooks,
    handleDelete,
    handleSaveGraph,
    handleUpdate,
    addAgentStep,
    updateAgentStep,
    removeAgentStep,
    getAgentName,
  } = useOrchestrationDetail(resolvedParams.id)

  const getStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'sequential': return 'Agentes executam em ordem, cada um recebe a saída do anterior'
      case 'parallel': return 'Todos os agentes executam simultaneamente com a mesma entrada'
      case 'consensus': return 'Agentes votam e a resposta mais comum é escolhida'
      default: return ''
    }
  }

  const getStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case 'sequential':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">Sequencial</Badge>
      case 'parallel':
        return <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/50">Paralelo</Badge>
      case 'consensus':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">Consenso</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Carregando orquestração...</div>
      </div>
    )
  }

  if (!orchestration) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Orquestração não encontrada</div>
      </div>
    )
  }

  const latestExecution = orchestration?.executions?.[0]

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{orchestration.name}</h1>
            <p className="text-white/60 mt-1">{orchestration.description || 'Sem descrição'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setScheduleDialogOpen(true)}
            variant="outline"
            className="gap-2 border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
          >
            <Calendar className="h-4 w-4" />
            Agendar
          </Button>
          <Button onClick={() => setExecuteDialogOpen(true)} className="gap-2 bg-green-600 hover:bg-green-700">
            <Play className="h-4 w-4" />
            Executar
          </Button>
          {executing && (
            <Button onClick={handleStopExecution} variant="destructive" className="gap-2">
              <Square className="h-4 w-4" />
              Parar
            </Button>
          )}
          {latestExecution && latestExecution.agentResults?.length > 0 && (
            <Button
              onClick={() => { setContinueFromStepIndex(0); setContinueDialogOpen(true) }}
              variant="outline"
              className="gap-2 border-blue-500/50 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
            >
              <FastForward className="h-4 w-4" />
              Continuar
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete} size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Pipeline Graph */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg text-white">Pipeline de Agentes</CardTitle>
              {getStrategyBadge(orchestration.strategy)}
              <span className="text-xs text-white/40">
                {orchestration.agents.length} agente{orchestration.agents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-800 rounded-lg p-0.5 border border-white/10">
                <button
                  onClick={() => setIsEditingGraph(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    !isEditingGraph ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Visualizar
                </button>
                <button
                  onClick={() => setIsEditingGraph(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isEditingGraph ? 'bg-blue-500/20 text-blue-300 shadow-sm' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditingGraph ? (
            <EditableFlowCanvas
              steps={orchestration.agents}
              agents={agents}
              strategy={orchestration.strategy}
              saving={savingGraph}
              onSave={handleSaveGraph}
              onCancel={() => setIsEditingGraph(false)}
            />
          ) : (
            <OrchestrationFlowCanvas
              steps={orchestration.agents.map(s => ({ ...s, agentName: getAgentName(s.agentId) }))}
              results={latestExecution?.agentResults}
              isRunning={latestExecution?.status === 'running'}
              strategy={orchestration.strategy}
            />
          )}
        </CardContent>
      </Card>

      {/* Live Execution View */}
      <ExecutionLiveView
        orchestrationId={resolvedParams.id}
        orchestrationName={orchestration.name}
        agentSteps={orchestration.agents}
        agents={agents}
        executionId={latestExecution?.id}
        initialStatus={latestExecution?.status}
        strategy={orchestration.strategy}
      />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard orchestrationId={resolvedParams.id} />

      {/* Output Webhooks */}
      <OutputWebhooksManager
        outputWebhooks={outputWebhooks}
        savingWebhooks={savingWebhooks}
        executions={orchestration.executions}
        onWebhooksChange={setOutputWebhooks}
        onSave={handleSaveWebhooks}
      />

      {/* Execution History */}
      <ExecutionHistory orchestrationId={resolvedParams.id} />

      {/* Execute Dialog */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Executar Orquestração</DialogTitle>
            <DialogDescription className="text-white/60">
              Digite a entrada que será processada pelos agentes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={executionInput}
              onChange={(e) => setExecutionInput(e.target.value)}
              className="bg-white/5 border-white/10 text-white min-h-[150px]"
              placeholder="Ex: Analisar o seguinte texto e extrair insights chave..."
            />
            <p className="text-xs text-white/40">
              Esta entrada será processada pelos {orchestration.agents.length} agentes
              usando a estratégia <strong>{orchestration.strategy}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleExecute()} disabled={executing}>
              {executing ? 'Executando...' : 'Executar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Continue From Step Dialog */}
      <Dialog open={continueDialogOpen} onOpenChange={setContinueDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Continuar Execução</DialogTitle>
            <DialogDescription className="text-white/60">
              Escolha a partir de qual agente enviar o último output
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {latestExecution && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-white/40 mb-2">Última execução ({latestExecution.status}):</p>
                <div className="space-y-1">
                  {(latestExecution.agentResults || []).map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={r.output ? 'text-green-400' : 'text-red-400'}>
                        {r.output ? '✓' : '✗'}
                      </span>
                      <span className="text-white/70">{r.role}</span>
                      <span className="text-white/30">—</span>
                      <span className="text-white/40 truncate max-w-[200px]">
                        {r.output ? `${r.output.substring(0, 50)}...` : '(sem output)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-white/80">Enviar output para:</Label>
              <Select
                value={String(continueFromStepIndex)}
                onValueChange={(v) => setContinueFromStepIndex(Number(v))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  {orchestration.agents.map((step, idx) => (
                    <SelectItem key={idx} value={String(idx)} className="text-white hover:bg-white/10">
                      Step {idx + 1}: {step.role} ({getAgentName(step.agentId)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {latestExecution?.agentResults?.length > 0 && (
              <div className="space-y-2">
                <Label className="text-white/80 text-xs">Input que será enviado (último output):</Label>
                <div className="bg-black/30 rounded-md p-2 text-xs text-white/60 max-h-[100px] overflow-y-auto font-mono">
                  {((latestExecution.agentResults as any[])[(latestExecution.agentResults as any[]).length - 1]?.output || '(vazio)').substring(0, 300)}
                  {((latestExecution.agentResults as any[])[(latestExecution.agentResults as any[]).length - 1]?.output || '').length > 300 && '...'}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContinueDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleContinueFromStep}
              disabled={executing}
              className="gap-2 bg-blue-600 hover:bg-blue-500"
            >
              <FastForward className="h-4 w-4" />
              {executing ? 'Executando...' : 'Continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Orquestração</DialogTitle>
            <DialogDescription className="text-white/60">
              Atualize as configurações e agentes desta orquestração
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editingOrchestration.name}
                onChange={(e) => setEditingOrchestration({ ...editingOrchestration, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={editingOrchestration.description}
                onChange={(e) => setEditingOrchestration({ ...editingOrchestration, description: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-strategy">Estratégia</Label>
              <Select
                value={editingOrchestration.strategy}
                onValueChange={(value) => setEditingOrchestration({ ...editingOrchestration, strategy: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="sequential">Sequencial</SelectItem>
                  <SelectItem value="parallel">Paralelo</SelectItem>
                  <SelectItem value="consensus">Consenso</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-white/40 mt-1">
                {getStrategyDescription(editingOrchestration.strategy)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Agentes</Label>
                <Button size="sm" variant="outline" onClick={addAgentStep}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Agente
                </Button>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {editingOrchestration.agentSteps.map((step, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-white/60">#{index + 1}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAgentStep(index)}
                        className="ml-auto h-6 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Agente</Label>
                        <Select
                          value={step.agentId}
                          onValueChange={(value) => updateAgentStep(index, 'agentId', value)}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10">
                            {agents.map(agent => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Papel</Label>
                        <Input
                          value={step.role}
                          onChange={(e) => updateAgentStep(index, 'role', e.target.value)}
                          className="bg-white/5 border-white/10 text-white h-8 text-xs"
                          placeholder="Ex: Pesquisador"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        orchestrationId={resolvedParams.id}
      />
    </div>
  )
}
