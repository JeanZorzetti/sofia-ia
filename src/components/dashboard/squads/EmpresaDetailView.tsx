'use client'

// 009-usecase-squads — Detalhe da empresa na rota /dashboard/empresas/[id].
// Primário: galeria de squads por case de uso (cards com "Rodar" + composer).
// Secundário: acesso ao CompanyDetailView legado (organograma/SDLC/execuções).
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, Building2, Layers, Play, Wand2 } from 'lucide-react'
import { SquadCard, type SquadCardData } from './SquadCard'
import { SquadComposer, type AgentOption } from './SquadComposer'
import { QueuePanel } from './QueuePanel'
import { CompanyDetailView } from '@/components/dashboard/companies/CompanyDetailView'

interface Props { companyId: string }

export function EmpresaDetailView({ companyId }: Props) {
  const router = useRouter()
  const [squads, setSquads] = useState<SquadCardData[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [companyName, setCompanyName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ created: number; skipped: number } | null>(null)
  const [lastRunInfo, setLastRunInfo] = useState<{ runId: string; queued: boolean; position: number } | null>(null)

  const fetchSquads = useCallback(async () => {
    const res = await fetch(`/api/companies/${companyId}/squads`)
    const data = await res.json()
    if (data.success) setSquads(data.data.squads ?? [])
  }, [companyId])

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/agents')
    const data = await res.json()
    if (data.success) setAgents((data.data || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })))
  }, [])

  const fetchCompanyName = useCallback(async () => {
    const res = await fetch(`/api/companies/${companyId}`)
    const data = await res.json()
    if (data.success) setCompanyName(data.data?.name ?? '')
  }, [companyId])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchSquads(), fetchAgents(), fetchCompanyName()]).finally(() => setLoading(false))
  }, [fetchSquads, fetchAgents, fetchCompanyName])

  const handleSeed = async () => {
    setSeeding(true); setSeedResult(null)
    try {
      const res = await fetch(`/api/companies/${companyId}/squads/seed`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSeedResult(data.data)
        await fetchSquads()
      }
    } catch { /* silent */ } finally { setSeeding(false) }
  }

  const handleRunStarted = (runId: string, queued: boolean, position: number) => {
    setLastRunInfo({ runId, queued, position })
    fetchSquads()
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/empresas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">{companyName || companyId}</h1>
        </div>
      </div>

      {lastRunInfo && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-2 ${lastRunInfo.queued ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700' : 'bg-green-500/10 border-green-500/30 text-green-700'}`}>
          <Play className="h-3.5 w-3.5" />
          {lastRunInfo.queued
            ? `Run enfileirado (posição ${lastRunInfo.position + 1} na fila). Run ID: ${lastRunInfo.runId}`
            : `Squad disparado! Run ID: ${lastRunInfo.runId}`}
          <Button variant="ghost" size="icon" className="ml-auto h-5 w-5" onClick={() => setLastRunInfo(null)}>×</Button>
        </div>
      )}

      <Tabs defaultValue="squads" className="space-y-6">
        <TabsList>
          <TabsTrigger value="squads" className="gap-1.5"><Play className="h-3.5 w-3.5" />Squads</TabsTrigger>
          <TabsTrigger value="fila" className="gap-1.5"><Layers className="h-3.5 w-3.5" />Fila</TabsTrigger>
          <TabsTrigger value="organizacao" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Organização</TabsTrigger>
        </TabsList>

        <TabsContent value="squads">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Cases de uso</h2>
                {squads.length > 0 && (
                  <Badge variant="secondary" className="mt-1">{squads.length} squad{squads.length > 1 ? 's' : ''}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  {seeding ? 'Gerando…' : 'Gerar do nicho'}
                </Button>
                <SquadComposer companyId={companyId} agents={agents} onCreated={fetchSquads} />
              </div>
            </div>

            {seedResult && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm flex items-center gap-2 text-blue-700">
                <Wand2 className="h-3.5 w-3.5" />
                {seedResult.created > 0
                  ? `${seedResult.created} squad${seedResult.created > 1 ? 's' : ''} gerado${seedResult.created > 1 ? 's' : ''} a partir do nicho`
                  : 'Todos os squads do nicho já existem'}
                {seedResult.skipped > 0 && <span className="text-blue-500 text-xs">· {seedResult.skipped} pulados</span>}
                <Button variant="ghost" size="icon" className="ml-auto h-5 w-5" onClick={() => setSeedResult(null)}>×</Button>
              </div>
            )}

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : squads.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground space-y-2">
                <Layers className="h-8 w-8 mx-auto" />
                <p className="font-medium">Nenhum squad criado</p>
                <p className="text-xs">Crie squads por case de uso (Feature, Hotfix, Auditoria…) para executar tarefas com ≤4 agentes.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {squads.map(s => (
                  <SquadCard
                    key={s.id}
                    companyId={companyId}
                    squad={s}
                    onRunStarted={handleRunStarted}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fila">
          <QueuePanel companyId={companyId} />
        </TabsContent>

        <TabsContent value="organizacao">
          <CompanyDetailView companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
