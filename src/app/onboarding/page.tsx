'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Megaphone,
  Headphones,
  Search,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Bot,
  Network,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Step types ───────────────────────────────────────────

type UseCase = 'marketing' | 'support' | 'research' | 'other'

interface UseCaseOption {
  id: UseCase
  label: string
  description: string
  icon: React.ElementType
  color: string
  agentTemplate: {
    name: string
    systemPrompt: string
    model: string
  }
  orchestrationTemplate: {
    name: string
    description: string
    agents: string[]
    strategy: string
  }
}

const USE_CASES: UseCaseOption[] = [
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Crie campanhas, copy e conteudo com IA',
    icon: Megaphone,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    agentTemplate: {
      name: 'Agente de Copywriting',
      systemPrompt: `Voce e um especialista em marketing digital e copywriting.
Sua funcao e criar textos persuasivos, campanhas e conteudo de alta conversao.
Sempre use linguagem clara, objetivos bem definidos e calls to action eficazes.
Adapte o tom da marca conforme necessario.`,
      model: 'llama-3.3-70b-versatile',
    },
    orchestrationTemplate: {
      name: 'Pipeline de Marketing',
      description: 'Pesquisador de tendencias > Copywriter > Revisor de qualidade',
      agents: ['Pesquisador', 'Copywriter', 'Revisor'],
      strategy: 'sequential',
    },
  },
  {
    id: 'support',
    label: 'Suporte ao Cliente',
    description: 'Automatize atendimento e resolucao de problemas',
    icon: Headphones,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    agentTemplate: {
      name: 'Agente de Suporte',
      systemPrompt: `Voce e um agente especializado em suporte ao cliente.
Seu objetivo e resolver problemas com eficiencia e empatia.
Sempre mantenha um tom profissional e amigavel.
Identifique o problema do cliente, ofeca solucoes claras e escalade quando necessario.`,
      model: 'llama-3.3-70b-versatile',
    },
    orchestrationTemplate: {
      name: 'Pipeline de Suporte',
      description: 'Triagem > Atendente > Escalacao',
      agents: ['Triagem', 'Atendente', 'Escalacao'],
      strategy: 'sequential',
    },
  },
  {
    id: 'research',
    label: 'Pesquisa e Analise',
    description: 'Colete, analise e sintetize informacoes',
    icon: Search,
    color: 'text-green-400 bg-green-500/10 border-green-500/20',
    agentTemplate: {
      name: 'Agente Analista',
      systemPrompt: `Voce e um pesquisador e analista especializado.
Sua funcao e coletar informacoes, analisar dados e sintetizar insights valiosos.
Sempre cite fontes quando possivel, organize as informacoes de forma logica
e apresente conclusoes claras e acionaveis.`,
      model: 'llama-3.3-70b-versatile',
    },
    orchestrationTemplate: {
      name: 'Pipeline de Pesquisa',
      description: 'Coletor > Analista > Sintetizador',
      agents: ['Coletor', 'Analista', 'Sintetizador'],
      strategy: 'sequential',
    },
  },
  {
    id: 'other',
    label: 'Outro',
    description: 'Configure livremente para o seu caso de uso',
    icon: Sparkles,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    agentTemplate: {
      name: 'Meu Primeiro Agente',
      systemPrompt: `Voce e um assistente inteligente e versatil.
Sua funcao e ajudar o usuario com tarefas diversas de forma eficiente e precisa.
Sempre seja claro, objetivo e util nas suas respostas.`,
      model: 'llama-3.3-70b-versatile',
    },
    orchestrationTemplate: {
      name: 'Minha Primeira Orquestracao',
      description: 'Pipeline personalizado de agentes de IA',
      agents: ['Agente 1', 'Agente 2'],
      strategy: 'sequential',
    },
  },
]

const TOTAL_STEPS = 4

// ─── Component ────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const [agentName, setAgentName] = useState('')
  const [agentPrompt, setAgentPrompt] = useState('')
  const [orchName, setOrchName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedOption = USE_CASES.find((u) => u.id === selectedUseCase)

  function handleSelectUseCase(uc: UseCase) {
    setSelectedUseCase(uc)
    const opt = USE_CASES.find((u) => u.id === uc)!
    setAgentName(opt.agentTemplate.name)
    setAgentPrompt(opt.agentTemplate.systemPrompt)
    setOrchName(opt.orchestrationTemplate.name)
  }

  function handleNext() {
    if (step === 1 && !selectedUseCase) {
      toast.error('Selecione um caso de uso para continuar')
      return
    }
    if (step === 2 && !agentName.trim()) {
      toast.error('Defina um nome para o agente')
      return
    }
    if (step === 3 && !orchName.trim()) {
      toast.error('Defina um nome para a orquestracao')
      return
    }
    setStep((s) => s + 1)
  }

  async function handleFinish() {
    if (!selectedOption) return
    setIsSubmitting(true)

    try {
      // 1. Create agent
      const agentRes = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          systemPrompt: agentPrompt,
          model: selectedOption.agentTemplate.model,
          temperature: 0.7,
          status: 'active',
        }),
      })
      const agentJson = await agentRes.json()
      if (!agentJson.success) throw new Error(agentJson.error || 'Erro ao criar agente')

      const createdAgent = agentJson.data

      // 2. Create orchestration
      const orchAgents = selectedOption.orchestrationTemplate.agents.map((name, idx) => ({
        id: idx === 0 ? createdAgent.id : `placeholder-${idx}`,
        name: idx === 0 ? createdAgent.name : name,
        order: idx,
        systemPrompt: idx === 0 ? agentPrompt : `Voce e o agente ${name}. Execute sua funcao no pipeline.`,
        model: 'llama-3.3-70b-versatile',
      }))

      const orchRes = await fetch('/api/orchestrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orchName,
          description: selectedOption.orchestrationTemplate.description,
          agents: orchAgents,
          strategy: selectedOption.orchestrationTemplate.strategy,
          config: { useCase: selectedUseCase },
        }),
      })
      const orchJson = await orchRes.json()
      if (!orchJson.success) throw new Error(orchJson.error || 'Erro ao criar orquestracao')

      // 3. Mark onboarding as completed and send welcome email
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase: selectedUseCase }),
      })

      toast.success('Tudo pronto! Bem-vindo a Sofia IA.')
      router.push('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSkip() {
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase: 'skipped' }),
      })
    } catch {
      // ignore
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/40">Configuracao inicial</span>
            <span className="text-sm text-white/40">Passo {step} de {TOTAL_STEPS}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Use case selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20 mb-4">
                  <Sparkles className="h-8 w-8 text-violet-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Bem-vindo a Sofia IA
                </h1>
                <p className="text-white/60">
                  Vamos configurar sua primeira experiencia. Qual e o seu principal caso de uso?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {USE_CASES.map((uc) => {
                  const Icon = uc.icon
                  const isSelected = selectedUseCase === uc.id
                  return (
                    <button
                      key={uc.id}
                      onClick={() => handleSelectUseCase(uc.id)}
                      className={`flex flex-col items-start gap-3 p-5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'ring-2 ring-violet-400 border-violet-400/40 bg-violet-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg border ${uc.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{uc.label}</div>
                        <div className="text-sm text-white/60 mt-0.5">{uc.description}</div>
                      </div>
                      {isSelected && (
                        <div className="ml-auto">
                          <Check className="h-5 w-5 text-violet-400" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Create first agent */}
          {step === 2 && selectedOption && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 mb-4">
                  <Bot className="h-8 w-8 text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Seu Primeiro Agente
                </h2>
                <p className="text-white/60">
                  Criamos um template para {selectedOption.label.toLowerCase()}. Personalize como quiser.
                </p>
              </div>

              <Card className="glass-card mb-8">
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Nome do Agente
                    </label>
                    <Input
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Ex: Agente de Copywriting"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Instrucoes do Agente (System Prompt)
                    </label>
                    <textarea
                      value={agentPrompt}
                      onChange={(e) => setAgentPrompt(e.target.value)}
                      rows={6}
                      className="w-full rounded-md bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                      placeholder="Descreva o comportamento e funcao do agente..."
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 3: Create first orchestration */}
          {step === 3 && selectedOption && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20 mb-4">
                  <Network className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Primeira Orquestracao
                </h2>
                <p className="text-white/60">
                  Uma orquestracao conecta varios agentes em um pipeline inteligente.
                </p>
              </div>

              <Card className="glass-card mb-8">
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Nome da Orquestracao
                    </label>
                    <Input
                      value={orchName}
                      onChange={(e) => setOrchName(e.target.value)}
                      placeholder="Ex: Pipeline de Marketing"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-3">
                      Agentes no Pipeline
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedOption.orchestrationTemplate.agents.map((agent, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-sm text-violet-300"
                        >
                          <Bot className="h-3.5 w-3.5" />
                          {i === 0 ? agentName || agent : agent}
                          {i < selectedOption.orchestrationTemplate.agents.length - 1 && (
                            <ChevronRight className="h-3.5 w-3.5 text-violet-500/50" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/40 mt-3">
                      Estrategia: Sequencial — cada agente passa o resultado para o proximo
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: Completion */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-8">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/20 mb-6 ring-4 ring-green-500/20">
                  <Check className="h-10 w-10 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">
                  Tudo pronto!
                </h2>
                <p className="text-white/60 max-w-md mx-auto">
                  Seu agente <strong className="text-white">{agentName}</strong> e a orquestracao{' '}
                  <strong className="text-white">{orchName}</strong> serao criados automaticamente.
                </p>
              </div>

              <Card className="glass-card mb-8">
                <CardContent className="pt-6">
                  <h3 className="text-white font-semibold mb-4">O que foi configurado:</h3>
                  <ul className="space-y-3">
                    {[
                      { icon: Bot, text: `Agente: ${agentName}`, color: 'text-blue-400' },
                      { icon: Network, text: `Orquestracao: ${orchName}`, color: 'text-green-400' },
                      { icon: Sparkles, text: `Caso de uso: ${selectedOption?.label}`, color: 'text-violet-400' },
                    ].map((item, i) => {
                      const Icon = item.icon
                      return (
                        <li key={i} className="flex items-center gap-3 text-white/80">
                          <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <Icon className={`h-4 w-4 ${item.color}`} />
                          </div>
                          <span className="text-sm">{item.text}</span>
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="ghost"
                className="text-white/60 hover:text-white"
                onClick={() => setStep((s) => s - 1)}
                disabled={isSubmitting}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            {step === 1 && (
              <Button
                variant="ghost"
                className="text-white/40 hover:text-white/60 text-sm"
                onClick={handleSkip}
              >
                Pular configuracao
              </Button>
            )}
          </div>

          <div>
            {step < TOTAL_STEPS ? (
              <Button
                className="button-luxury"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                className="button-luxury"
                onClick={handleFinish}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    Ir para o Dashboard
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
