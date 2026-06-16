// src/app/dashboard/teams/TeamTemplatesDialog.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, LayoutTemplate, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

type TemplateRole = 'lead' | 'worker' | 'reviewer'

interface TemplateSummary {
  id: string
  name: string
  description: string
  category: string
  icon: string
  tags: string[]
  members: { role: TemplateRole; name: string }[]
}

interface TeamTemplatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_LABEL: Record<TemplateRole, string> = { lead: 'Lead', worker: 'Worker', reviewer: 'Reviewer' }
const ROLE_BADGE: Record<TemplateRole, string> = {
  lead: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  worker: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  reviewer: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
}

export function TeamTemplatesDialog({ open, onOpenChange }: TeamTemplatesDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [deployingId, setDeployingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/teams/templates')
      .then(r => r.json())
      .then(j => { if (j.success) setTemplates(j.data); else toast.error(j.error || 'Erro ao carregar templates.') })
      .catch(() => toast.error('Erro ao conectar com o servidor.'))
      .finally(() => setLoading(false))
  }, [open])

  async function deploy(id: string) {
    setDeployingId(id)
    try {
      const res = await fetch(`/api/teams/templates/${id}/deploy`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) { toast.error(json.error || 'Erro ao criar o time.'); return }
      toast.success('Time criado a partir do template!')
      onOpenChange(false)
      router.push(`/dashboard/teams/${json.data.teamId}`)
    } catch {
      toast.error('Erro ao conectar com o servidor.')
    } finally {
      setDeployingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
              <LayoutTemplate className="h-4 w-4 text-white" />
            </div>
            Templates de time
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Comece com um roster pronto. Escolha um template e abra a sala do time já montado.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-white/40 text-sm flex items-center gap-2 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando templates…
          </p>
        )}

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {templates.map(t => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <span className="text-xl leading-none">{t.icon}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-white">{t.name}</div>
                    <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{t.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {t.members.map((m, i) => (
                    <Badge key={i} className={`${ROLE_BADGE[m.role]} text-xs font-normal`}>
                      {ROLE_LABEL[m.role]} · {m.name}
                    </Badge>
                  ))}
                </div>
                <button
                  onClick={() => deploy(t.id)}
                  disabled={deployingId !== null}
                  className="mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {deployingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Usar template
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
