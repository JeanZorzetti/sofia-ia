'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface Agent {
  id: string
  name: string
}

interface CreateKnowledgeBaseDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  agents: Agent[]
  onSuccess: () => void
}

export function CreateKnowledgeBaseDialog({
  open,
  onOpenChange,
  agents,
  onSuccess,
}: CreateKnowledgeBaseDialogProps) {
  const [formData, setFormData] = useState({ name: '', agentId: '', type: 'general' })
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    try {
      setIsCreating(true)
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          agentId: formData.agentId || null,
          type: formData.type,
          config: {},
        }),
      })
      if (response.ok) {
        onOpenChange(false)
        setFormData({ name: '', agentId: '', type: 'general' })
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating knowledge base:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Criar Base de Conhecimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="kb-name">Nome</Label>
            <Input
              id="kb-name"
              placeholder="Ex: Base de Conhecimento Principal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kb-agent">Agente (opcional)</Label>
            <select
              id="kb-agent"
              value={formData.agentId}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white"
            >
              <option value="">Nenhum agente</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kb-type">Tipo</Label>
            <select
              id="kb-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white"
            >
              <option value="general">Geral</option>
              <option value="faq">FAQ</option>
              <option value="documentation">Documentação</option>
              <option value="products">Produtos/Serviços</option>
            </select>
          </div>

          <Button onClick={handleCreate} className="w-full" disabled={isCreating || !formData.name.trim()}>
            {isCreating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</>
            ) : (
              'Criar Base'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
