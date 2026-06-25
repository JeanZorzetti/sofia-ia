'use client'

// 009-usecase-squads — Botão "Rodar" que abre um dialog de missão e chama
// POST /api/companies/[id]/squads/[squadId]/run.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Play, Loader2 } from 'lucide-react'

interface Props {
  companyId: string
  squadId: string
  squadName: string
  onRunStarted?: (runId: string, queued: boolean, position: number) => void
}

export function SquadRunButton({ companyId, squadId, squadName, onRunStarted }: Props) {
  const [open, setOpen] = useState(false)
  const [mission, setMission] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    if (!mission.trim()) { setError('Informe a missão'); return }
    setRunning(true); setError(null)
    try {
      const res = await fetch(`/api/companies/${companyId}/squads/${squadId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission: mission.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setOpen(false); setMission('')
        onRunStarted?.(data.data.runId, data.data.queued, data.data.position)
      } else {
        setError(data.error || 'Falha ao disparar o squad')
      }
    } catch {
      setError('Erro de rede')
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <Button size="sm" className="w-full gap-1.5" onClick={() => setOpen(true)}>
        <Play className="h-3.5 w-3.5" />
        Rodar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rodar squad — {squadName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mission">Missão</Label>
              <Textarea
                id="mission"
                placeholder="Descreva o que este squad deve executar..."
                value={mission}
                onChange={e => setMission(e.target.value)}
                rows={4}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>Cancelar</Button>
            <Button onClick={handleRun} disabled={running} className="gap-1.5">
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {running ? 'Disparando…' : 'Disparar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
