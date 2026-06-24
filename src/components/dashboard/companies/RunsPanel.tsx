'use client'

// 005-agentic-companies — aba Execuções: lista as CompanyRuns, dispara nova execução
// (modal de missão) e mostra a timeline fase-a-fase da execução selecionada.
import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Play, Clock } from 'lucide-react'
import { RunTimeline } from './RunTimeline'

interface RunRow { id: string; mission: string; status: string; createdAt: string }

const STATUS_CLS: Record<string, string> = {
  pending: 'border-white/20 text-white/50', running: 'border-blue-400/40 text-blue-200',
  completed: 'border-emerald-400/40 text-emerald-200', failed: 'border-red-400/40 text-red-300',
  blocked: 'border-amber-400/40 text-amber-200',
}

export function RunsPanel({ companyId }: { companyId: string }) {
  const [runs, setRuns] = useState<RunRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [mission, setMission] = useState('')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    const res = await fetch(`/api/companies/${companyId}/runs`)
    const data = await res.json()
    if (data.success) {
      setRuns(data.data || [])
      if (!selected && data.data?.[0]) setSelected(data.data[0].id)
    }
  }, [companyId, selected])

  useEffect(() => { fetchRuns() }, [fetchRuns])

  const handleStart = async () => {
    setStarting(true); setError(null)
    try {
      const res = await fetch(`/api/companies/${companyId}/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mission }),
      })
      const data = await res.json()
      if (data.success) {
        setOpen(false); setMission('')
        setSelected(data.data.companyRunId)
        await fetchRuns()
      } else {
        setError(data.error || 'Falha ao iniciar execução')
      }
    } catch {
      setError('Falha ao iniciar execução')
    } finally { setStarting(false) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <Button className="w-full" onClick={() => setOpen(true)}><Play className="mr-2 h-4 w-4" />Executar</Button>
        {runs.length === 0 ? (
          <p className="text-sm text-white/40">Nenhuma execução ainda.</p>
        ) : (
          <div className="space-y-2">
            {runs.map(r => (
              <Card
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`cursor-pointer border p-3 transition-colors ${selected === r.id ? 'border-blue-400/50 bg-blue-500/5' : 'border-white/10 bg-card hover:border-white/20'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-white/40"><Clock className="h-3 w-3" />{new Date(r.createdAt).toLocaleString('pt-BR')}</span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_CLS[r.status] ?? STATUS_CLS.pending}`}>{r.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-white/70 line-clamp-2">{r.mission}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        {selected ? <RunTimeline companyRunId={selected} /> : <p className="text-sm text-white/40">Selecione uma execução.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Executar empresa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mission">Missão / objetivo</Label>
              <Textarea id="mission" rows={3} value={mission} onChange={e => setMission(e.target.value)} placeholder="ex.: Construir um TODO app com API REST" />
            </div>
            <p className="text-[11px] text-white/40">A empresa percorrerá as 7 fases do SDLC sequencialmente, instanciando 1 Time por fase conforme a RACI.</p>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={starting}>Cancelar</Button>
            <Button onClick={handleStart} disabled={starting || !mission.trim()}>{starting ? 'Iniciando…' : 'Iniciar execução'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
