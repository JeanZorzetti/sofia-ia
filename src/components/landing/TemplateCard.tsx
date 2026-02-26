import Link from 'next/link'
import { ArrowRight, Clock, Tag } from 'lucide-react'
import type { Template } from '@/data/templates'
import { strategyLabels, difficultyColors } from '@/data/templates'

export function TemplateCard({ template, featured = false }: { template: Template; featured?: boolean }) {
  const strategy = strategyLabels[template.strategy]

  return (
    <div className={`glass-card p-6 rounded-xl border bg-gradient-to-br ${template.color} hover-scale flex flex-col h-full`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <template.icon className={`w-5 h-5 ${template.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">{template.category}</span>
              {template.popular && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">
                  Popular
                </span>
              )}
              {template.isNew && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                  Novo
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${strategy.color}`}>
          {strategy.label}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="font-semibold text-white mb-2 leading-snug">{template.name}</h3>
      <p className="text-sm text-foreground-tertiary leading-relaxed mb-4 flex-1">{template.description}</p>

      {/* Agents flow */}
      <div className="mb-4">
        <p className="text-xs text-white/30 mb-2">Agentes</p>
        <div className="flex flex-wrap gap-1.5">
          {template.agents.map((agent, i) => (
            <div key={agent} className="flex items-center gap-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-white/70">
                {agent}
              </span>
              {i < template.agents.length - 1 && (
                <ArrowRight className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div className="mb-5">
        <p className="text-xs text-white/30 mb-2">Casos de uso</p>
        <div className="flex flex-wrap gap-1.5">
          {template.useCases.slice(0, 3).map((uc) => (
            <span key={uc} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50">
              {uc}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {template.estimatedTime}
          </span>
          <span className={`flex items-center gap-1 ${difficultyColors[template.difficulty] ?? 'text-white/40'}`}>
            <Tag className="w-3 h-3" />
            {template.difficulty}
          </span>
        </div>
        <Link
          href="/login"
          className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors inline-flex items-center gap-1"
        >
          Usar template <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
