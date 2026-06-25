'use client'

// 009-usecase-squads — Composer para criar um squad escolhendo agentes do pool
// e atribuindo papéis (lead/worker/reviewer).
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2 } from 'lucide-react'

export interface AgentOption { id: string; name: string }

interface MemberDraft { agentId: string; role: 'lead' | 'worker' | 'reviewer' }

interface Props {
  companyId: string
  agents: AgentOption[]
  onCreated: () => void
}

const ROLES = ['lead', 'worker', 'reviewer'] as const

export function SquadComposer({ companyId, agents, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [useCase, setUseCase] = useState('')
  const [members, setMembers] = useState<MemberDraft[]>([{ agentId: '', role: 'lead' }])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addMember = () => setMembers(prev => [...prev, { agentId: '', role: 'worker' }])
  const removeMember = (i: number) => setMembers(prev => prev.filter((_, idx) => idx !== i))
  const updateMember = (i: number, patch: Partial<MemberDraft>) =>
    setMembers(prev => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))

  const handleCreate = async () => {
    setError(null)
    if (!name.trim()) { setError('Informe o nome do squad'); return }
    if (!useCase.trim()) { setError('Informe o use case'); return }
    const invalid = members.some(m => !m.agentId)
    if (invalid) { setError('Selecione um agente para cada membro'); return }
    const leads = members.filter(m => m.role === 'lead')
    if (leads.length !== 1) { setError('O squad deve ter exatamente 1 lead'); return }

    setCreating(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/squads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), useCase: useCase.trim(), members }),
      })
      const data = await res.json()
      if (data.success) {
        setOpen(false); setName(''); setUseCase(''); setMembers([{ agentId: '', role: 'lead' }])
        onCreated()
      } else {
        setError(data.error || 'Falha ao criar squad')
      }
    } catch {
      setError('Erro de rede')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Novo squad
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar squad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="squad-name">Nome do squad</Label>
              <Input id="squad-name" placeholder="Ex.: Feature Squad" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="use-case">Use case (quando usar)</Label>
              <Input id="use-case" placeholder="Ex.: Implementar nova feature ponta-a-ponta" value={useCase} onChange={e => setUseCase(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Membros</Label>
                <Button variant="ghost" size="sm" onClick={addMember} className="gap-1 h-7 px-2">
                  <Plus className="h-3 w-3" />Adicionar
                </Button>
              </div>
              {members.map((m, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select value={m.agentId} onValueChange={v => updateMember(i, { agentId: v })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar agente…" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={m.role} onValueChange={v => updateMember(i, { role: v as MemberDraft['role'] })}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {members.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeMember(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Recomendado: ≤4 membros (1 lead + workers + reviewer).{' '}
                <Badge variant="secondary" className="text-xs">SC-001</Badge>
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {creating ? 'Criando…' : 'Criar squad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
