'use client'

// 005-agentic-companies — galeria de Empresas (ponto de entrada principal da seção, FR-006).
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Building2, Plus } from 'lucide-react'
import { CompanyCard, type CompanySummary } from './CompanyCard'

interface Niche { niche: string; label: string; roleCount: number }

export function CompaniesGallery() {
  const router = useRouter()
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [niche, setNiche] = useState('')
  const [typology, setTypology] = useState('hybrid')
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, nRes] = await Promise.all([fetch('/api/companies'), fetch('/api/companies/niches')])
      const [cData, nData] = await Promise.all([cRes.json(), nRes.json()])
      if (cData.success) setCompanies(cData.data || [])
      if (nData.success) {
        setNiches(nData.data || [])
        if (!niche && nData.data?.[0]) setNiche(nData.data[0].niche)
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [niche])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleCreate = async () => {
    setCreating(true); setError(null)
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, niche, typology }),
      })
      const data = await res.json()
      if (data.success) {
        setOpen(false); setName('')
        router.push(`/dashboard/agents/empresa/${data.data.id}`)
      } else {
        setError(data.error || 'Falha ao criar empresa')
      }
    } catch {
      setError('Falha ao criar empresa')
    } finally { setCreating(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Empresas</h2>
          <p className="text-sm text-white/50">Organize seus agentes em empresas agênticas com organograma, governança e processo.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova Empresa</Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i} className="bg-card border-white/10"><CardContent className="py-10"><Skeleton className="h-6 w-3/4" /></CardContent></Card>)}
        </div>
      ) : companies.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted/50 p-6"><Building2 className="h-12 w-12 text-muted-foreground" /></div>
            <h3 className="mb-2 text-2xl font-semibold text-white">Nenhuma empresa criada</h3>
            <p className="mb-6 text-center text-white/60 max-w-md">Crie uma empresa a partir de um nicho (ex.: Software House) e monte o organograma com seus agentes.</p>
            <Button onClick={() => setOpen(true)} size="lg"><Plus className="mr-2 h-4 w-4" />Criar Empresa</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(c => <CompanyCard key={c.id} company={c} onNavigate={(id) => router.push(`/dashboard/agents/empresa/${id}`)} />)}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Nome</Label>
              <Input id="company-name" value={name} onChange={e => setName(e.target.value)} placeholder="Minha Software House" />
            </div>
            <div className="space-y-1.5">
              <Label>Nicho</Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger><SelectValue placeholder="Selecione um nicho" /></SelectTrigger>
                <SelectContent>
                  {niches.map(n => <SelectItem key={n.niche} value={n.niche}>{n.label} ({n.roleCount} cargos)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipologia</Label>
              <Select value={typology} onValueChange={setTypology}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">Híbrida</SelectItem>
                  <SelectItem value="generalist">Generalista</SelectItem>
                  <SelectItem value="specialist">Especialista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim() || !niche}>{creating ? 'Criando…' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
