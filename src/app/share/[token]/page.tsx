import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { CheckCircle2, XCircle, Clock, Zap } from 'lucide-react'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const execution = await prisma.orchestrationExecution.findUnique({
    where: { shareToken: token },
    select: { orchestration: { select: { name: true } } },
  })
  if (!execution) return { title: 'Resultado não encontrado — Sofia IA' }
  return {
    title: `${execution.orchestration.name} — Sofia IA`,
    description: 'Resultado de orquestração gerado pela Sofia IA',
  }
}

export default async function SharePage({ params }: Props) {
  const { token } = await params

  const execution = await prisma.orchestrationExecution.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      status: true,
      input: true,
      output: true,
      error: true,
      agentResults: true,
      startedAt: true,
      completedAt: true,
      durationMs: true,
      tokensUsed: true,
      orchestration: {
        select: {
          name: true,
          description: true,
          strategy: true,
        },
      },
    },
  })

  if (!execution) notFound()

  const agentResults = execution.agentResults as {
    agentName: string
    role: string
    output: string
    durationMs?: number
    tokensUsed?: number
  }[]

  const duration = execution.completedAt
    ? ((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000).toFixed(2)
    : null

  const statusIcon =
    execution.status === 'completed' ? (
      <CheckCircle2 className="w-5 h-5 text-green-400" />
    ) : execution.status === 'failed' ? (
      <XCircle className="w-5 h-5 text-red-400" />
    ) : (
      <Clock className="w-5 h-5 text-amber-400" />
    )

  const statusLabel =
    execution.status === 'completed' ? 'Concluído' :
    execution.status === 'failed' ? 'Falhou' : 'Em andamento'

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#1e293b]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Sofia IA</span>
          </div>
          <span className="text-xs text-white/40">Resultado compartilhado</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Orchestration info */}
        <div>
          <h1 className="text-2xl font-bold">{execution.orchestration.name}</h1>
          {execution.orchestration.description && (
            <p className="mt-1 text-white/60 text-sm">{execution.orchestration.description}</p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 text-sm text-white/60">
          <div className="flex items-center gap-1.5">
            {statusIcon}
            <span>{statusLabel}</span>
          </div>
          {duration && (
            <span>⏱ {duration}s</span>
          )}
          {execution.tokensUsed && (
            <span>🔤 {execution.tokensUsed.toLocaleString()} tokens</span>
          )}
          <span>📅 {new Date(execution.startedAt).toLocaleString('pt-BR')}</span>
        </div>

        {/* Input */}
        {execution.input && Object.keys(execution.input as object).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">Entrada</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <pre className="text-sm text-white/80 whitespace-pre-wrap break-words font-mono">
                {typeof execution.input === 'string'
                  ? execution.input
                  : JSON.stringify(execution.input, null, 2)}
              </pre>
            </div>
          </section>
        )}

        {/* Agent steps */}
        {agentResults.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">
              Etapas ({agentResults.length})
            </h2>
            <div className="space-y-3">
              {agentResults.map((step, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-600/40 text-violet-300 text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm">{step.agentName}</span>
                      {step.role && (
                        <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                          {step.role}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-white/40">
                      {step.durationMs && <span>{(step.durationMs / 1000).toFixed(2)}s</span>}
                      {step.tokensUsed && <span>{step.tokensUsed} tokens</span>}
                    </div>
                  </div>
                  <pre className="text-sm text-white/80 whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {step.output}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Final output */}
        {execution.output && (
          <section>
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">Resultado Final</h2>
            <div className="bg-gradient-to-br from-violet-900/30 to-blue-900/30 border border-violet-500/20 rounded-xl p-4">
              <pre className="text-sm text-white whitespace-pre-wrap break-words font-mono leading-relaxed">
                {typeof execution.output === 'string'
                  ? execution.output
                  : JSON.stringify(execution.output, null, 2)}
              </pre>
            </div>
          </section>
        )}

        {/* Error */}
        {execution.error && (
          <section>
            <h2 className="text-sm font-semibold text-red-400/60 uppercase tracking-wider mb-2">Erro</h2>
            <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4">
              <pre className="text-sm text-red-300 whitespace-pre-wrap break-words font-mono">
                {execution.error}
              </pre>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-white/40">
            Gerado com{' '}
            <a href="https://sofiaia.roilabs.com.br" className="text-violet-400 hover:underline">
              Sofia IA
            </a>{' '}
            — Plataforma de orquestração de agentes de IA
          </p>
        </div>
      </footer>
    </div>
  )
}
