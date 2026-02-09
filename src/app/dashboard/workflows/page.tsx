'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import {
  Target,
  Clock,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Activity,
  Plus,
  Play,
  Eye,
  Sparkles
} from 'lucide-react'

interface Workflow {
  id: string
  name: string
  description: string | null
  trigger: any
  conditions: any[]
  actions: any[]
  status: string
  lastRun: string | null
  runCount: number
  successCount: number
  createdAt: string
  creator: {
    id: string
    name: string
    email: string
  }
  _count: {
    executions: number
  }
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false)
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    triggerType: 'event',
    triggerEvent: 'message.received',
    actionType: 'send_whatsapp',
    actionMessage: ''
  })

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows')
      const data = await response.json()
      if (data.success) {
        setWorkflows(data.data)
      }
    } catch (error) {
      console.error('Error fetching workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (workflowId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setWorkflows(prev =>
          prev.map(workflow =>
            workflow.id === workflowId
              ? { ...workflow, status: newStatus }
              : workflow
          )
        )
      }
    } catch (error) {
      console.error('Error toggling workflow:', error)
    }
  }

  const handleRunWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ context: {} })
      })

      if (response.ok) {
        alert('Workflow executado com sucesso!')
        fetchWorkflows()
      } else {
        const data = await response.json()
        alert(`Erro ao executar workflow: ${data.error}`)
      }
    } catch (error) {
      console.error('Error running workflow:', error)
      alert('Erro ao executar workflow')
    }
  }

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name || !newWorkflow.actionMessage) {
      alert('Preencha os campos obrigatórios')
      return
    }

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newWorkflow.name,
          description: newWorkflow.description,
          trigger: {
            type: newWorkflow.triggerType,
            config: {
              event: newWorkflow.triggerEvent
            }
          },
          conditions: [],
          actions: [
            {
              type: newWorkflow.actionType,
              config: {
                message: newWorkflow.actionMessage,
                instance: 'sofia'
              }
            }
          ],
          status: 'inactive'
        })
      })

      if (response.ok) {
        setCreateDialogOpen(false)
        setNewWorkflow({
          name: '',
          description: '',
          triggerType: 'event',
          triggerEvent: 'message.received',
          actionType: 'send_whatsapp',
          actionMessage: ''
        })
        fetchWorkflows()
      }
    } catch (error) {
      console.error('Error creating workflow:', error)
    }
  }

  const getWorkflowIcon = (workflow: Workflow) => {
    if (workflow.name.toLowerCase().includes('qualifica')) return Target
    if (workflow.name.toLowerCase().includes('follow')) return Clock
    if (workflow.name.toLowerCase().includes('alerta')) return AlertCircle
    return MessageSquare
  }

  const getWorkflowColor = (workflow: Workflow) => {
    if (workflow.name.toLowerCase().includes('qualifica')) return 'text-blue-400'
    if (workflow.name.toLowerCase().includes('follow')) return 'text-purple-400'
    if (workflow.name.toLowerCase().includes('alerta')) return 'text-red-400'
    return 'text-green-400'
  }

  const totalExecutions = workflows.reduce((sum, w) => sum + w.runCount, 0)
  const avgSuccessRate = workflows.length > 0
    ? Math.round(workflows.reduce((sum, w) => {
        const rate = w.runCount > 0 ? (w.successCount / w.runCount) * 100 : 0
        return sum + rate
      }, 0) / workflows.length)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Carregando workflows...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Automações</h1>
          <p className="text-white/60 mt-1">Workflows automatizados com IA</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Workflows Ativos</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {workflows.filter(w => w.status === 'active').length}/{workflows.length}
                </p>
              </div>
              <Activity className="h-12 w-12 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Execuções Totais</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {totalExecutions}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Taxa de Sucesso</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {avgSuccessRate}%
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {workflows.length === 0 && !loading && (
        <Card className="glass-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted/50 p-6">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-2xl font-semibold text-white">Nenhum workflow criado</h3>
            <p className="mb-6 text-center text-white/60 max-w-md">
              Workflows automatizam processos e economizam tempo. Crie seu primeiro workflow ou use um template pronto.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Criar Workflow
              </Button>
              <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/templates?type=workflow')}>
                Ver Templates
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((workflow) => {
          const Icon = getWorkflowIcon(workflow)
          const color = getWorkflowColor(workflow)
          const successRate = workflow.runCount > 0
            ? Math.round((workflow.successCount / workflow.runCount) * 100)
            : 0

          return (
            <Card key={workflow.id} className="glass-card hover-scale">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-white/5`}>
                      <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white text-lg">
                          {workflow.name}
                        </CardTitle>
                        {workflow.status === 'active' && (
                          <Badge variant="default" className="bg-green-500 text-white text-xs">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-white/60 mt-2">
                        {workflow.description || 'Sem descrição'}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={workflow.status === 'active'}
                    onCheckedChange={() => handleToggle(workflow.id, workflow.status)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-white/60">Execuções</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {workflow.runCount}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-white/60">Taxa de Sucesso</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {successRate}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Performance</span>
                      <span className="text-white font-medium">
                        {successRate}%
                      </span>
                    </div>
                    <Progress value={successRate} className="h-2" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/dashboard/workflows/${workflow.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRunWorkflow(workflow.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Executar
                    </Button>
                  </div>

                  {workflow.status === 'active' && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-green-400">
                        Workflow em execução
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Criar Novo Workflow</DialogTitle>
            <DialogDescription className="text-white/60">
              Configure um workflow de automação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Nome *</Label>
              <Input
                id="name"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Ex: Follow-up Automático"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-white">Descrição</Label>
              <Textarea
                id="description"
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Descreva o que este workflow faz"
              />
            </div>
            <div>
              <Label htmlFor="triggerEvent" className="text-white">Trigger (Gatilho)</Label>
              <Select
                value={newWorkflow.triggerEvent}
                onValueChange={(value) => setNewWorkflow({ ...newWorkflow, triggerEvent: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="message.received">Nova mensagem recebida</SelectItem>
                  <SelectItem value="conversation.created">Nova conversa criada</SelectItem>
                  <SelectItem value="lead.qualified">Lead qualificado</SelectItem>
                  <SelectItem value="lead.score_updated">Score do lead atualizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="actionType" className="text-white">Ação</Label>
              <Select
                value={newWorkflow.actionType}
                onValueChange={(value) => setNewWorkflow({ ...newWorkflow, actionType: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="send_whatsapp">Enviar mensagem WhatsApp</SelectItem>
                  <SelectItem value="update_lead">Atualizar lead</SelectItem>
                  <SelectItem value="notify_webhook">Notificar via webhook</SelectItem>
                  <SelectItem value="call_agent">Chamar agente IA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="actionMessage" className="text-white">Mensagem *</Label>
              <Textarea
                id="actionMessage"
                value={newWorkflow.actionMessage}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, actionMessage: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Ex: Olá {{lead.nome}}! Como posso ajudar?"
              />
              <p className="text-xs text-white/40 mt-1">
                Use variáveis: {`{{lead.nome}}, {{lead.telefone}}, {{message.content}}`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateWorkflow}>
              Criar Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
