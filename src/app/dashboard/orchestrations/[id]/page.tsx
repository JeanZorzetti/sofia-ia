'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Play,
  Trash2,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface Orchestration {
  id: string
  name: string
  description: string | null
  agents: any[]
  strategy: string
  config: any
  status: string
  createdAt: string
  executions: any[]
}

export default function OrchestrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [orchestration, setOrchestration] = useState<Orchestration | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [executeDialogOpen, setExecuteDialogOpen] = useState<boolean>(false)
  const [executionInput, setExecutionInput] = useState<string>('')
  const [executing, setExecuting] = useState<boolean>(false)

  useEffect(() => {
    fetchOrchestration()
  }, [resolvedParams.id])

  const fetchOrchestration = async () => {
    try {
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}`)
      const data = await response.json()
      if (data.success) {
        setOrchestration(data.data)
      }
    } catch (error) {
      console.error('Error fetching orchestration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    if (!orchestration) return
    const newStatus = orchestration.status === 'active' ? 'inactive' : 'active'

    try {
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setOrchestration({ ...orchestration, status: newStatus })
        toast.success(`Orquestração ${newStatus === 'active' ? 'ativada' : 'desativada'}`)
      }
    } catch (error) {
      console.error('Error toggling orchestration:', error)
      toast.error('Erro ao alterar status')
    }
  }

  const handleExecute = async () => {
    if (!executionInput.trim()) {
      toast.error('Digite uma entrada para execução')
      return
    }

    setExecuting(true)
    try {
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: executionInput
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Orquestração executada com sucesso!')
        setExecuteDialogOpen(false)
        setExecutionInput('')
        fetchOrchestration()

        // Show results in a new dialog or alert
        const output = typeof data.data.output === 'string'
          ? data.data.output
          : JSON.stringify(data.data.output, null, 2)

        alert(`Resultado:\n\n${output}`)
      } else {
        toast.error(data.error || 'Erro ao executar orquestração')
      }
    } catch (error) {
      console.error('Error executing orchestration:', error)
      toast.error('Erro ao executar orquestração')
    } finally {
      setExecuting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta orquestração?')) return

    try {
      const response = await fetch(`/api/orchestrations/${resolvedParams.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Orquestração excluída')
        router.push('/dashboard/orchestrations')
      }
    } catch (error) {
      console.error('Error deleting orchestration:', error)
      toast.error('Erro ao excluir orquestração')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Sucesso</Badge>
      case 'failed':
        return <Badge className="bg-red-500 text-white">Falha</Badge>
      case 'running':
        return <Badge className="bg-blue-500 text-white">Executando</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">Pendente</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR')
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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/dashboard/orchestrations')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{orchestration.name}</h1>
            <p className="text-white/60 mt-1">
              {orchestration.description || 'Sem descrição'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={orchestration.status === 'active'}
            onCheckedChange={handleToggle}
          />
          <span className="text-white/60 text-sm">
            {orchestration.status === 'active' ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Estratégia</p>
                <p className="text-2xl font-bold text-white mt-2 capitalize">
                  {orchestration.strategy}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Agentes</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {orchestration.agents.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Execuções</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {orchestration.executions.length}
                </p>
              </div>
              <Play className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Status</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {orchestration.status === 'active' ? 'Ativo' : 'Inativo'}
                </p>
              </div>
              {orchestration.status === 'active' ? (
                <CheckCircle className="h-8 w-8 text-green-400" />
              ) : (
                <XCircle className="h-8 w-8 text-gray-400" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Configuração</CardTitle>
            <CardDescription className="text-white/60">
              Agentes e fluxo de execução
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-white/60 mb-3">Agentes na Sequência</p>
              <div className="space-y-2">
                {orchestration.agents.map((agent: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                  >
                    <span className="text-white/40 text-sm">#{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-white font-medium">{agent.role}</p>
                      <p className="text-xs text-white/40">ID: {agent.agentId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setExecuteDialogOpen(true)} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Executar Agora
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Histórico de Execuções</CardTitle>
            <CardDescription className="text-white/60">
              Últimas {orchestration.executions.length} execuções
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {orchestration.executions.length === 0 ? (
                <p className="text-white/60 text-center py-8">
                  Nenhuma execução ainda
                </p>
              ) : (
                orchestration.executions.map((execution: any) => (
                  <div
                    key={execution.id}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      {getStatusBadge(execution.status)}
                      <span className="text-xs text-white/60">
                        {formatDate(execution.startedAt)}
                      </span>
                    </div>
                    {execution.error && (
                      <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">{execution.error}</p>
                      </div>
                    )}
                    {execution.output && (
                      <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-green-400 font-mono">
                          {typeof execution.output === 'string'
                            ? execution.output.substring(0, 100) + '...'
                            : JSON.stringify(execution.output).substring(0, 100) + '...'}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
              placeholder="Ex: Analisar lead com telefone +5511999999999, interessado em apartamento de 2 quartos"
            />
            <p className="text-xs text-white/40">
              Esta entrada será processada pelos {orchestration.agents.length} agentes
              usando a estratégia <strong>{orchestration.strategy}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExecute} disabled={executing}>
              {executing ? 'Executando...' : 'Executar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
