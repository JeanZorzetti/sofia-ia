'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Save, Sparkles, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

export default function SDRConfigPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prompt, setPrompt] = useState(
    'Você é Sofia, uma assistente de vendas especializada em imóveis de alto padrão. Seja profissional, empática e sempre busque qualificar o lead.'
  )

  const [behaviors, setBehaviors] = useState({
    proactivity: true,
    empathy: true,
    urgency: false,
    technical_knowledge: true,
    auto_followup: true
  })

  // Carregar configurações ao montar o componente
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings?category=sdr&key=custom_prompt')

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const settingValue = result.data.value
          if (settingValue.systemPrompt) {
            setPrompt(settingValue.systemPrompt)
          }
          if (settingValue.behaviors) {
            setBehaviors(settingValue.behaviors)
          }
          toast.success('Configurações carregadas')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    {
      title: 'Vendedor Premium',
      prompt: 'Você é Sofia, uma vendedora de elite especializada em imóveis de luxo. Use linguagem sofisticada, demonstre conhecimento profundo do mercado e destaque exclusividade em cada interação.'
    },
    {
      title: 'Consultor Empático',
      prompt: 'Você é Sofia, uma consultora imobiliária que prioriza o relacionamento. Ouça atentamente as necessidades do cliente, faça perguntas abertas e construa confiança antes de apresentar ofertas.'
    },
    {
      title: 'Negociador Ágil',
      prompt: 'Você é Sofia, uma negociadora focada em resultados rápidos. Identifique urgência, apresente soluções imediatas e conduza o lead para agendamento de visita o mais rápido possível.'
    }
  ]

  const behaviorToggles = [
    {
      id: 'proactivity',
      label: 'Proatividade',
      description: 'Sofia inicia conversas e sugere próximos passos'
    },
    {
      id: 'empathy',
      label: 'Empatia',
      description: 'Demonstra compreensão e adapta comunicação'
    },
    {
      id: 'urgency',
      label: 'Urgência',
      description: 'Cria senso de oportunidade limitada'
    },
    {
      id: 'technical_knowledge',
      label: 'Conhecimento Técnico',
      description: 'Fornece detalhes técnicos sobre imóveis'
    },
    {
      id: 'auto_followup',
      label: 'Follow-up Automático',
      description: 'Envia mensagens de acompanhamento'
    }
  ]

  const handleSuggestion = (suggestionPrompt: string) => {
    setPrompt(suggestionPrompt)
  }

  const handleToggle = (behaviorId: string) => {
    setBehaviors(prev => ({
      ...prev,
      [behaviorId]: !prev[behaviorId as keyof typeof prev]
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: 'sdr',
          key: 'custom_prompt',
          value: {
            systemPrompt: prompt,
            behaviors: behaviors,
            enabled: true,
          },
          description: 'Prompt customizado para o SDR imobiliário'
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Configuração salva com sucesso!')
      } else {
        toast.error(result.error || 'Erro ao salvar configuração')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const mockResponse = `Olá! 👋 Sou a Sofia, sua consultora imobiliária digital.\n\nVi que você tem interesse em imóveis na região. Que tal eu te mostrar algumas opções exclusivas que acabaram de chegar?\n\nPara começar, me conta: você está buscando para morar ou investir?`

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-white">Configuração SDR</h1>
        <p className="text-white/60 mt-1">Personalize a personalidade e comportamento da Sofia</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                Prompt Personalizado
              </CardTitle>
              <CardDescription className="text-white/60">
                Defina a personalidade base da Sofia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/80">Instruções do Sistema</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="bg-white/5 border-white/10 text-white resize-none"
                  placeholder="Digite as instruções para a Sofia..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Sugestões Rápidas</Label>
                <div className="grid grid-cols-1 gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion.title}
                      variant="outline"
                      className="justify-start text-left h-auto py-3"
                      onClick={() => handleSuggestion(suggestion.prompt)}
                    >
                      <div>
                        <div className="font-semibold text-white">{suggestion.title}</div>
                        <div className="text-xs text-white/60 mt-1">
                          {suggestion.prompt.substring(0, 80)}...
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Comportamentos</CardTitle>
              <CardDescription className="text-white/60">
                Ajuste características específicas da Sofia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {behaviorToggles.map((behavior) => (
                <div
                  key={behavior.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={behavior.id} className="text-white font-medium cursor-pointer">
                        {behavior.label}
                      </Label>
                      {behaviors[behavior.id as keyof typeof behaviors] && (
                        <Badge variant="default" className="bg-green-500 text-white text-xs">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/60 mt-1">
                      {behavior.description}
                    </p>
                  </div>
                  <Switch
                    id={behavior.id}
                    checked={behaviors[behavior.id as keyof typeof behaviors]}
                    onCheckedChange={() => handleToggle(behavior.id)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                Pré-visualização
              </CardTitle>
              <CardDescription className="text-white/60">
                Veja como Sofia responderá com estas configurações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                      S
                    </div>
                    <span className="text-white font-medium">Sofia</span>
                    <Badge variant="outline" className="text-xs">
                      IA
                    </Badge>
                  </div>
                  <p className="text-white/90 whitespace-pre-line leading-relaxed">
                    {mockResponse}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/5 text-center">
                    <div className="text-xs text-white/60">Tom</div>
                    <div className="text-sm text-white font-medium mt-1">
                      {behaviors.empathy ? 'Empático' : 'Direto'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 text-center">
                    <div className="text-xs text-white/60">Estilo</div>
                    <div className="text-sm text-white font-medium mt-1">
                      {behaviors.proactivity ? 'Proativo' : 'Reativo'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 text-center">
                    <div className="text-xs text-white/60">Urgência</div>
                    <div className="text-sm text-white font-medium mt-1">
                      {behaviors.urgency ? 'Alta' : 'Baixa'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 text-center">
                    <div className="text-xs text-white/60">Follow-up</div>
                    <div className="text-sm text-white font-medium mt-1">
                      {behaviors.auto_followup ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            className="button-luxury w-full"
            onClick={handleSave}
            disabled={saving || loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>
      </div>
    </div>
  )
}
