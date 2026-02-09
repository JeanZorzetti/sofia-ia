'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Code, ExternalLink } from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string | null
  status: string
}

export default function WidgetConfigPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [config, setConfig] = useState({
    agentId: '',
    primaryColor: '#3b82f6',
    position: 'bottom-right',
    title: 'Atendimento',
    subtitle: 'Estamos online',
    welcomeMessage: 'Olá! Como posso ajudar você hoje?',
    placeholder: 'Digite sua mensagem...',
  })

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      if (data.success) {
        setAgents(data.data.filter((a: Agent) => a.status === 'active'))
        if (data.data.length > 0) {
          setConfig((prev) => ({ ...prev, agentId: data.data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const generateCode = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `<!-- ROI Labs Chat Widget -->
<script>
  window.roiLabsConfig = ${JSON.stringify(
    {
      agentId: config.agentId,
      apiUrl: `${baseUrl}/api/chat/widget`,
      primaryColor: config.primaryColor,
      position: config.position,
      title: config.title,
      subtitle: config.subtitle,
      welcomeMessage: config.welcomeMessage,
      placeholder: config.placeholder,
    },
    null,
    2
  )};
</script>
<script src="${baseUrl}/widget.js"></script>`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateCode())
    alert('Código copiado para a área de transferência!')
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração do Web Chat Widget</h1>
          <p className="text-muted-foreground">
            Personalize e integre o widget de chat no seu site
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/widget/demo" target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver Demo
          </a>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="agent">Agente de IA</Label>
              <Select
                value={config.agentId}
                onValueChange={(value) => setConfig({ ...config, agentId: value })}
              >
                <SelectTrigger id="agent">
                  <SelectValue placeholder="Selecione um agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Subtítulo</Label>
              <Input
                id="subtitle"
                value={config.subtitle}
                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
              <Textarea
                id="welcomeMessage"
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={config.placeholder}
                onChange={(e) => setConfig({ ...config, placeholder: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="color">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-20"
                />
                <Input
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="position">Posição</Label>
              <Select
                value={config.position}
                onValueChange={(value) => setConfig({ ...config, position: value })}
              >
                <SelectTrigger id="position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                  <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Code Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Código de Integração</span>
              <Button onClick={copyToClipboard} size="sm" variant="outline">
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                {generateCode()}
              </pre>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Instruções:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Copie o código acima</li>
                <li>Cole antes da tag {`</body>`} no seu site</li>
                <li>O widget aparecerá automaticamente</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-8 h-96 relative">
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Code className="h-12 w-12 mx-auto mb-2" />
                <p>Abra a página de demo para ver o widget em ação</p>
                <Button asChild className="mt-4">
                  <a href="/widget/demo" target="_blank">
                    Abrir Demo
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
