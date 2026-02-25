'use client'

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
import { Loader2, Wand2, BrainCircuit, ChevronRight, Sparkles } from 'lucide-react'

interface AISuggestion {
  name: string
  description: string
  strategy: string
  estimatedTime: string
  agents: { role: string; prompt: string }[]
  suggestedInput: string
  suggestedTags: string[]
}

interface AIGeneratorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aiDescription: string
  onDescriptionChange: (value: string) => void
  aiLoading: boolean
  aiCreating: boolean
  aiSuggestion: AISuggestion | null
  onGenerate: () => void
  onRegenerate: () => void
  onCreateFromAi: () => void
}

export function AIGeneratorDialog({
  open,
  onOpenChange,
  aiDescription,
  onDescriptionChange,
  aiLoading,
  aiCreating,
  aiSuggestion,
  onGenerate,
  onRegenerate,
  onCreateFromAi,
}: AIGeneratorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            Gerar Orquestração com IA
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Descreva o processo que você quer automatizar. A IA vai sugerir os agentes, prompts e
            estrutura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="ai-desc">Descreva seu processo</Label>
            <Textarea
              id="ai-desc"
              value={aiDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="bg-white/5 border-white/10 text-white mt-1.5 min-h-[100px]"
              placeholder="Ex: Quero um pipeline que receba um briefing de campanha de marketing, pesquise tendências do setor, escreva o copy para redes sociais e revise o tom antes de entregar."
              disabled={aiLoading || aiCreating}
            />
            <p className="text-xs text-white/40 mt-1">Quanto mais detalhado, melhor a sugestão.</p>
          </div>

          {!aiSuggestion && (
            <Button
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
              onClick={onGenerate}
              disabled={aiLoading || aiDescription.trim().length < 10}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando sugestão...
                </>
              ) : (
                <>
                  <BrainCircuit className="h-4 w-4" /> Gerar Sugestão
                </>
              )}
            </Button>
          )}

          {aiSuggestion && (
            <div className="space-y-4 border border-purple-500/30 rounded-xl p-4 bg-purple-500/5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-base">{aiSuggestion.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 capitalize">{aiSuggestion.strategy}</span>
                  <span className="text-xs text-white/30">·</span>
                  <span className="text-xs text-white/40">{aiSuggestion.estimatedTime}</span>
                </div>
              </div>
              <p className="text-sm text-white/60">{aiSuggestion.description}</p>

              <div>
                <p className="text-xs text-white/40 mb-2">
                  Agentes sugeridos ({aiSuggestion.agents.length}):
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {aiSuggestion.agents.map((a, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">
                        {a.role}
                      </span>
                      {i < aiSuggestion.agents.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-white/20" />
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {aiSuggestion.agents.map((a, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5">
                    <p className="text-xs font-medium text-white/80 mb-1">{a.role}</p>
                    <p className="text-xs text-white/50 line-clamp-2">{a.prompt}</p>
                  </div>
                ))}
              </div>

              {aiSuggestion.suggestedInput && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400/70 mb-1">Input de exemplo:</p>
                  <p className="text-xs text-white/60 italic">
                    &ldquo;{aiSuggestion.suggestedInput}&rdquo;
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={aiCreating}
                  className="gap-1"
                >
                  Regenerar
                </Button>
                <Button
                  className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                  onClick={onCreateFromAi}
                  disabled={aiCreating}
                >
                  {aiCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Criando agentes e
                      orquestração...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Criar Orquestração
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
