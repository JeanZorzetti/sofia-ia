'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  orchestrationId: string
  onSuccess?: () => void
}

const PRESETS = [
  { label: 'Diário 8h', cron: '0 8 * * *' },
  { label: 'Semanal Seg', cron: '0 8 * * 1' },
  { label: 'Mensal dia 1', cron: '0 8 1 * *' },
]

export function ScheduleDialog({ open, onOpenChange, orchestrationId, onSuccess }: ScheduleDialogProps) {
  const [cronExpr, setCronExpr] = useState('0 8 * * *')
  const [label, setLabel] = useState('')
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!cronExpr.trim()) return
    try {
      setSaving(true)
      const res = await fetch('/api/dashboard/scheduled-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orchestrationId,
          cronExpr,
          label: label.trim() || null,
          inputTemplate: input.trim() ? JSON.stringify({ text: input.trim() }) : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Agendamento criado com sucesso!')
        onOpenChange(false)
        setLabel('')
        setInput('')
        setCronExpr('0 8 * * *')
        onSuccess?.()
      } else {
        toast.error(data.error || 'Erro ao criar agendamento')
      }
    } catch {
      toast.error('Erro ao criar agendamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-400" />
            Agendar Execução
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Configure quando esta orquestração deve rodar automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {/* Presets */}
          <div>
            <Label className="text-white/80 text-sm mb-2 block">Frequência</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.cron}
                  type="button"
                  onClick={() => setCronExpr(preset.cron)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    cronExpr === preset.cron
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom cron */}
          <div>
            <Label htmlFor="sched-cron" className="text-white/80 text-sm">Expressão Cron</Label>
            <Input
              id="sched-cron"
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              className="bg-white/5 border-white/10 text-white font-mono text-sm mt-1"
              placeholder="0 8 * * *"
            />
            <p className="text-xs text-white/30 mt-1">
              Formato: minuto hora dia-mês mês dia-semana (ex:{' '}
              <code className="text-purple-300">0 8 * * 1</code> = segundas às 8h)
            </p>
          </div>

          {/* Label */}
          <div>
            <Label htmlFor="sched-label" className="text-white/80 text-sm">Rótulo (opcional)</Label>
            <Input
              id="sched-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Ex: Relatório diário de vendas"
            />
          </div>

          {/* Input template */}
          <div>
            <Label htmlFor="sched-input" className="text-white/80 text-sm">Input padrão (opcional)</Label>
            <Input
              id="sched-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Texto de entrada que será passado à orquestração"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !cronExpr.trim()}
            className="gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            {saving ? 'Agendando...' : 'Criar Agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
