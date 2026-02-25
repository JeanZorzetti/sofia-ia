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
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface GeneratedAgent {
  id?: string
  name: string
  role: string
  systemPrompt: string
  model: string
}

interface GeneratedOrchestration {
  id: string
  name: string
  description: string
  agents: GeneratedAgent[]
  connections: Array<{ from: number; to: number; label: string }>
}

interface MagicCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (orchestrationId: string) => void
}

const LOADING_MESSAGES = [
  'Analisando seu processo...',
  'Identificando etapas e responsabilidades...',
  'Criando agentes especializados...',
  'Configurando system prompts...',
  'Definindo conexoes entre agentes...',
  'Finalizando orquestracao...',
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
  const [result, setResult] = useState<GeneratedOrchestration | null>(null)

  async function handleGenerate() {
    if (description.trim().length < 10) {
      toast.error('Descreva o processo com pelo menos 10 caracteres.')
      return
    }

    setLoading(true)
    setResult(null)
    setLoadingMessageIndex(0)

    // Anima as mensagens de loading
    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => {
        if (prev < LOADING_MESSAGES.length - 1) return prev + 1
        return prev
      })
    }, 1200)

    try {
      const response = await fetch('/api/orchestrations/magic-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })

      clearInterval(interval)

      const data = await response.json()

      if (data.success) {
        setResult(data.data.orchestration)
        toast.success('Orquestracao gerada com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao gerar orquestracao.')
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
    router.push(`/dashboard/orchestrations/${result.id}`)
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
            Magic Create — Orquestracao com IA
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Descreva o processo que voce quer automatizar. A IA vai criar todos os agentes,
            system prompts e conexoes automaticamente.
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
                  placeholder="Ex: Quero um workflow que pesquisa leads no LinkedIn, qualifica com IA e envia email personalizado"
                  disabled={loading}
                />
                <p className="text-xs text-white/40 mt-1">
                  Quanto mais detalhado, melhor a orquestracao gerada.
                </p>
              </div>

              {/* Exemplos de prompt */}
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

              {/* Loading state */}
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
                    Gerar Orquestracao com IA
                  </>
                )}
              </Button>
            </>
          ) : (
            /* Preview do resultado */
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                <p className="text-sm text-green-300">
                  Orquestracao criada e salva automaticamente!
                </p>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                <div>
                  <h3 className="font-semibold text-white text-base">{result.name}</h3>
                  {result.description && (
                    <p className="text-sm text-white/60 mt-1">{result.description}</p>
                  )}
                </div>

                {/* Agentes */}
                <div>
                  <p className="text-xs text-white/40 mb-2">
                    {result.agents.length} agente{result.agents.length !== 1 ? 's' : ''} criados:
                  </p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {result.agents.map((agent, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/20 text-xs font-normal">
                          {agent.name || agent.role}
                        </Badge>
                        {i < result.agents.length - 1 && (
                          <ChevronRight className="w-3 h-3 text-white/20" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* System prompts preview */}
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {result.agents.map((agent, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs font-medium text-white/80 mb-1">
                        {agent.name || agent.role}
                      </p>
                      <p className="text-xs text-white/50 line-clamp-2">
                        {agent.systemPrompt}
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
                  Abrir Orquestracao
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
