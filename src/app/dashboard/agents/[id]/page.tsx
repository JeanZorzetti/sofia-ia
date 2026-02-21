'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ArrowLeft, Loader2, Save, MessageSquare, Mail, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AgentChatTester } from '@/components/sofia/AgentChatTester'

interface Agent {
  id: string
  name: string
  description: string | null
  systemPrompt: string
  model: string
  temperature: number
  status: string
  knowledgeBaseId: string | null
  channels: {
    id: string
    channel: string
    isActive: boolean
    config: any
  }[]
  creator: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

interface KnowledgeBase {
  id: string
  name: string
}

interface WhatsappInstance {
  name: string
  connectionStatus: string
}

export default function AgentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [whatsappInstances, setWhatsappInstances] = useState<WhatsappInstance[]>([])
  const [models, setModels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    status: 'active',
    knowledgeBaseId: '',
    channels: {
      whatsapp: false,
      whatsappInstance: '',
      webchat: false,
      email: false
    },
    config: {
      workingDirectory: ''
    }
  })

  useEffect(() => {
    fetchAgent()
    fetchKnowledgeBases()
    fetchWhatsappInstances()
    fetchModels()
  }, [resolvedParams.id])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models')
      const result = await response.json()
      if (result.success) {
        setModels(result.data)
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    }
  }

  const fetchAgent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/agents/${resolvedParams.id}`)
      const result = await response.json()

      if (result.success && result.data) {
        const agentData = result.data
        setAgent(agentData)
        const whatsappChannel = agentData.channels.find((ch: any) => ch.channel === 'whatsapp')
        setFormData({
          name: agentData.name,
          description: agentData.description || '',
          systemPrompt: agentData.systemPrompt,
          model: agentData.model,
          temperature: agentData.temperature,
          status: agentData.status,
          knowledgeBaseId: agentData.knowledgeBaseId || '',
          channels: {
            whatsapp: !!whatsappChannel,
            whatsappInstance: whatsappChannel?.config?.instanceName || '',
            webchat: agentData.channels.some((ch: any) => ch.channel === 'webchat'),
            email: agentData.channels.some((ch: any) => ch.channel === 'email')
          },
          config: {
            workingDirectory: agentData.config?.workingDirectory || ''
          }
        })
      }
    } catch (error) {
      console.error('Error fetching agent:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchKnowledgeBases = async () => {
    try {
      const response = await fetch('/api/knowledge')
      const result = await response.json()

      if (result.knowledgeBases) {
        setKnowledgeBases(result.knowledgeBases)
      }
    } catch (error) {
      console.error('Error fetching knowledge bases:', error)
    }
  }

  const fetchWhatsappInstances = async () => {
    try {
      const response = await fetch('/api/instances')
      const result = await response.json()
      const instances: any[] = result.data || []
      setWhatsappInstances(
        instances.map((inst: any) => ({
          name: inst.name || inst.instance?.instanceName,
          connectionStatus: inst.connectionStatus || inst.instance?.status,
        }))
      )
    } catch (error) {
      console.error('Error fetching WhatsApp instances:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const channels = []
      if (formData.channels.whatsapp) {
        channels.push({
          channel: 'whatsapp',
          config: { instanceName: formData.channels.whatsappInstance || null },
          isActive: true
        })
      }
      if (formData.channels.webchat) {
        channels.push({ channel: 'webchat', config: {}, isActive: true })
      }
      if (formData.channels.email) {
        channels.push({ channel: 'email', config: {}, isActive: true })
      }

      const response = await fetch(`/api/agents/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          systemPrompt: formData.systemPrompt,
          model: formData.model,
          temperature: formData.temperature,
          status: formData.status,
          knowledgeBaseId: formData.knowledgeBaseId || null,
          config: {
            ...formData.config,
            workingDirectory: formData.config.workingDirectory
          },
          channels
        })
      })

      const result = await response.json()

      if (result.success) {
        router.push('/dashboard/agents')
      }
    } catch (error) {
      console.error('Error saving agent:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-4">Agente não encontrado</h2>
        <Button onClick={() => router.push('/dashboard/agents')}>
          Voltar para Agentes
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Editar Agente</h1>
            <p className="text-white/60 mt-1">{agent.name}</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AgentChatTester agentId={agent.id} agentName={agent.name} />
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Nome do Agente</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/5 border-white/10 text-white min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt" className="text-white">Instruções do Sistema</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="bg-white/5 border-white/10 text-white min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-white/40">
                  Define como o agente se comporta e responde aos usuários
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Configurações Avançadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model" className="text-white">Modelo de IA</Label>
                <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0b] border-white/10">
                    {/* Group models by provider */}
                    {Array.from(new Set(models.map(m => m.provider))).map(provider => (
                      <div key={provider}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">
                          {provider}
                        </div>
                        {models
                          .filter(m => m.provider === provider)
                          .map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                      </div>
                    ))}
                    {models.length === 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">
                          Groq (Padrão)
                        </div>
                        <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B (Versatile)</SelectItem>
                        <SelectItem value="llama-3.3-70b-specdec">Llama 3.3 70B (SpecDec)</SelectItem>
                        <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-white">
                  Temperatura: {formData.temperature.toFixed(1)}
                </Label>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[formData.temperature]}
                  onValueChange={(value) => setFormData({ ...formData, temperature: value[0] })}
                  className="py-4"
                />
                <p className="text-xs text-white/40">
                  Controla a criatividade das respostas (0 = mais preciso, 2 = mais criativo)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="knowledgeBaseId" className="text-white">Knowledge Base</Label>
                <Select value={formData.knowledgeBaseId || 'none'} onValueChange={(value) => setFormData({ ...formData, knowledgeBaseId: value === 'none' ? '' : value })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0b] border-white/10">
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {knowledgeBases.map((kb) => (
                      <SelectItem key={kb.id} value={kb.id}>{kb.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/40">
                  Base de conhecimento para contextualizar respostas do agente
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Diretório de Trabalho (Workspace)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workingDirectory" className="text-white">Caminho da Pasta do Projeto</Label>
                <Input
                  id="workingDirectory"
                  placeholder="Ex: C:\Users\jeanz\Projetos\MeuApp"
                  value={formData.config.workingDirectory}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...formData.config, workingDirectory: e.target.value }
                  })}
                  className="bg-white/5 border-white/10 text-white font-mono text-sm"
                />
                <p className="text-xs text-white/40">
                  Defina onde o Agente CLI deve ser executado. Deixe em branco para usar a pasta atual da Sofia.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Agente Ativo</Label>
                  <p className="text-sm text-white/60">
                    {formData.status === 'active' ? 'Respondendo mensagens' : 'Pausado'}
                  </p>
                </div>
                <Switch
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked ? 'active' : 'inactive' })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Canais Ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-white/5 overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-green-400" />
                    <span className="text-white">WhatsApp</span>
                  </div>
                  <Switch
                    checked={formData.channels.whatsapp}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        channels: { ...formData.channels, whatsapp: checked }
                      })
                    }
                  />
                </div>
                {formData.channels.whatsapp && (
                  <div className="px-3 pb-3 border-t border-white/10 pt-3">
                    <Label className="text-xs text-white/60 mb-2 block">Instância</Label>
                    <select
                      className="w-full rounded-lg border border-white/10 bg-[#0a0a0b] px-3 py-2 text-sm text-white"
                      value={formData.channels.whatsappInstance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          channels: { ...formData.channels, whatsappInstance: e.target.value }
                        })
                      }
                    >
                      <option value="">Qualquer instância conectada</option>
                      {whatsappInstances.map((inst) => (
                        <option key={inst.name} value={inst.name}>
                          {inst.name} {inst.connectionStatus === 'open' ? '🟢' : '🔴'}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-white/40">
                      Vincule este agente a uma instância específica do WhatsApp
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-blue-400" />
                  <span className="text-white">Web Chat</span>
                </div>
                <Switch
                  checked={formData.channels.webchat}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      channels: { ...formData.channels, webchat: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-purple-400" />
                  <span className="text-white">Email</span>
                </div>
                <Switch
                  checked={formData.channels.email}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      channels: { ...formData.channels, email: checked }
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-white/60">Criado por</p>
                <p className="text-white">{agent.creator.name}</p>
              </div>
              <div>
                <p className="text-white/60">Criado em</p>
                <p className="text-white">
                  {new Date(agent.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-white/60">ID do Agente</p>
                <p className="text-white font-mono text-xs">{agent.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  )
}
