'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Play,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Activity
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
  updatedAt: string
  creator: {
    id: string
    name: string
    email: string
  }
}

interface WorkflowExecution {
  id: string
  workflowId: string
  status: string
  input: any
  output: any
  error: string | null
  duration: number | null
  startedAt: string
  completedAt: string | null
  createdAt: string
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    fetchWorkflow()
    fetchExecutions()
  }, [resolvedParams.id])

  const fetchWorkflow = async () => {
    try {
      const response = await fetch(`/api/workflows/${resolvedParams.id}`)
      const data = await response.json()
      if (data.success) {
        setWorkflow(data.data)
      }
    } catch (error) {
      console.error('Error fetching workflow:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExecutions = async () => {
    try {
      const response = await fetch(`/api/workflows/${resolvedParams.id}/executions?limit=20`)
      const data = await response.json()
      if (data.success) {
        setExecutions(data.data)
      }
    } catch (error) {
      console.error('Error fetching executions:', error)
    }
  }

  const handleToggle = async () => {
    if (!workflow) return
    const newStatus = workflow.status === 'active' ? 'inactive' : 'active'

    try {
      const response = await fetch(`/api/workflows/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setWorkflow({ ...workflow, status: newStatus })
      }
    } catch (error) {
      console.error('Error toggling workflow:', error)
    }
  }

  const handleRun = async () => {
    try {
      const response = await fetch(`/api/workflows/${resolvedParams.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ context: {} })
      })

      if (response.ok) {
        alert('Workflow executado com sucesso!')
        fetchWorkflow()
        fetchExecutions()
      } else {
        const data = await response.json()
        alert(`Erro ao executar workflow: ${data.error}`)
      }
    } catch (error) {
      console.error('Error running workflow:', error)
      alert('Erro ao executar workflow')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este workflow?')) return

    try {
      const response = await fetch(`/api/workflows/${resolvedParams.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/dashboard/workflows')
      }
    } catch (error) {
      console.error('Error deleting workflow:', error)
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

  const formatDuration = (duration: number | null) => {
    if (!duration) return '-'
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(2)}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Carregando workflow...</div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Workflow não encontrado</div>
      </div>
    )
  }

  const successRate = workflow.runCount > 0
    ? Math.round((workflow.successCount / workflow.runCount) * 100)
    : 0

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/dashboard/workflows')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{workflow.name}</h1>
            <p className="text-white/60 mt-1">{workflow.description || 'Sem descrição'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={workflow.status === 'active'}
            onCheckedChange={handleToggle}
          />
          <span className="text-white/60 text-sm">
            {workflow.status === 'active' ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Status</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {workflow.status === 'active' ? 'Ativo' : 'Inativo'}
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
                <p className="text-sm text-white/60">Execuções</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {workflow.runCount}
                </p>
              </div>
              <Play className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {successRate}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Última Execução</p>
                <p className="text-sm font-medium text-white mt-2">
                  {workflow.lastRun ? formatDate(workflow.lastRun) : 'Nunca'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Configuração</CardTitle>
            <CardDescription className="text-white/60">
              Detalhes do workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-white/60 mb-2">Trigger</p>
              <pre className="text-sm text-white font-mono overflow-x-auto">
                {JSON.stringify(workflow.trigger, null, 2)}
              </pre>
            </div>

            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-white/60 mb-2">Condições</p>
              <pre className="text-sm text-white font-mono overflow-x-auto">
                {JSON.stringify(workflow.conditions, null, 2)}
              </pre>
            </div>

            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-white/60 mb-2">Ações</p>
              <pre className="text-sm text-white font-mono overflow-x-auto">
                {JSON.stringify(workflow.actions, null, 2)}
              </pre>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleRun} className="flex-1">
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
              Últimas {executions.length} execuções
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {executions.length === 0 ? (
                <p className="text-white/60 text-center py-8">
                  Nenhuma execução ainda
                </p>
              ) : (
                executions.map((execution) => (
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
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Duração</span>
                      <span className="text-white font-medium">
                        {formatDuration(execution.duration)}
                      </span>
                    </div>
                    {execution.error && (
                      <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">{execution.error}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Metadados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-white/60">Criado por</p>
              <p className="text-white mt-1">{workflow.creator.name}</p>
              <p className="text-xs text-white/40">{workflow.creator.email}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-white/60">Criado em</p>
              <p className="text-white mt-1">{formatDate(workflow.createdAt)}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-white/60">Última atualização</p>
              <p className="text-white mt-1">{formatDate(workflow.updatedAt)}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-white/60">ID do Workflow</p>
              <p className="text-xs text-white/60 mt-1 font-mono">{workflow.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
