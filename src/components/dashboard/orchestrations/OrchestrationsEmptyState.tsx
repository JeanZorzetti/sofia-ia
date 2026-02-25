'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { TemplateCard } from './TemplateCard'

interface TemplateInfo {
  id: string
  name: string
  description: string
  category: string
  icon: string
  strategy: string
  agentCount: number
  agentRoles: string[]
  exampleInput: string
  expectedOutput: string
  estimatedDuration: string
  tags: string[]
}

interface OrchestrationsEmptyStateProps {
  templates: TemplateInfo[]
  creatingFromTemplate: string | null
  onCreateFromTemplate: (id: string) => void
  onManualCreate: () => void
}

export function OrchestrationsEmptyState({
  templates,
  creatingFromTemplate,
  onCreateFromTemplate,
  onManualCreate,
}: OrchestrationsEmptyStateProps) {
  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/10 overflow-hidden">
        <CardContent className="py-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Comece com um Template</h2>
            <p className="text-white/60 max-w-md mx-auto">
              Escolha um template pré-configurado e tenha sua primeira orquestração rodando em
              segundos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={onCreateFromTemplate}
                isCreating={creatingFromTemplate === template.id}
                showArrow
              />
            ))}
          </div>

          <div className="text-center mt-6">
            <Button
              variant="ghost"
              onClick={onManualCreate}
              className="text-white/40 hover:text-white/60"
            >
              ou criar manualmente do zero
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
