'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  GitBranch,
  Users,
  Play,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'

interface Agent {
  id: string
  name: string
  description: string | null
}

interface Orchestration {
  id: string
  name: string
  description: string | null
  agents: any[]
  strategy: string
  status: string
  createdAt: string
  _count: {
    executions: number
  }
  executions: any[]
}

interface AgentStep {
  agentId: string
  role: string
  prompt?: string
}

interface TemplateInfo {
  id: string
  name: string
  description: string
  category: string
  icon: string
  strategy: string
  agentCount: number
  agentRoles: string[]
  exampleInput: string
  expectedOutput: string
  estimatedDuration: string
  tags: string[]
}

export default function OrchestrationsPage() {
  const router = useRouter()
  const [orchestrations, setOrchestrations] = useState<Orchestration[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState<boolean>(false)
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null)
  const [createMode, setCreateMode] = useState<'template' | 'manual'>('template')
  const [newOrchestration, setNewOrchestration] = useState<{
    name: string
    description: string
    strategy: string
    agentSteps: AgentStep[]
  }>({
    name: '',
    description: '',
    strategy: 'sequential',
    agentSteps: []
  })

  useEffect(() => {
    fetchOrchestrations()
    fetchAgents()
    fetchTemplates()
  }, [])

  const fetchOrchestrations = async () => {
    try {
      const response = await fetch('/api/orchestrations')
      const data = await response.json()
      if (data.success) {
        setOrchestrations(data.data)
      }
    } catch (error) {
      console.error('Error fetching orchestrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      if (data.success) {
        setAgents(data.data)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/orchestrations/templates')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      setCreatingFromTemplate(templateId)
      const response = await fetch('/api/orchestrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTemplate: templateId })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Orquestração criada a partir do template!')
        setTemplateDialogOpen(false)
        fetchOrchestrations()
        // Navigate to the new orchestration
        router.push(`/dashboard/orchestrations/${data.data.id}`)
      } else {
        toast.error(data.error || 'Erro ao criar orquestração')
      }
    } catch (error) {
      console.error('Error creating from template:', error)
      toast.error('Erro ao criar orquestração')
    } finally {
      setCreatingFromTemplate(null)
    }
  }

  const handleCreateOrchestration = async () => {
    if (!newOrchestration.name.trim() || newOrchestration.agentSteps.length === 0) {
      toast.error('Nome e pelo menos um agente são obrigatórios')
      return
    }

    try {
      const response = await fetch('/api/orchestrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newOrchestration.name,
          description: newOrchestration.description,
          agents: newOrchestration.agentSteps,
          strategy: newOrchestration.strategy
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Orquestração criada com sucesso!')
        setCreateDialogOpen(false)
        setNewOrchestration({
          name: '',
          description: '',
          strategy: 'sequential',
          agentSteps: []
        })
        fetchOrchestrations()
      } else {
        toast.error(data.error || 'Erro ao criar orquestração')
      }
    } catch (error) {
      console.error('Error creating orchestration:', error)
      toast.error('Erro ao criar orquestração')
    }
  }

  const handleDeleteOrchestration = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta orquestração?')) return

    try {
      const response = await fetch(`/api/orchestrations/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Orquestração excluída')
        fetchOrchestrations()
      }
    } catch (error) {
      console.error('Error deleting orchestration:', error)
      toast.error('Erro ao excluir orquestração')
    }
  }

  const addAgentStep = () => {
    setNewOrchestration({
      ...newOrchestration,
      agentSteps: [
        ...newOrchestration.agentSteps,
        { agentId: '', role: '' }
      ]
    })
  }

  const updateAgentStep = (index: number, field: string, value: string) => {
    const updatedSteps = [...newOrchestration.agentSteps]
    updatedSteps[index] = { ...updatedSteps[index], [field]: value }
    setNewOrchestration({ ...newOrchestration, agentSteps: updatedSteps })
  }

  const removeAgentStep = (index: number) => {
    const updatedSteps = newOrchestration.agentSteps.filter((_, i) => i !== index)
    setNewOrchestration({ ...newOrchestration, agentSteps: updatedSteps })
  }

  const getStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case 'sequential':
        return <Badge className="bg-blue-500">Sequencial</Badge>
      case 'parallel':
        return <Badge className="bg-purple-500">Paralelo</Badge>
      case 'consensus':
        return <Badge className="bg-green-500">Consenso</Badge>
      default:
        return <Badge>{strategy}</Badge>
    }
  }

  const getStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'sequential':
        return 'Agentes executam em ordem, cada um recebe a saída do anterior'
      case 'parallel':
        return 'Todos os agentes executam simultaneamente com a mesma entrada'
      case 'consensus':
        return 'Agentes votam e a resposta mais comum é escolhida'
      default:
        return ''
    }
  }

  const getLastExecutionBadge = (orchestration: Orchestration) => {
    const lastExec = orchestration.executions?.[0]
    if (!lastExec) return null

    if (lastExec.status === 'completed') {
      const duration = lastExec.completedAt && lastExec.startedAt
        ? Math.round((new Date(lastExec.completedAt).getTime() - new Date(lastExec.startedAt).getTime()) / 1000)
        : null
      return (
        <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs gap-1">
          <CheckCircle className="w-3 h-3" />
          {duration ? `${duration}s` : 'Sucesso'}
        </Badge>
      )
    }
    if (lastExec.status === 'failed') {
      return (
        <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs gap-1">
          <XCircle className="w-3 h-3" />
          Falhou
        </Badge>
      )
    }
    if (lastExec.status === 'running') {
      return (
        <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 text-xs gap-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          Executando
        </Badge>
      )
    }
    return null
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'marketing': return 'from-pink-500/20 to-purple-500/20 border-pink-500/30'
      case 'suporte': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
      case 'pesquisa': return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30'
      case 'vendas': return 'from-orange-500/20 to-amber-500/20 border-orange-500/30'
      default: return 'from-gray-500/20 to-gray-500/20 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    )
  }

  const totalExecutions = orchestrations.reduce((sum, o) => sum + o._count.executions, 0)
  const activeOrchestrations = orchestrations.filter(o => o.status === 'active').length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Multi-Agent Orchestration</h1>
          <p className="text-white/60 mt-1">
            Configure múltiplos agentes para colaborar em tarefas complexas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Usar Template
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Orquestração
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Orquestrações</p>
                <p className="text-3xl font-bold text-white mt-2">{orchestrations.length}</p>
              </div>
              <GitBranch className="h-12 w-12 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Ativas</p>
                <p className="text-3xl font-bold text-white mt-2">{activeOrchestrations}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Execuções Totais</p>
                <p className="text-3xl font-bold text-white mt-2">{totalExecutions}</p>
              </div>
              <Play className="h-12 w-12 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State with Template Suggestions */}
      {orchestrations.length === 0 ? (
        <div className="space-y-6">
          <Card className="glass-card border-white/10 overflow-hidden">
            <CardContent className="py-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Comece com um Template</h2>
                <p className="text-white/60 max-w-md mx-auto">
                  Escolha um template pré-configurado e tenha sua primeira orquestração rodando em segundos
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleCreateFromTemplate(template.id)}
                    disabled={!!creatingFromTemplate}
                    className={`group relative p-5 rounded-xl bg-gradient-to-br ${getCategoryColor(template.category)} border text-left transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50`}
                  >
                    <div className="text-2xl mb-3">{template.icon}</div>
                    <h3 className="font-semibold text-white mb-1">{template.name}</h3>
                    <p className="text-white/50 text-sm mb-3 line-clamp-2">{template.description}</p>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Users className="w-3 h-3" />
                      <span>{template.agentCount} agentes</span>
                      <span>·</span>
                      <Clock className="w-3 h-3" />
                      <span>{template.estimatedDuration}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.agentRoles.map((role, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                          {role}
                        </span>
                      ))}
                    </div>
                    {creatingFromTemplate === template.id && (
                      <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                    <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                  </button>
                ))}
              </div>

              <div className="text-center mt-6">
                <Button variant="ghost" onClick={() => setCreateDialogOpen(true)} className="text-white/40 hover:text-white/60">
                  ou criar manualmente do zero
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orchestrations.map((orchestration) => (
            <Card key={orchestration.id} className="glass-card hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white mb-2">{orchestration.name}</CardTitle>
                    <CardDescription className="text-white/60">
                      {orchestration.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStrategyBadge(orchestration.strategy)}
                    {getLastExecutionBadge(orchestration)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-white/60">{orchestration.agents.length} agentes</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <span className="text-white/60">{orchestration._count.executions} execuções</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {orchestration.status === 'active' ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-white/60">
                    {orchestration.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="pt-4 border-t border-white/20 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/orchestrations/${orchestration.id}`)}
                  >
                    Ver Detalhes
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteOrchestration(orchestration.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Picker Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/20 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              Templates de Orquestração
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Escolha um template pré-configurado para começar rapidamente
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {templates.map(template => (
              <div
                key={template.id}
                className={`relative p-5 rounded-xl bg-gradient-to-br ${getCategoryColor(template.category)} border transition-all hover:scale-[1.02]`}
              >
                <div className="text-2xl mb-2">{template.icon}</div>
                <h3 className="font-semibold text-white mb-1">{template.name}</h3>
                <p className="text-white/50 text-sm mb-3">{template.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Users className="w-3 h-3" />
                    <span>{template.agentRoles.join(' → ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Clock className="w-3 h-3" />
                    <span>{template.estimatedDuration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Zap className="w-3 h-3" />
                    <span className="capitalize">{template.strategy}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 mb-4">
                  <p className="text-xs text-white/40 mb-1">Exemplo de entrada:</p>
                  <p className="text-xs text-white/60 italic">&ldquo;{template.exampleInput}&rdquo;</p>
                </div>

                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => handleCreateFromTemplate(template.id)}
                  disabled={!!creatingFromTemplate}
                >
                  {creatingFromTemplate === template.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Usar Template
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Creation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Orquestração Multi-Agent</DialogTitle>
            <DialogDescription className="text-white/60">
              Configure múltiplos agentes para trabalharem juntos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newOrchestration.name}
                onChange={(e) => setNewOrchestration({ ...newOrchestration, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Ex: Processamento de Dados Complexos"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newOrchestration.description}
                onChange={(e) => setNewOrchestration({ ...newOrchestration, description: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Descreva o objetivo desta orquestração..."
              />
            </div>

            <div>
              <Label htmlFor="strategy">Estratégia</Label>
              <Select
                value={newOrchestration.strategy}
                onValueChange={(value) => setNewOrchestration({ ...newOrchestration, strategy: value })}
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
                {getStrategyDescription(newOrchestration.strategy)}
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
                {newOrchestration.agentSteps.map((step, index) => (
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

                {newOrchestration.agentSteps.length === 0 && (
                  <div className="text-center py-6 text-white/40 text-sm">
                    Nenhum agente adicionado ainda
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrchestration}>
              Criar Orquestração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
