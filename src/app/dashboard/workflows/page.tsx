'use client'

// ─────────────────────────────────────────────────────────
// Workflows List Page — N8N-style flows dashboard
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Search, Play, Eye, Copy, Trash2, MoreVertical, Activity,
  TrendingUp, CheckCircle, Clock, Zap, Workflow as WorkflowIcon,
  Globe, Bot, Power, PowerOff, Filter, LayoutTemplate,
} from 'lucide-react'
import { FlowTemplateGallery } from '@/components/flows/flow-template-gallery'

interface Flow {
  id: string
  name: string
  description: string | null
  status: string
  triggerType: string
  tags: string[]
  icon: string | null
  color: string | null
  runCount: number
  successCount: number
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
  creator: { id: string; name: string; email: string }
  _count: { executions: number }
}

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  manual: <Play className="h-3.5 w-3.5" />,
  webhook: <Globe className="h-3.5 w-3.5" />,
  cron: <Clock className="h-3.5 w-3.5" />,
  event: <Zap className="h-3.5 w-3.5" />,
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual',
  webhook: 'Webhook',
  cron: 'Agendado',
  event: 'Evento',
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => { fetchFlows() }, [])

  const fetchFlows = async () => {
    try {
      const res = await fetch('/api/flows')
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setFlows(data || [])
    } catch (error: any) {
      console.error('Error fetching flows:', error)
      toast.error('Erro ao carregar workflows')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (flowId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const { error } = await res.json()
      if (error) throw new Error(error)
      setFlows(prev => prev.map(f => f.id === flowId ? { ...f, status: newStatus } : f))
      toast.success(newStatus === 'active' ? 'Workflow ativado' : 'Workflow desativado')
    } catch (error: any) {
      toast.error('Erro: ' + error.message)
    }
  }

  const handleRun = async (flowId: string) => {
    try {
      const res = await fetch(`/api/flows/${flowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerData: {} }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      if (data?.status === 'success') {
        toast.success(`Executado com sucesso (${data.duration}ms)`)
      } else if (data?.status === 'failed') {
        toast.error(`Falhou: ${data.error}`)
      } else {
        toast.info('Execução em andamento...')
      }
      fetchFlows()
    } catch (error: any) {
      toast.error('Erro ao executar: ' + error.message)
    }
  }

  const handleDuplicate = async (flowId: string) => {
    try {
      const res = await fetch(`/api/flows/${flowId}/duplicate`, {
        method: 'POST',
      })
      const { error } = await res.json()
      if (error) throw new Error(error)
      toast.success('Workflow duplicado!')
      fetchFlows()
    } catch (error: any) {
      toast.error('Erro ao duplicar: ' + error.message)
    }
  }

  const handleDelete = async (flowId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return
    try {
      const res = await fetch(`/api/flows/${flowId}`, { method: 'DELETE' })
      const { error } = await res.json()
      if (error) throw new Error(error)
      setFlows(prev => prev.filter(f => f.id !== flowId))
      toast.success('Workflow excluído')
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message)
    }
  }

  // Filter flows
  const filteredFlows = flows.filter(f => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return f.name.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q)
    }
    return true
  })

  // Stats
  const activeCount = flows.filter(f => f.status === 'active').length
  const totalExecutions = flows.reduce((s, f) => s + f.runCount, 0)
  const avgSuccess = flows.length > 0
    ? Math.round(flows.reduce((s, f) => s + (f.runCount > 0 ? (f.successCount / f.runCount) * 100 : 0), 0) / flows.length)
    : 0

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-9 w-48" /><Skeleton className="h-5 w-64 mt-2" /></div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Workflows</h1>
          <p className="text-white/60 mt-1">Automatize processos com o engine visual</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowTemplates(true)} variant="outline" className="gap-2 border-white/10 text-white/70 hover:text-white hover:bg-white/10">
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>
          <Button onClick={() => router.push('/dashboard/workflows/new')} className="gap-2 bg-white/10 hover:bg-white/20 text-white">
            <Plus className="h-4 w-4" />
            Novo Workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Workflows Ativos</p>
                <p className="text-3xl font-bold text-white mt-2">{activeCount}<span className="text-lg text-white/40">/{flows.length}</span></p>
              </div>
              <Activity className="h-10 w-10 text-blue-400/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Execuções Totais</p>
                <p className="text-3xl font-bold text-white mt-2">{totalExecutions}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-violet-400/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Taxa de Sucesso</p>
                <p className="text-3xl font-bold text-white mt-2">{avgSuccess}%</p>
              </div>
              <CheckCircle className="h-10 w-10 text-emerald-400/80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
          <Input
            placeholder="Buscar workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {['all', 'active', 'inactive', 'draft'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : s === 'inactive' ? 'Inativos' : 'Rascunho'}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filteredFlows.length === 0 && (
        <Card className="border-dashed border-white/20 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-white/5 p-6 border border-white/10">
              <WorkflowIcon className="h-12 w-12 text-white/20" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">
              {search ? 'Nenhum resultado encontrado' : 'Nenhum workflow criado'}
            </h3>
            <p className="mb-6 text-center text-white/50 max-w-md text-sm">
              {search ? 'Tente buscar com outros termos' : 'Crie seu primeiro workflow arrastando nós no canvas visual'}
            </p>
            {!search && (
              <Button onClick={() => router.push('/dashboard/workflows/new')} size="lg" className="bg-white/10 hover:bg-white/20 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Criar Workflow
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Flow cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredFlows.map((flow) => {
          const successRate = flow.runCount > 0 ? Math.round((flow.successCount / flow.runCount) * 100) : 0

          return (
            <Card
              key={flow.id}
              className="group bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-white/5 cursor-pointer"
              onClick={() => router.push(`/dashboard/workflows/${flow.id}`)}
            >
              <CardContent className="p-5">
                {/* Top row: name, status, trigger */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white truncate">{flow.name}</h3>
                      <Badge className={`text-[10px] px-1.5 py-0 ${flow.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        flow.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-white/10 text-white/40 border-white/10'
                        }`}>
                        {flow.status === 'active' ? 'Ativo' : flow.status === 'draft' ? 'Rascunho' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/40 truncate">{flow.description || 'Sem descrição'}</p>
                  </div>

                  {/* Actions (stop propagation to avoid navigating) */}
                  <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggle(flow.id, flow.status)}
                      className={`p-1.5 rounded-md hover:bg-white/10 ${flow.status === 'active' ? 'text-emerald-400' : 'text-white/30'}`}
                      title={flow.status === 'active' ? 'Desativar' : 'Ativar'}
                    >
                      {flow.status === 'active' ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleRun(flow.id)}
                      className="p-1.5 rounded-md hover:bg-white/10 text-blue-400"
                      title="Executar"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(flow.id)}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white/30 hover:text-white/60"
                      title="Duplicar"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(flow.id, flow.name)}
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-white/30 hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <div className="flex items-center gap-1.5">
                    {TRIGGER_ICONS[flow.triggerType] || <Zap className="h-3 w-3" />}
                    <span>{TRIGGER_LABELS[flow.triggerType] || flow.triggerType}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    <span>{flow.runCount} execuções</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>{successRate}% sucesso</span>
                  </div>
                  {flow.lastRunAt && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(flow.lastRunAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {flow.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {flow.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/40">
                        {tag}
                      </Badge>
                    ))}
                    {flow.tags.length > 3 && (
                      <span className="text-[10px] text-white/30">+{flow.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Template Gallery Modal */}
      {showTemplates && (
        <FlowTemplateGallery onClose={() => setShowTemplates(false)} />
      )}
    </div>
  )
}
