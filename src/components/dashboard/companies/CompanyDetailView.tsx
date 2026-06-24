'use client'

// 005-agentic-companies — view de detalhe da Empresa com abas ortogonais (FR-007).
// US1: Organograma. Abas Governança/SDLC (US2), Execuções (US3), Tipologia/Infra (US4)
// são adicionadas incrementalmente — cada uma é uma faceta, nunca nível aninhado.
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ArrowLeft, Building2, Copy } from 'lucide-react'
import { OrgChart } from './OrgChart'
import { RaciMatrix } from './RaciMatrix'
import { SdlcPipeline } from './SdlcPipeline'
import { SopEditor } from './SopEditor'
import { RunsPanel } from './RunsPanel'
import { TypologyControl } from './TypologyControl'
import { InfraPanel } from './InfraPanel'
import { nicheLabel } from './CompanyCard'
import type { CompanyDetail, AgentOption, RaciMatrix as RaciMatrixType } from './types'

const TYPOLOGY_LABEL: Record<string, string> = {
  generalist: 'Generalista', specialist: 'Especialista', hybrid: 'Híbrida',
}

export function CompanyDetailView({ companyId }: { companyId: string }) {
  const router = useRouter()
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [cloneName, setCloneName] = useState('')
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/companies/${companyId}`)
    const data = await res.json()
    if (data.success) setDetail(data.data)
    else setError(data.error || 'Empresa não encontrada')
  }, [companyId])

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/agents')
    const data = await res.json()
    if (data.success) setAgents((data.data || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })))
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchDetail(), fetchAgents()]).finally(() => setLoading(false))
  }, [fetchDetail, fetchAgents])

  const handleStaff = async (roleKey: string, agentId: string) => {
    setError(null)
    const res = await fetch(`/api/companies/${companyId}/roles/${roleKey}/staff`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId }),
    })
    const data = await res.json()
    if (!data.success) { setError(data.error || 'Falha ao encaixar agente'); return }
    await fetchDetail()
  }

  const handleUnstaff = async (roleKey: string) => {
    setError(null)
    const res = await fetch(`/api/companies/${companyId}/roles/${roleKey}/staff`, { method: 'DELETE' })
    const data = await res.json()
    if (!data.success) { setError(data.error || 'Falha ao desencaixar'); return }
    await fetchDetail()
  }

  const handleSaveRaci = async (raci: RaciMatrixType) => {
    const res = await fetch(`/api/companies/${companyId}/raci`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raci }),
    })
    const data = await res.json()
    if (data.success) await fetchDetail()
    return { ok: !!data.success, error: data.error }
  }

  const handleSaveSops = async (sops: Record<string, string>) => {
    const res = await fetch(`/api/companies/${companyId}/sops`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sops }),
    })
    const data = await res.json()
    if (data.success) await fetchDetail()
    return { ok: !!data.success, error: data.error }
  }

  const handleClone = async () => {
    setCloning(true); setCloneError(null)
    try {
      const res = await fetch(`/api/companies/${companyId}/clone`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: cloneName }),
      })
      const data = await res.json()
      if (data.success) {
        setCloneOpen(false); setCloneName('')
        router.push(`/dashboard/agents/empresa/${data.data.id}`)
      } else {
        setCloneError(data.error || 'Falha ao clonar')
      }
    } catch {
      setCloneError('Falha ao clonar')
    } finally { setCloning(false) }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <Button variant="ghost" onClick={() => router.push('/dashboard/agents')}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
        <p className="text-white/60">{error || 'Empresa não encontrada.'}</p>
      </div>
    )
  }

  const { company, roles, raci, sdlc } = detail

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.push('/dashboard/agents')} title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-white truncate">{company.name}</h1>
            <p className="text-xs text-white/50">{nicheLabel(company.niche)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary">{TYPOLOGY_LABEL[company.typology] ?? company.typology}</Badge>
          <Button variant="outline" size="sm" onClick={() => { setCloneName(`${company.name} (cópia)`); setCloneOpen(true) }}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />Clonar
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

      <Tabs defaultValue="orgchart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orgchart">Organograma</TabsTrigger>
          <TabsTrigger value="governance">Governança</TabsTrigger>
          <TabsTrigger value="sdlc">SDLC</TabsTrigger>
          <TabsTrigger value="runs">Execuções</TabsTrigger>
          <TabsTrigger value="typology">Tipologia</TabsTrigger>
          <TabsTrigger value="infra">Infraestrutura</TabsTrigger>
        </TabsList>
        <TabsContent value="orgchart">
          <OrgChart roles={roles} agents={agents} onStaff={handleStaff} onUnstaff={handleUnstaff} />
        </TabsContent>
        <TabsContent value="governance" className="space-y-8">
          <RaciMatrix roles={roles} phases={sdlc} initialRaci={raci} onSave={handleSaveRaci} />
          <div className="border-t border-white/10 pt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">SOPs por cargo</h3>
            <SopEditor roles={roles} initialSops={company.config?.sops ?? {}} onSave={handleSaveSops} />
          </div>
        </TabsContent>
        <TabsContent value="sdlc">
          <SdlcPipeline phases={sdlc} raci={raci} roles={roles} />
        </TabsContent>
        <TabsContent value="runs">
          <RunsPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="typology">
          <TypologyControl companyId={companyId} current={company.typology} onChange={fetchDetail} />
        </TabsContent>
        <TabsContent value="infra">
          <InfraPanel companyId={companyId} roles={roles} />
        </TabsContent>
      </Tabs>

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clonar empresa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-white/50">Reproduz o organograma e a RACI numa nova empresa. Os cargos nascem vagos (agentes não migram — encaixe 1:1).</p>
            <div className="space-y-1.5">
              <Label htmlFor="clone-name">Nome da nova empresa</Label>
              <Input id="clone-name" value={cloneName} onChange={e => setCloneName(e.target.value)} />
            </div>
            {cloneError && <p className="text-sm text-red-400">{cloneError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)} disabled={cloning}>Cancelar</Button>
            <Button onClick={handleClone} disabled={cloning || !cloneName.trim()}>{cloning ? 'Clonando…' : 'Clonar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
