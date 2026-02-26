'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, ArrowRight, Sparkles, RotateCcw } from 'lucide-react'

type Phase = 'idle' | 'running-1' | 'running-2' | 'running-3' | 'output'

const SCENARIOS = [
  {
    label: 'Pesquisar tendências de SaaS',
    agents: ['Pesquisador', 'Analista', 'Redator'],
    steps: ['Buscando fontes...', 'Analisando dados...', 'Redigindo relatório...'],
    output:
      'Redator: "5 tendências SaaS para 2026 identificadas. PLG domina 73% das startups B2B. AI-native apps crescem 4x ao ano. Vertical SaaS supera horizontal em retenção. Relatório completo: 847 palavras."',
  },
  {
    label: 'Criar roteiro de vendas',
    agents: ['Pesquisador', 'Copywriter', 'Revisor'],
    steps: ['Mapeando ICP...', 'Escrevendo roteiro...', 'Revisando clareza...'],
    output:
      'Revisor: "Roteiro aprovado. Hook com 87% de estimativa de engajamento. 4 objeções mapeadas: preço, ROI, setup e segurança. Script de 3 min, tom consultivo, 2 CTAs de baixo atrito."',
  },
  {
    label: 'Analisar feedback de suporte',
    agents: ['Extrator', 'Analista', 'Sintetizador'],
    steps: ['Processando tickets...', 'Categorizando issues...', 'Gerando insights...'],
    output:
      'Sintetizador: "247 tickets analisados. Top 3 issues: integração API (34%), onboarding (28%), latência em picos (19%). Ação prioritária: docs de setup. NPS projetado: +12 pontos em 30 dias."',
  },
] as const

const PHASE_TO_ACTIVE: Record<Phase, number> = {
  idle: -1,
  'running-1': 0,
  'running-2': 1,
  'running-3': 2,
  output: 3,
}

export function PipelineSimulator() {
  const [scenarioIdx, setScenarioIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [charIndex, setCharIndex] = useState(0)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  const runScenario = useCallback(
    (idx: number) => {
      clearAll()
      setScenarioIdx(idx)
      setPhase('running-1')
      setCharIndex(0)
      timeoutsRef.current = [
        setTimeout(() => setPhase('running-2'), 1400),
        setTimeout(() => setPhase('running-3'), 2800),
        setTimeout(() => setPhase('output'), 4100),
      ]
    },
    [clearAll]
  )

  // Auto-start first scenario on mount
  useEffect(() => {
    const t = setTimeout(() => runScenario(0), 900)
    return () => {
      clearTimeout(t)
      clearAll()
    }
  }, [runScenario, clearAll])

  // Typewriter effect
  useEffect(() => {
    if (phase !== 'output') return
    const text = SCENARIOS[scenarioIdx].output
    if (charIndex >= text.length) return
    const t = setTimeout(() => setCharIndex((n) => n + 1), 16)
    return () => clearTimeout(t)
  }, [phase, charIndex, scenarioIdx])

  const getNodeState = (nodeIdx: number): 'waiting' | 'running' | 'done' => {
    const active = PHASE_TO_ACTIVE[phase]
    if (active < 0) return 'waiting'
    if (nodeIdx < active) return 'done'
    if (nodeIdx === active) return phase === 'output' ? 'done' : 'running'
    return 'waiting'
  }

  const scenario = SCENARIOS[scenarioIdx]
  const isRunning = phase !== 'idle'

  return (
    <div className="glass-card p-5 md:p-6 rounded-2xl space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-white/50 font-medium">O que você quer que nossos agentes resolvam?</p>
        </div>
        {isRunning && (
          <button
            onClick={() => { clearAll(); setPhase('idle'); setCharIndex(0) }}
            className="text-white/25 hover:text-white/50 transition-colors"
            aria-label="Reiniciar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.label}
            onClick={() => runScenario(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              scenarioIdx === i && isRunning
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80 hover:border-white/20'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Active query display */}
      {isRunning && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <span className="text-white/30 text-xs font-mono select-none">›</span>
          <span className="text-sm text-white/80 font-mono flex-1 truncate">{scenario.label}</span>
          <span className="w-[5px] h-4 bg-blue-400/80 rounded-sm animate-pulse flex-shrink-0" />
        </div>
      )}

      {/* Pipeline nodes */}
      {isRunning && (
        <div className="flex items-center gap-2 md:gap-4 justify-center flex-wrap py-1">
          {scenario.agents.map((agent, i) => {
            const state = getNodeState(i)
            return (
              <div key={agent} className="flex items-center gap-2 md:gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                      state === 'done'
                        ? 'bg-green-500/20 border-green-500/40 text-green-300 shadow-[0_0_16px_rgba(74,222,128,0.15)]'
                        : state === 'running'
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse shadow-[0_0_16px_rgba(96,165,250,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/30'
                    }`}
                  >
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-white/60">{agent}</span>
                  <span
                    className={`text-[10px] transition-all duration-300 ${
                      state === 'done'
                        ? 'text-green-400'
                        : state === 'running'
                        ? 'text-blue-400 animate-pulse'
                        : 'text-white/20'
                    }`}
                  >
                    {state === 'done' ? 'Concluído ✓' : state === 'running' ? scenario.steps[i] : 'Aguardando'}
                  </span>
                </div>
                {i < scenario.agents.length - 1 && (
                  <ArrowRight
                    className={`w-4 h-4 flex-shrink-0 transition-colors duration-700 ${
                      getNodeState(i) === 'done' ? 'text-green-400/50' : 'text-white/15'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Typewriter output */}
      {phase === 'output' && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 min-h-[52px]">
          <p className="text-xs text-green-300 font-mono leading-relaxed">
            {scenario.output.slice(0, charIndex)}
            {charIndex < scenario.output.length && (
              <span className="inline-block w-[6px] h-[13px] bg-green-400/80 rounded-sm animate-pulse align-[-2px] ml-[1px]" />
            )}
          </p>
        </div>
      )}

      {/* Idle placeholder */}
      {phase === 'idle' && (
        <div className="py-6 text-center">
          <p className="text-xs text-white/25">Selecione um cenário acima para ver a orquestração ao vivo</p>
        </div>
      )}
    </div>
  )
}
