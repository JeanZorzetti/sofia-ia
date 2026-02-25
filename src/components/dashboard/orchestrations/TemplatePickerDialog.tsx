'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Sparkles } from 'lucide-react'
import { TemplateCard } from './TemplateCard'

interface TemplateInfo {
  id: string
  name: string
  description: string
  category: string
  icon: string
  strategy: string
  agentCount: number
  agentRoles: string[]
  exampleInput: string
  expectedOutput: string
  estimatedDuration: string
  tags: string[]
}

interface TemplatePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: TemplateInfo[]
  creatingFromTemplate: string | null
  onCreateFromTemplate: (id: string) => void
}

export function TemplatePickerDialog({
  open,
  onOpenChange,
  templates,
  creatingFromTemplate,
  onCreateFromTemplate,
}: TemplatePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            Templates de Orquestração
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Escolha um template pré-configurado para começar rapidamente
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onCreateFromTemplate}
              isCreating={creatingFromTemplate === template.id}
              detailed
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
