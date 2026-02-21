'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PredictiveWorkflowBuilder } from '@/components/orchestrations/predictive/predictive-workflow-builder'
import { ArrowLeft, Save, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface NodeData {
  id: string
  type: 'trigger' | 'action' | 'condition'
  label: string
  icon: string
  position: { x: number; y: number }
  config: any
}

interface Connection {
  from: string
  to: string
}

export default function WorkflowBuilderPage() {
  const router = useRouter()
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [nodes, setNodes] = useState<NodeData[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [saving, setSaving] = useState<boolean>(false)

  const handleCanvasChange = (newNodes: NodeData[], newConnections: Connection[]) => {
    setNodes(newNodes)
    setConnections(newConnections)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome do workflow é obrigatório')
      return
    }

    if (nodes.length === 0) {
      toast.error('Adicione pelo menos um nó ao workflow')
      return
    }

    // Convert canvas nodes to workflow format
    const trigger = nodes.find(n => n.type === 'trigger')
    const actions = nodes.filter(n => n.type === 'action').map(n => ({
      type: n.icon,
      config: n.config
    }))
    const conditions = nodes.filter(n => n.type === 'condition').map(n => ({
      type: n.icon,
      config: n.config
    }))

    if (!trigger) {
      toast.error('O workflow precisa de pelo menos um trigger')
      return
    }

    const workflowData = {
      name,
      description,
      trigger: {
        type: trigger.icon,
        config: trigger.config
      },
      actions,
      conditions,
      status: 'inactive',
      metadata: {
        canvas: {
          nodes,
          connections
        }
      }
    }

    setSaving(true)
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Workflow criado com sucesso!')
        router.push(`/dashboard/workflows/${data.data.id}`)
      } else {
        toast.error(data.error || 'Erro ao criar workflow')
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
      toast.error('Erro ao salvar workflow')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/dashboard/workflows')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-yellow-400" />
              Visual Workflow Builder (Sugestões Preditivas)
            </h1>
            <p className="text-white/60 mt-1">
              Arraste e conecte nós para criar seu workflow com sugestões inteligentes
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Workflow'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white">Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Nome do Workflow
              </label>
              <Input
                placeholder="Ex: Qualificação de Leads"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Descrição
              </label>
              <Textarea
                placeholder="Descreva o que este workflow faz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/20 text-white min-h-[100px]"
              />
            </div>

            <div className="pt-4 border-t border-white/20">
              <h3 className="text-sm font-semibold text-white mb-3">
                Como usar:
              </h3>
              <ul className="text-sm text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">→</span>
                  <span>Clique com botão direito no canvas para adicionar nós</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">→</span>
                  <span>Arraste os nós para posicioná-los</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">→</span>
                  <span>Use 'Conectar' para ligar nós</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">→</span>
                  <span>Verde = Triggers, Azul = Ações, Amarelo = Condições</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">→</span>
                  <span>Panel direito mostra sugestões preditivas</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-white/20">
              <h3 className="text-sm font-semibold text-white mb-2">
                Estatísticas:
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Total de Nós:</span>
                  <span className="text-white font-medium">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Triggers:</span>
                  <span className="text-green-400 font-medium">
                    {nodes.filter(n => n.type === 'trigger').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Ações:</span>
                  <span className="text-blue-400 font-medium">
                    {nodes.filter(n => n.type === 'action').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Condições:</span>
                  <span className="text-yellow-400 font-medium">
                    {nodes.filter(n => n.type === 'condition').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Conexões:</span>
                  <span className="text-purple-400 font-medium">
                    {connections.length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Canvas do Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <PredictiveWorkflowBuilder
              initialNodes={nodes}
              initialConnections={connections}
              onChange={handleCanvasChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
