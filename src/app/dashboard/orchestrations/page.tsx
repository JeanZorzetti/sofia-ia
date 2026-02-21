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
  XCircle
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

export default function OrchestrationsPage() {
  const router = useRouter()
  const [orchestrations, setOrchestrations] = useState<Orchestration[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Carregando orquestrações...</div>
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
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Orquestração
        </Button>
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
                {getStrategyBadge(orchestration.strategy)}
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

        {orchestrations.length === 0 && (
          <Card className="glass-card col-span-full">
            <CardContent className="py-12 text-center">
              <GitBranch className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 mb-4">Nenhuma orquestração criada ainda</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Orquestração
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

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
