'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Sparkles, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'
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

export function OnboardingWizard({ open, onClose, userId }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)

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
    if (step < 3) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleFinish = async () => {
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
        localStorage.setItem('onboarding_completed', 'true')
        onClose()
        router.push(`/dashboard/agents/${result.data.id}`)
      } else {
        alert(result.error || 'Erro ao criar agente')
      }
    } catch (error) {
      console.error('Error creating agent:', error)
      alert('Erro ao criar agente')
    } finally {
      setLoading(false)
    }
  }

  const isStepValid = () => {
    if (step === 1) return true
    if (step === 2) return agentName.trim() !== '' && agentCategory !== ''
    if (step === 3) return true
    return false
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Crie seu primeiro agente em 3 passos
          </DialogTitle>
          <DialogDescription>
            Configure um agente de IA personalizado para sua empresa
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-6 flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-1 items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${s <= step
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-1 flex-1 ${s < step ? 'bg-primary' : 'bg-muted'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-6 text-center">
                <Bot className="mx-auto mb-4 h-16 w-16 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">Bem-vindo à ROI Labs Platform!</h3>
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
                    <span>Automatizar workflows e integrações</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

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
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
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
                  Após criar o agente, você poderá personalizá-lo ainda mais, adicionar base de conhecimento
                  e conectar outros canais.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
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
              <Button onClick={handleFinish} disabled={loading}>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
