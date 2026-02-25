'use client'

import { Button } from '@/components/ui/button'
import { Users, Clock, Zap, Plus, Loader2, ArrowRight } from 'lucide-react'

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

function getCategoryColor(category: string) {
  switch (category) {
    case 'marketing':
      return 'from-pink-500/20 to-purple-500/20 border-pink-500/30'
    case 'suporte':
      return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
    case 'pesquisa':
      return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30'
    case 'vendas':
      return 'from-orange-500/20 to-amber-500/20 border-orange-500/30'
    default:
      return 'from-gray-500/20 to-gray-500/20 border-gray-500/30'
  }
}

interface TemplateCardProps {
  template: TemplateInfo
  onSelect: (id: string) => void
  isCreating: boolean
  /** Show extra details (example input, agent flow) — used in the picker dialog */
  detailed?: boolean
  /** Show the hover arrow indicator — used in the empty-state grid */
  showArrow?: boolean
}

export function TemplateCard({
  template,
  onSelect,
  isCreating,
  detailed = false,
  showArrow = false,
}: TemplateCardProps) {
  const colorClass = getCategoryColor(template.category)

  if (detailed) {
    return (
      <div
        className={`relative p-5 rounded-xl bg-gradient-to-br ${colorClass} border transition-all hover:scale-[1.02]`}
      >
        <div className="text-2xl mb-2">{template.icon}</div>
        <h3 className="font-semibold text-white mb-1">{template.name}</h3>
        <p className="text-white/50 text-sm mb-3">{template.description}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Users className="w-3 h-3" />
            <span>{template.agentRoles.join(' → ')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Clock className="w-3 h-3" />
            <span>{template.estimatedDuration}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Zap className="w-3 h-3" />
            <span className="capitalize">{template.strategy}</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-white/5 mb-4">
          <p className="text-xs text-white/40 mb-1">Exemplo de entrada:</p>
          <p className="text-xs text-white/60 italic">&ldquo;{template.exampleInput}&rdquo;</p>
        </div>

        <Button
          size="sm"
          className="w-full gap-2"
          onClick={() => onSelect(template.id)}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Usar Template
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelect(template.id)}
      disabled={isCreating}
      className={`group relative p-5 rounded-xl bg-gradient-to-br ${colorClass} border text-left transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50`}
    >
      <div className="text-2xl mb-3">{template.icon}</div>
      <h3 className="font-semibold text-white mb-1">{template.name}</h3>
      <p className="text-white/50 text-sm mb-3 line-clamp-2">{template.description}</p>
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Users className="w-3 h-3" />
        <span>{template.agentCount} agentes</span>
        <span>·</span>
        <Clock className="w-3 h-3" />
        <span>{template.estimatedDuration}</span>
      </div>
      <div className="flex flex-wrap gap-1 mt-3">
        {template.agentRoles.map((role, i) => (
          <span
            key={i}
            className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60"
          >
            {role}
          </span>
        ))}
      </div>
      {isCreating && (
        <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
      )}
      {showArrow && (
        <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
      )}
    </button>
  )
}
