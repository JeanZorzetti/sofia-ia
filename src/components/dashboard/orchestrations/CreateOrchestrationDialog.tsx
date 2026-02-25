'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string | null
}

interface AgentStep {
  agentId: string
  role: string
  prompt?: string
}

interface OrchestrationForm {
  name: string
  description: string
  strategy: string
  agentSteps: AgentStep[]
}

interface CreateOrchestrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: Agent[]
  form: OrchestrationForm
  onFormChange: (form: OrchestrationForm) => void
  onSubmit: () => void
}

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  sequential: 'Agentes executam em ordem, cada um recebe a saída do anterior',
  parallel: 'Todos os agentes executam simultaneamente com a mesma entrada',
  consensus: 'Agentes votam e a resposta mais comum é escolhida',
}

export function CreateOrchestrationDialog({
  open,
  onOpenChange,
  agents,
  form,
  onFormChange,
  onSubmit,
}: CreateOrchestrationDialogProps) {
  const addAgentStep = () => {
    onFormChange({
      ...form,
      agentSteps: [...form.agentSteps, { agentId: '', role: '' }],
    })
  }

  const updateAgentStep = (index: number, field: string, value: string) => {
    const updatedSteps = [...form.agentSteps]
    updatedSteps[index] = { ...updatedSteps[index], [field]: value }
    onFormChange({ ...form, agentSteps: updatedSteps })
  }

  const removeAgentStep = (index: number) => {
    onFormChange({
      ...form,
      agentSteps: form.agentSteps.filter((_, i) => i !== index),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Orquestração Multi-Agent</DialogTitle>
          <DialogDescription className="text-white/60">
            Configure múltiplos agentes para trabalharem juntos
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="orch-name">Nome</Label>
            <Input
              id="orch-name"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Ex: Processamento de Dados Complexos"
            />
          </div>

          <div>
            <Label htmlFor="orch-desc">Descrição</Label>
            <Textarea
              id="orch-desc"
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Descreva o objetivo desta orquestração..."
            />
          </div>

          <div>
            <Label htmlFor="orch-strategy">Estratégia</Label>
            <Select
              value={form.strategy}
              onValueChange={(value) => onFormChange({ ...form, strategy: value })}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="sequential">Sequencial</SelectItem>
                <SelectItem value="parallel">Paralelo</SelectItem>
                <SelectItem value="consensus">Consenso</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/40 mt-1">
              {STRATEGY_DESCRIPTIONS[form.strategy] ?? ''}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Agentes</Label>
              <Button size="sm" variant="outline" onClick={addAgentStep}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Agente
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {form.agentSteps.map((step, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-white/60">#{index + 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAgentStep(index)}
                      className="ml-auto h-6 px-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Agente</Label>
                      <Select
                        value={step.agentId}
                        onValueChange={(value) => updateAgentStep(index, 'agentId', value)}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Papel</Label>
                      <Input
                        value={step.role}
                        onChange={(e) => updateAgentStep(index, 'role', e.target.value)}
                        className="bg-white/5 border-white/10 text-white h-8 text-xs"
                        placeholder="Ex: Pesquisador"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {form.agentSteps.length === 0 && (
                <div className="text-center py-6 text-white/40 text-sm">
                  Nenhum agente adicionado ainda
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit}>Criar Orquestração</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
