'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, ArrowRight, RotateCcw, Bot } from 'lucide-react'

type CardPhase = 'idle' | 'running-0' | 'running-1' | 'running-2' | 'output'

const PHASE_TO_ACTIVE: Record<CardPhase, number> = {
  idle: -1,
  'running-0': 0,
  'running-1': 1,
  'running-2': 2,
  output: 3,
}

interface TemplateConfig {
  placeholder: string
  steps: string[]
  fallback: (input: string) => string
}

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  marketing: {
    placeholder: 'Digite um tema para criar um post...',
    steps: ['Pesquisando tendências...', 'Escrevendo conteúdo...', 'Revisando clareza...'],
    fallback: (input) =>
      `Revisor: "Post sobre '${input}' aprovado. Hook forte no título. 3 pontos de valor. CTA claro. Pronto para publicar."`,
  },
  suporte: {
    placeholder: 'Descreva o problema do cliente...',
    steps: ['Triando urgência...', 'Elaborando resposta...', 'Verificando escalação...'],
    fallback: (input) =>
      `Escalação: "Ticket sobre '${input}' triado. Prioridade: Média. Resposta redigida. Resolução estimada: 2h."`,
  },
  pesquisa: {
    placeholder: 'Qual tema deseja pesquisar?',
    steps: ['Coletando fontes...', 'Analisando dados...', 'Sintetizando insights...'],
    fallback: (input) =>
      `Sintetizador: "Análise de '${input}' concluída. 8 fontes verificadas. 3 insights principais. Confiança: 94%."`,
  },
}

async function fetchAIOutput(
  category: string,
  input: string,
  orchestrationId: string | null
): Promise<string> {
  const body = orchestrationId
    ? { orchestrationId, input }
    : { category, input }
  const res = await fetch('/api/landing/template-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('api_error')
  const data = await res.json()
  return data.text || ''
}

interface TemplateTestDriveCardProps {
  template: {
    orchestrationId: string | null
    icon: string
    name: string
    roles: string[]
    time: string
    category: string
  }
}

export function TemplateTestDriveCard({ template }: TemplateTestDriveCardProps) {
  const config = TEMPLATE_CONFIGS[template.category] ?? TEMPLATE_CONFIGS.pesquisa
  const [phase, setPhase] = useState<CardPhase>('idle')
  const [input, setInput] = useState('')
  const [outputText, setOutputText] = useState('')
  const [charIndex, setCharIndex] = useState(0)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const capturedInputRef = useRef('')
  const aiPromiseRef = useRef<Promise<string> | null>(null)

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  const handleRun = useCallback(() => {
    if (!input.trim()) return
    clearAll()
    const trimmed = input.trim()
    capturedInputRef.current = trimmed
    setPhase('running-0')
    setOutputText('')
    setCharIndex(0)

    // Kick off real AI call in background while animation runs
    aiPromiseRef.current = fetchAIOutput(template.category, trimmed, template.orchestrationId).catch(
      () => config.fallback(trimmed)
    )

    timeoutsRef.current = [
      setTimeout(() => setPhase('running-1'), 1200),
      setTimeout(() => setPhase('running-2'), 2400),
      setTimeout(() => setPhase('output'), 3600),
    ]
  }, [input, clearAll, template.category, config])

  const handleReset = useCallback(() => {
    clearAll()
    setPhase('idle')
    setOutputText('')
    setCharIndex(0)
    aiPromiseRef.current = null
  }, [clearAll])

  // When output phase starts, resolve AI promise → typewriter
  useEffect(() => {
    if (phase !== 'output') return
    let cancelled = false
    ;(async () => {
      let text = ''
      try {
        text = aiPromiseRef.current
          ? await aiPromiseRef.current
          : config.fallback(capturedInputRef.current)
      } catch {
        text = config.fallback(capturedInputRef.current)
      }
      if (!cancelled) {
        setOutputText(text)
        setCharIndex(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phase, config])

  // Typewriter
  useEffect(() => {
    if (!outputText || charIndex >= outputText.length) return
    const t = setTimeout(() => setCharIndex((n) => n + 1), 18)
    return () => clearTimeout(t)
  }, [outputText, charIndex])

  // Cleanup on unmount
  useEffect(() => () => clearAll(), [clearAll])

  const getNodeState = (idx: number): 'waiting' | 'running' | 'done' => {
    const active = PHASE_TO_ACTIVE[phase]
    if (active < 0) return 'waiting'
    if (idx < active) return 'done'
    if (idx === active) return phase === 'output' ? 'done' : 'running'
    return 'waiting'
  }

  const isRunning = phase !== 'idle'
  const isLoadingOutput = phase === 'output' && !outputText

  return (
    <div className="glass-card p-5 rounded-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl mb-2">{template.icon}</div>
          <h3 className="font-semibold text-white text-sm">{template.name}</h3>
        </div>
        {isRunning && (
          <button
            onClick={handleReset}
            className="text-white/25 hover:text-white/50 transition-colors mt-1"
            aria-label="Reiniciar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Roles row (idle) */}
      {!isRunning && (
        <div className="flex items-center gap-1 flex-wrap">
          {template.roles.map((role, i) => (
            <div key={role} className="flex items-center gap-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">{role}</span>
              {i < template.roles.length - 1 && <ArrowRight className="w-3 h-3 text-white/20" />}
            </div>
          ))}
        </div>
      )}

      {/* Input + Play */}
      {!isRunning && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRun()}
            placeholder={config.placeholder}
            className="flex-1 min-w-0 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80 placeholder-white/25 focus:outline-none focus:border-blue-500/40 transition-colors"
          />
          <button
            onClick={handleRun}
            disabled={!input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center hover:bg-blue-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Executar"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      )}

      {/* Active input display */}
      {isRunning && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <span className="text-white/30 text-xs font-mono select-none">›</span>
          <span className="text-xs text-white/70 font-mono flex-1 truncate">{capturedInputRef.current}</span>
        </div>
      )}

      {/* Agent pipeline */}
      {isRunning && (
        <div className="flex items-center gap-2 justify-center py-1">
          {template.roles.map((role, i) => {
            const state = getNodeState(i)
            return (
              <div key={role} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-500 ${
                      state === 'done'
                        ? 'bg-green-500/20 border-green-500/40 text-green-300 shadow-[0_0_12px_rgba(74,222,128,0.15)]'
                        : state === 'running'
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse shadow-[0_0_12px_rgba(96,165,250,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/30'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-white/50 text-center leading-tight max-w-[56px]">{role}</span>
                  <span
                    className={`text-[9px] transition-all duration-300 text-center max-w-[64px] leading-tight ${
                      state === 'done' ? 'text-green-400' : state === 'running' ? 'text-blue-400 animate-pulse' : 'text-white/20'
                    }`}
                  >
                    {state === 'done' ? 'Concluído ✓' : state === 'running' ? config.steps[i] : '—'}
                  </span>
                </div>
                {i < template.roles.length - 1 && (
                  <ArrowRight
                    className={`w-3 h-3 flex-shrink-0 mb-5 transition-colors duration-700 ${
                      getNodeState(i) === 'done' ? 'text-green-400/50' : 'text-white/15'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Output area */}
      {phase === 'output' && (
        <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 min-h-[44px]">
          {isLoadingOutput ? (
            <div className="flex items-center gap-2">
              <span className="inline-block w-[5px] h-[11px] bg-green-400/60 rounded-sm animate-pulse" />
              <span className="text-[11px] text-green-300/40 font-mono">Gerando resposta...</span>
            </div>
          ) : (
            <p className="text-[11px] text-green-300 font-mono leading-relaxed">
              {outputText.slice(0, charIndex)}
              {charIndex < outputText.length && (
                <span className="inline-block w-[5px] h-[11px] bg-green-400/80 rounded-sm animate-pulse align-[-2px] ml-[1px]" />
              )}
            </p>
          )}
        </div>
      )}

      {/* Footer (idle only) */}
      {!isRunning && (
        <div className="flex items-center justify-between text-xs text-white/30 mt-auto pt-1 border-t border-white/5">
          <span>Tempo estimado: {template.time}</span>
          <span className="capitalize">{template.category}</span>
        </div>
      )}
    </div>
  )
}
