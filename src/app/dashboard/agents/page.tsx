'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Bot, MessageSquare, Mail, Globe, Loader2, Settings, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Agent {
  id: string
  name: string
  description: string | null
  status: string
  model: string
  channels: {
    id: string
    channel: string
    isActive: boolean
  }[]
  creator: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  _count?: {
    conversations?: number
  }
}

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    channels: {
      whatsapp: false,
      webchat: false,
      email: false
    }
  })

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agents')
      const result = await response.json()

      if (result.success) {
        setAgents(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAgent = async () => {
    try {
      const channels = []
      if (formData.channels.whatsapp) {
        channels.push({ channel: 'whatsapp', config: {}, isActive: true })
      }
      if (formData.channels.webchat) {
        channels.push({ channel: 'webchat', config: {}, isActive: true })
      }
      if (formData.channels.email) {
        channels.push({ channel: 'email', config: {}, isActive: true })
      }

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          systemPrompt: formData.systemPrompt,
          model: formData.model,
          temperature: formData.temperature,
          channels,
          status: 'active'
        })
      })

      const result = await response.json()

      if (result.success) {
        setCreateDialogOpen(false)
        setFormData({
          name: '',
          description: '',
          systemPrompt: '',
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          channels: { whatsapp: false, webchat: false, email: false }
        })
        fetchAgents()
      }
    } catch (error) {
      console.error('Error creating agent:', error)
    }
  }

  const handleToggleStatus = async (agentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const result = await response.json()

      if (result.success) {
        fetchAgents()
      }
    } catch (error) {
      console.error('Error toggling agent status:', error)
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        fetchAgents()
      }
    } catch (error) {
      console.error('Error deleting agent:', error)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'webchat':
        return <Globe className="h-4 w-4" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agentes de IA</h1>
          <p className="text-white/60 mt-1">Gerencie seus assistentes virtuais</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Agente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-[#0a0a0b] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Novo Agente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Nome do Agente</Label>
                <Input
                  id="name"
                  placeholder="Ex: Assistente de Vendas"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito deste agente..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/5 border-white/10 text-white min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt" className="text-white">Instruções do Sistema</Label>
                <Textarea
                  id="systemPrompt"
                  placeholder="Você é um assistente que..."
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="bg-white/5 border-white/10 text-white min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Canais</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
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
                </div>
              </div>

              <Button
                onClick={handleCreateAgent}
                className="w-full"
                disabled={!formData.name || !formData.systemPrompt}
              >
                Criar Agente
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="glass-card hover-scale">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{agent.name}</CardTitle>
                    <p className="text-sm text-white/60 mt-1">
                      {agent.description || 'Sem descrição'}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {agent.channels.map((ch) => (
                  <Badge
                    key={ch.id}
                    variant={ch.isActive ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {getChannelIcon(ch.channel)}
                    {ch.channel}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                  {agent.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  <Switch
                    checked={agent.status === 'active'}
                    onCheckedChange={() => handleToggleStatus(agent.id, agent.status)}
                  />

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAgent(agent.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Bot className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum agente criado
            </h3>
            <p className="text-white/60 mb-6">
              Crie seu primeiro agente de IA para começar a automatizar conversas
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Agente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
