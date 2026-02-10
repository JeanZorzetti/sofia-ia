'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plug,
  MessageSquare,
  Webhook,
  Globe,
  Mail,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Trash2,
  Code,
  Instagram,
  Send,
  Phone,
} from 'lucide-react'
import Link from 'next/link'

interface Integration {
  id: string
  name: string
  type: string
  config: Record<string, unknown>
  status: string
  createdAt: string
  updatedAt: string
  hasCredentials: boolean
}

const integrationTypes = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
    description: 'Conecte sua instância WhatsApp via Evolution API',
  },
  {
    value: 'webhook',
    label: 'Webhook',
    icon: Webhook,
    description: 'Receba e envie webhooks para sistemas externos',
  },
  {
    value: 'api_rest',
    label: 'API REST',
    icon: Globe,
    description: 'Faça chamadas HTTP para APIs externas',
  },
  {
    value: 'email_smtp',
    label: 'E-mail SMTP',
    icon: Mail,
    description: 'Envie emails via SMTP',
  },
]

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false)
  const [configDialogOpen, setConfigDialogOpen] = useState<boolean>(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    type: 'whatsapp',
    description: '',
  })

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations')
      if (response.ok) {
        const data = await response.json()
        setIntegrations(data)
      }
    } catch (error) {
      console.error('Error fetching integrations:', error)
      alert('Erro ao carregar integrações')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newIntegration.name || !newIntegration.type) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newIntegration.name,
          type: newIntegration.type,
          config: {},
          credentials: {},
          status: 'inactive',
        }),
      })

      if (response.ok) {
        alert('Integração criada com sucesso')
        setCreateDialogOpen(false)
        setNewIntegration({ name: '', type: 'whatsapp', description: '' })
        fetchIntegrations()
      } else {
        throw new Error('Falha ao criar integração')
      }
    } catch (error) {
      console.error('Error creating integration:', error)
      alert('Erro ao criar integração')
    }
  }

  const handleTest = async (integrationId: string) => {
    setTestingId(integrationId)
    try {
      const response = await fetch(`/api/integrations/${integrationId}/test`, {
        method: 'POST',
      })

      const result = await response.json()

      alert(result.message)
    } catch (error) {
      console.error('Error testing integration:', error)
      alert('Erro ao testar integração')
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (integrationId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta integração?')) {
      return
    }

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Integração deletada com sucesso')
        fetchIntegrations()
      } else {
        throw new Error('Falha ao deletar integração')
      }
    } catch (error) {
      console.error('Error deleting integration:', error)
      alert('Erro ao deletar integração')
    }
  }

  const handleOpenConfig = (integration: Integration) => {
    setSelectedIntegration(integration)
    setConfigDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Ativo' },
      inactive: { variant: 'secondary', label: 'Inativo' },
      error: { variant: 'destructive', label: 'Erro' },
    }

    const config = variants[status] || variants.inactive
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeIcon = (type: string) => {
    const typeConfig = integrationTypes.find(t => t.value === type)
    if (!typeConfig) return Plug
    return typeConfig.icon
  }

  const getTypeLabel = (type: string) => {
    const typeConfig = integrationTypes.find(t => t.value === type)
    return typeConfig?.label || type
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">
            Conecte sistemas externos e expanda os canais de comunicação
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/integrations/widget">
              <Code className="mr-2 h-4 w-4" />
              Web Chat
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/integrations/instagram">
              <Instagram className="mr-2 h-4 w-4" />
              Instagram
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/integrations/telegram">
              <Send className="mr-2 h-4 w-4" />
              Telegram
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/integrations/voice">
              <Phone className="mr-2 h-4 w-4" />
              Voice
            </Link>
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Integração
          </Button>
        </div>
      </div>

      {/* Catálogo de Integrações Disponíveis */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Tipos de Integrações Disponíveis</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {integrationTypes.map((type) => {
            const Icon = type.icon
            const count = integrations.filter(i => i.type === type.value).length

            return (
              <Card key={type.value} className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setNewIntegration({ ...newIntegration, type: type.value })
                  setCreateDialogOpen(true)
                }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Icon className="h-8 w-8 text-primary" />
                    {count > 0 && (
                      <Badge variant="secondary">{count}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{type.label}</CardTitle>
                  <CardDescription className="text-sm">
                    {type.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Integrações Configuradas */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Integrações Configuradas</h2>
        {integrations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plug className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma integração configurada ainda
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Integração
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => {
              const Icon = getTypeIcon(integration.type)

              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {getTypeLabel(integration.type)}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(integration.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      {integration.hasCredentials ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Configurado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600">
                          <XCircle className="h-3 w-3" />
                          Sem credenciais
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenConfig(integration)}
                      >
                        <Settings className="mr-1 h-3 w-3" />
                        Configurar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(integration.id)}
                        disabled={testingId === integration.id || !integration.hasCredentials}
                      >
                        {testingId === integration.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Testar'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(integration.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialog de Criação */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Integração</DialogTitle>
            <DialogDescription>
              Crie uma nova integração para conectar sistemas externos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: WhatsApp Principal"
                value={newIntegration.name}
                onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={newIntegration.type}
                onValueChange={(value) => setNewIntegration({ ...newIntegration, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {integrationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o propósito desta integração"
                value={newIntegration.description}
                onChange={(e) => setNewIntegration({ ...newIntegration, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              Criar Integração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Configuração (placeholder) */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Integração</DialogTitle>
            <DialogDescription>
              {selectedIntegration?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              A configuração detalhada de credenciais será implementada na próxima tarefa.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setConfigDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
