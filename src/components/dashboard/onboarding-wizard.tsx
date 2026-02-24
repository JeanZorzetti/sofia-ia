'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Bot, Sparkles, CheckCircle2, ArrowRight, ArrowLeft, Rocket, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface OnboardingWizardProps {
  open: boolean
  onClose: () => void
  userId: string
}

const DEMO_TEMPLATES = [
  {
    id: 'content-marketing-pipeline',
    icon: '🎯',
    name: 'Conteúdo de Marketing',
    description: 'Pesquisador → Copywriter → Revisor SEO — cria artigos prontos em minutos',
  },
  {
    id: 'research-analysis-pipeline',
    icon: '🔍',
    name: 'Pesquisa & Análise',
    description: 'Coletor → Analista → Sintetizador — pesquisa qualquer tópico com profundidade',
  },
  {
    id: 'rh-pipeline-contratacao',
    icon: '👥',
    name: 'Pipeline de RH',
    description: 'Job Design → Triagem → Entrevistador — automatize contratações completas',
  },
]

export function OnboardingWizard({ open, onClose, userId }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [templateLoading, setTemplateLoading] = useState<string | null>(null)
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null)

  const [agentName, setAgentName] = useState<string>('')
  const [agentCategory, setAgentCategory] = useState<string>('Atendimento')
  const [agentDescription, setAgentDescription] = useState<string>('')

  const categories = [
    'Atendimento',
    'Vendas',
    'Marketing',
    'RH',
    'Financeiro',
    'Jurídico',
    'Outro'
  ]

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleCreateAgent = async () => {
    setLoading(true)
    try {
      const systemPrompt = `Você é ${agentName}, um assistente virtual especializado em ${agentCategory.toLowerCase()}. ${agentDescription || 'Sua função é atender e ajudar os usuários de forma cordial e eficiente.'}`

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          description: agentDescription,
          systemPrompt,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          status: 'active',
          createdBy: userId,
          channels: [
            {
              channel: 'whatsapp',
              config: { autoRespond: true },
              isActive: true
            }
          ]
        })
      })

      const result = await response.json()
      if (result.success) {
        setCreatedAgentId(result.data.id)
        localStorage.setItem('onboarding_completed', 'true')
        setStep(4)
      } else {
        alert(result.error || 'Erro ao criar agente')
      }
    } catch {
      alert('Erro ao criar agente')
    } finally {
      setLoading(false)
    }
  }

  const handleUseTemplate = async (templateId: string) => {
    setTemplateLoading(templateId)
    try {
      const response = await fetch('/api/orchestrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTemplate: templateId })
      })
      const result = await response.json()
      if (result.success) {
        onClose()
        router.push(`/dashboard/orchestrations/${result.data.id}`)
      } else {
        alert(result.error || 'Erro ao criar orquestração')
      }
    } catch {
      alert('Erro ao criar orquestração')
    } finally {
      setTemplateLoading(null)
    }
  }

  const handleGoToDashboard = () => {
    if (createdAgentId) {
      onClose()
      router.push(`/dashboard/agents/${createdAgentId}`)
    } else {
      onClose()
      router.push('/dashboard')
    }
  }

  const isStepValid = () => {
    if (step === 1) return true
    if (step === 2) return agentName.trim() !== '' && agentCategory !== ''
    if (step === 3) return true
    return false
  }

  const [googleLoading, setGoogleLoading] = useState(false)

  const handleLinkGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/api/auth/google-finalize' })
  }

  const totalSteps = 4

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            {step < 4 ? 'Crie seu primeiro agente em 3 passos' : 'Agente criado com sucesso! 🎉'}
          </DialogTitle>
          <DialogDescription>
            {step < 4
              ? 'Configure um agente de IA personalizado para sua empresa'
              : 'Que tal experimentar uma orquestração multi-agente agora?'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Progress bar — mostra 4 steps mas step 4 é bonus */}
          <div className="mb-6 flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-1 items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    s <= Math.min(step, 3)
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`h-1 flex-1 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1 — Boas-vindas */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-6 text-center">
                <Bot className="mx-auto mb-4 h-16 w-16 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">Bem-vindo ao Sofia AI!</h3>
                <p className="text-foreground-secondary">
                  Vamos configurar seu primeiro agente de IA. Ele poderá atender clientes, qualificar leads
                  e automatizar processos 24/7.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">O que você pode fazer:</h4>
                <ul className="space-y-2 text-sm text-foreground-secondary">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>Criar agentes especializados por área (vendas, atendimento, RH, etc)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>Conectar múltiplos canais (WhatsApp, email, webchat)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>Orquestrar pipelines multi-agente sem programar</span>
                  </li>
                </ul>
              </div>

              {/* Google link CTA */}
              <button
                onClick={handleLinkGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-60"
              >
                <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {googleLoading ? 'Redirecionando...' : 'Conectar conta Google para login mais rápido'}
              </button>
            </div>
          )}

          {/* Step 2 — Configurar agente */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="agentName">Nome do Agente</Label>
                <Input
                  id="agentName"
                  placeholder="Ex: Atendente Virtual, Recrutador, Sofia..."
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="agentCategory">Categoria</Label>
                <Select value={agentCategory} onValueChange={setAgentCategory}>
                  <SelectTrigger id="agentCategory" className="mt-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="agentDescription">Descrição (opcional)</Label>
                <Textarea
                  id="agentDescription"
                  placeholder="Descreva o propósito do agente..."
                  value={agentDescription}
                  onChange={(e) => setAgentDescription(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 3 — Resumo + criar */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-6">
                <h3 className="mb-4 text-lg font-semibold">Resumo da Configuração</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Nome:</span>
                    <span className="font-semibold">{agentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Categoria:</span>
                    <span className="font-semibold">{agentCategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Canal:</span>
                    <span className="font-semibold">WhatsApp</span>
                  </div>
                  {agentDescription && (
                    <div className="mt-4">
                      <span className="text-foreground-secondary">Descrição:</span>
                      <p className="mt-1 text-foreground">{agentDescription}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm text-foreground-secondary">
                  Após criar o agente, você poderá experimentar uma orquestração multi-agente
                  com templates prontos para usar imediatamente.
                </p>
              </div>
            </div>
          )}

          {/* Step 4 — Experimente agora */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-green-400" />
                <div>
                  <p className="text-sm font-semibold text-green-300">Agente &ldquo;{agentName}&rdquo; criado!</p>
                  <p className="text-xs text-foreground-secondary">Pronto para atender seus clientes</p>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Experimente uma orquestração multi-agente agora:</p>
                </div>
                <div className="space-y-2">
                  {DEMO_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleUseTemplate(t.id)}
                      disabled={templateLoading !== null}
                      className="w-full rounded-lg border border-sidebar-border bg-sidebar/50 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{t.icon}</span>
                          <div>
                            <p className="text-sm font-semibold">{t.name}</p>
                            <p className="text-xs text-foreground-secondary">{t.description}</p>
                          </div>
                        </div>
                        {templateLoading === t.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-foreground-secondary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Botões de navegação */}
          <div className="mt-6 flex items-center justify-between">
            {step < 4 ? (
              <>
                <Button
                  variant="outline"
                  onClick={step === 1 ? onClose : handleBack}
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {step === 1 ? 'Pular' : 'Voltar'}
                </Button>

                {step < 3 ? (
                  <Button onClick={handleNext} disabled={!isStepValid()}>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleCreateAgent} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Criando...
                      </>
                    ) : (
                      <>
                        Criar Agente
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex w-full justify-between">
                <Button variant="outline" onClick={handleGoToDashboard} disabled={templateLoading !== null}>
                  <Rocket className="mr-2 h-4 w-4" />
                  Ir para o Dashboard
                </Button>
                <p className="self-center text-xs text-foreground-secondary">
                  Escolha um template acima para começar
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
