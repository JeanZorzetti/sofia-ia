'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MessageSquare, Globe, Mail } from 'lucide-react'

export interface AgentFormData {
  name: string
  description: string
  systemPrompt: string
  model: string
  temperature: number
  channels: { whatsapp: boolean; webchat: boolean; email: boolean }
}

interface CreateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: AgentFormData
  onChange: (data: AgentFormData) => void
  onSubmit: () => void
}

const CHANNELS = [
  { key: 'whatsapp' as const, label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4 text-green-400" /> },
  { key: 'webchat' as const, label: 'Web Chat', icon: <Globe className="h-4 w-4 text-blue-400" /> },
  { key: 'email' as const, label: 'Email', icon: <Mail className="h-4 w-4 text-purple-400" /> },
]

export function CreateAgentDialog({
  open,
  onOpenChange,
  formData,
  onChange,
  onSubmit,
}: CreateAgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#0a0a0b] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Criar Novo Agente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-white">Nome do Agente</Label>
            <Input
              placeholder="Ex: Assistente de Vendas"
              value={formData.name}
              onChange={(e) => onChange({ ...formData, name: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Descrição</Label>
            <Textarea
              placeholder="Descreva o propósito deste agente..."
              value={formData.description}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              className="bg-white/5 border-white/10 text-white min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Instruções do Sistema</Label>
            <Textarea
              placeholder="Você é um assistente que..."
              value={formData.systemPrompt}
              onChange={(e) => onChange({ ...formData, systemPrompt: e.target.value })}
              className="bg-white/5 border-white/10 text-white min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Canais</Label>
            <div className="space-y-2">
              {CHANNELS.map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    {icon}
                    <span className="text-white">{label}</span>
                  </div>
                  <Switch
                    checked={formData.channels[key]}
                    onCheckedChange={(checked) =>
                      onChange({ ...formData, channels: { ...formData.channels, [key]: checked } })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <Button
            onClick={onSubmit}
            className="w-full"
            disabled={!formData.name || !formData.systemPrompt}
          >
            Criar Agente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
