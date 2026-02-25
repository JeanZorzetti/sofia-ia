'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const FOLDER_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
]

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  color: string
  onNameChange: (name: string) => void
  onColorChange: (color: string) => void
  onSubmit: () => void
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
}: CreateFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-[#0a0a0b] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Criar Pasta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-white">Nome</Label>
            <Input
              placeholder="Ex: Suporte, Vendas..."
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onColorChange(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white/50' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button onClick={onSubmit} className="w-full" disabled={!name.trim()}>
            Criar Pasta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
