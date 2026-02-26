'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Loader2, Trash2, Upload, Link as LinkIcon, Type } from 'lucide-react'

interface AddDocumentDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  selectedKBId: string | null
  onSuccess: () => void
}

export function AddDocumentDialog({
  open,
  onOpenChange,
  selectedKBId,
  onSuccess,
}: AddDocumentDialogProps) {
  const [documentType, setDocumentType] = useState<'text' | 'url' | 'file'>('text')
  const [formData, setFormData] = useState({ title: '', content: '', sourceUrl: '' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const reset = () => {
    setDocumentType('text')
    setFormData({ title: '', content: '', sourceUrl: '' })
    setUploadFile(null)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setUploadFile(file)
      setDocumentType('file')
      if (!formData.title) setFormData((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      if (!formData.title) setFormData((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }))
    }
  }

  const handleAdd = async () => {
    if (!selectedKBId) return
    try {
      setUploading(true)

      if (documentType === 'file' && uploadFile) {
        const fd = new FormData()
        fd.append('file', uploadFile)
        fd.append('title', formData.title || uploadFile.name)
        const res = await fetch(`/api/knowledge/${selectedKBId}/documents/upload`, {
          method: 'POST',
          body: fd,
        })
        if (res.ok) {
          onOpenChange(false)
          reset()
          onSuccess()
        } else {
          const err = await res.json()
          alert(err.error || 'Erro ao fazer upload')
        }
      } else {
        const payload: Record<string, string> = { title: formData.title, sourceType: documentType }
        if (documentType === 'text') {
          payload.content = formData.content
          payload.fileType = 'text'
        } else if (documentType === 'url') {
          payload.sourceUrl = formData.sourceUrl
          payload.content = ''
          payload.fileType = 'url'
        }
        const res = await fetch(`/api/knowledge/${selectedKBId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          onOpenChange(false)
          reset()
          onSuccess()
        }
      }
    } catch (error) {
      console.error('Error adding document:', error)
    } finally {
      setUploading(false)
    }
  }

  const isDisabled =
    uploading ||
    (documentType === 'text' && (!formData.title || !formData.content)) ||
    (documentType === 'url' && (!formData.title || !formData.sourceUrl)) ||
    (documentType === 'file' && !uploadFile)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Adicionar Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {([
              { type: 'text', icon: Type, label: 'Texto' },
              { type: 'url', icon: LinkIcon, label: 'URL' },
              { type: 'file', icon: Upload, label: 'Arquivo' },
            ] as const).map(({ type, icon: Icon, label }) => (
              <Button
                key={type}
                variant={documentType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDocumentType(type)}
                className="flex-1"
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-title">Título</Label>
            <Input
              id="doc-title"
              placeholder="Ex: Política de Preços 2024"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          {documentType === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="doc-content">Conteúdo</Label>
              <Textarea
                id="doc-content"
                placeholder="Digite ou cole o conteúdo do documento..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="bg-white/5 border-white/10 text-white min-h-[200px]"
              />
            </div>
          )}

          {documentType === 'url' && (
            <div className="space-y-2">
              <Label htmlFor="doc-url">URL</Label>
              <Input
                id="doc-url"
                type="url"
                placeholder="https://exemplo.com/documento"
                value={formData.sourceUrl}
                onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-white/40">O conteúdo será extraído automaticamente da URL</p>
            </div>
          )}

          {documentType === 'file' && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-blue-400 bg-blue-400/10' : 'border-white/20 hover:border-white/40'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
            >
              <input
                type="file"
                accept=".txt,.md,.csv,.json,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {uploadFile ? (
                <div>
                  <FileText className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-white font-medium">{uploadFile.name}</p>
                  <p className="text-white/40 text-xs mt-1">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-white/40 hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null) }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Remover
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-blue-400' : 'text-white/40'}`} />
                  <p className="text-white/60">
                    {isDragging ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
                  </p>
                  <p className="text-white/30 text-xs mt-2">
                    Formatos: TXT, MD, CSV, JSON, PDF, DOC, DOCX (max 10MB)
                  </p>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleAdd} className="w-full" disabled={isDisabled}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
            ) : (
              'Adicionar Documento'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
