'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Loader2,
  Wand2,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

type MemberRole = 'lead' | 'worker' | 'reviewer'

interface GeneratedMember {
  role: MemberRole
  name: string
  systemPrompt: string
  model: string
}

interface GeneratedTeam {
  id: string
  name: string
  description: string
  members: GeneratedMember[]
}

interface MagicCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (teamId: string) => void
}

const ROLE_LABEL: Record<MemberRole, string> = {
  lead: 'Lead',
  worker: 'Worker',
  reviewer: 'Reviewer',
}

const ROLE_BADGE: Record<MemberRole, string> = {
  lead: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  worker: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  reviewer: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
}

const LOADING_MESSAGES = [
  'Analisando seu processo...',
  'Identificando etapas e responsabilidades...',
  'Montando o time (Lead, Workers, Reviewer)...',
  'Escrevendo system prompts...',
  'Definindo papéis e coordenação...',
  'Finalizando o time...',
]

const EXAMPLES = [
  'Pesquisar leads no LinkedIn, qualificar com IA e enviar email personalizado automaticamente',
  'Receber um briefing de marketing, pesquisar tendencias, escrever copy e revisar o tom',
  'Analisar documentos juridicos, identificar clausulas criticas e gerar resumo executivo',
  'Monitorar mencoes a marca, classificar sentimento e criar relatorio de reputacao',
]

export function MagicCreateModal({ open, onOpenChange, onCreated }: MagicCreateModalProps) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [result, setResult] = useState<GeneratedTeam | null>(null)

  async function handleGenerate() {
    if (description.trim().length < 10) {
      toast.error('Descreva o processo com pelo menos 10 caracteres.')
      return
    }

    setLoading(true)
    setResult(null)
    setLoadingMessageIndex(0)

    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => {
        if (prev < LOADING_MESSAGES.length - 1) return prev + 1
        return prev
      })
    }, 1200)

    try {
      const response = await fetch('/api/teams/magic-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })

      clearInterval(interval)
      const data = await response.json()

      if (data.success) {
        setResult(data.data.team)
        toast.success('Time gerado com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao gerar o time.')
      }
    } catch {
      clearInterval(interval)
      toast.error('Erro ao conectar com o servidor.')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  function handleOpen() {
    if (!result) return
    onOpenChange(false)
    if (onCreated) onCreated(result.id)
    router.push(`/dashboard/teams/${result.id}`)
  }

  function handleReset() {
    setResult(null)
    setDescription('')
  }

  function handleClose() {
    if (!loading) {
      onOpenChange(false)
      setTimeout(() => {
        setResult(null)
        setDescription('')
      }, 300)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            Magic Create — Time com IA
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Descreva o processo que voce quer automatizar. A IA vai montar o time inteiro —
            um Lead que coordena, os Workers que executam e (se fizer sentido) um Reviewer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!result ? (
            <>
              <div>
                <Label htmlFor="magic-desc" className="text-white/80">
                  Descreva seu processo
                </Label>
                <Textarea
                  id="magic-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-2 min-h-[110px] resize-none"
                  placeholder="Ex: Quero um time que pesquisa leads no LinkedIn, qualifica com IA e envia email personalizado"
                  disabled={loading}
                />
                <p className="text-xs text-white/40 mt-1">
                  Quanto mais detalhado, melhor o time gerado.
                </p>
              </div>

              {!loading && description.length === 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Exemplos rapidos:</p>
                  <div className="space-y-2">
                    {EXAMPLES.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setDescription(ex)}
                        className="w-full text-left text-xs p-2.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10 transition-colors"
                      >
                        &ldquo;{ex}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Loader2 className="h-5 w-5 text-purple-400 animate-spin shrink-0" />
                  <p className="text-sm text-purple-300 animate-pulse">
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </p>
                </div>
              )}

              <Button
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 h-11"
                onClick={handleGenerate}
                disabled={loading || description.trim().length < 10}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Time com IA
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                <p className="text-sm text-green-300">
                  Time criado e salvo automaticamente!
                </p>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                <div>
                  <h3 className="font-semibold text-white text-base">{result.name}</h3>
                  {result.description && (
                    <p className="text-sm text-white/60 mt-1">{result.description}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-white/40 mb-2">
                    {result.members.length} membro{result.members.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {result.members.map((member, i) => (
                      <Badge key={i} className={`${ROLE_BADGE[member.role]} text-xs font-normal`}>
                        {ROLE_LABEL[member.role]} · {member.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {result.members.map((member, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs font-medium text-white/80 mb-1">
                        {ROLE_LABEL[member.role]} · {member.name}
                      </p>
                      <p className="text-xs text-white/50 line-clamp-2">
                        {member.systemPrompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1"
                >
                  Tentar outro
                </Button>
                <Button
                  className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                  onClick={handleOpen}
                >
                  <ArrowRight className="h-4 w-4" />
                  Abrir Time
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
