'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, Database, FileText, Loader2, Settings, Trash2, Upload, Link as LinkIcon, Type } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface KnowledgeBase {
  id: string
  name: string
  agentId: string | null
  type: string
  config: any
  createdAt: string
  documentCount: number
  processedCount: number
  processingCount: number
  errorCount: number
  documents: {
    id: string
    title: string
    status: string
    fileType: string | null
    createdAt: string
  }[]
}

interface Agent {
  id: string
  name: string
}

export default function KnowledgePage() {
  const router = useRouter()
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [addDocumentDialogOpen, setAddDocumentDialogOpen] = useState(false)
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<'text' | 'url' | 'file'>('text')

  const [formData, setFormData] = useState({
    name: '',
    agentId: '',
    type: 'general',
  })

  const [documentFormData, setDocumentFormData] = useState({
    title: '',
    content: '',
    sourceUrl: '',
  })

  useEffect(() => {
    fetchKnowledgeBases()
    fetchAgents()
  }, [])

  const fetchKnowledgeBases = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/knowledge')
      const result = await response.json()

      if (result.knowledgeBases) {
        setKnowledgeBases(result.knowledgeBases)
      }
    } catch (error) {
      console.error('Error fetching knowledge bases:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const result = await response.json()

      if (result.success && result.data) {
        setAgents(result.data)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const handleCreateKnowledgeBase = async () => {
    try {
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
        setCreateDialogOpen(false)
        setFormData({ name: '', agentId: '', type: 'general' })
        fetchKnowledgeBases()
      }
    } catch (error) {
      console.error('Error creating knowledge base:', error)
    }
  }

  const handleAddDocument = async () => {
    if (!selectedKnowledgeBaseId) return

    try {
      const payload: any = {
        title: documentFormData.title,
        sourceType: documentType,
      }

      if (documentType === 'text') {
        payload.content = documentFormData.content
        payload.fileType = 'text'
      } else if (documentType === 'url') {
        payload.sourceUrl = documentFormData.sourceUrl
        payload.content = '' // Will be fetched by backend
        payload.fileType = 'url'
      }

      const response = await fetch(`/api/knowledge/${selectedKnowledgeBaseId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setAddDocumentDialogOpen(false)
        setDocumentFormData({ title: '', content: '', sourceUrl: '' })
        fetchKnowledgeBases()
      }
    } catch (error) {
      console.error('Error adding document:', error)
    }
  }

  const handleDeleteKnowledgeBase = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta base de conhecimento?')) return

    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchKnowledgeBases()
      }
    } catch (error) {
      console.error('Error deleting knowledge base:', error)
    }
  }

  const getStatusBadge = (kb: KnowledgeBase) => {
    if (kb.errorCount > 0) {
      return <Badge variant="destructive">{kb.errorCount} com erro</Badge>
    }
    if (kb.processingCount > 0) {
      return <Badge variant="secondary">{kb.processingCount} processando</Badge>
    }
    if (kb.processedCount > 0) {
      return <Badge variant="default">{kb.processedCount} prontos</Badge>
    }
    return <Badge variant="outline">Vazio</Badge>
  }

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Nenhum agente'
    const agent = agents.find(a => a.id === agentId)
    return agent ? agent.name : 'Agente desconhecido'
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Knowledge Base</h1>
          <p className="text-white/60">Gerencie bases de conhecimento para seus agentes de IA</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Base
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Criar Base de Conhecimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Catálogo de Imóveis"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentId">Agente (opcional)</Label>
                <select
                  id="agentId"
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white"
                >
                  <option value="">Nenhum agente</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
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

              <Button onClick={handleCreateKnowledgeBase} className="w-full">
                Criar Base
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      ) : knowledgeBases.length === 0 ? (
        <Card className="glass-card border-white/10">
          <CardContent className="py-12 text-center">
            <Database className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 mb-4">Nenhuma base de conhecimento criada ainda</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Base
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {knowledgeBases.map((kb) => (
            <Card key={kb.id} className="glass-card border-white/10 hover:border-white/20 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Database className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg mb-1">{kb.name}</CardTitle>
                      <p className="text-sm text-white/60">{getAgentName(kb.agentId)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteKnowledgeBase(kb.id)}
                    className="text-white/60 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Documentos</span>
                  <span className="text-sm font-medium text-white">{kb.documentCount}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(kb)}
                  <Badge variant="outline" className="capitalize">{kb.type}</Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedKnowledgeBaseId(kb.id)
                      setAddDocumentDialogOpen(true)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/knowledge/${kb.id}`)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

                {kb.documents.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-white/40 mb-2">Documentos recentes:</p>
                    <div className="space-y-1">
                      {kb.documents.slice(0, 3).map(doc => (
                        <div key={doc.id} className="flex items-center gap-2 text-xs">
                          <FileText className="w-3 h-3 text-white/40" />
                          <span className="text-white/60 truncate flex-1">{doc.title}</span>
                          <Badge
                            variant={doc.status === 'completed' ? 'default' : doc.status === 'processing' ? 'secondary' : 'destructive'}
                            className="text-xs px-1 py-0"
                          >
                            {doc.status === 'completed' ? '✓' : doc.status === 'processing' ? '...' : '✗'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para adicionar documento */}
      <Dialog open={addDocumentDialogOpen} onOpenChange={setAddDocumentDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Seletor de tipo de documento */}
            <div className="flex gap-2">
              <Button
                variant={documentType === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDocumentType('text')}
                className="flex-1"
              >
                <Type className="w-4 h-4 mr-2" />
                Texto
              </Button>
              <Button
                variant={documentType === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDocumentType('url')}
                className="flex-1"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                URL
              </Button>
              <Button
                variant={documentType === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDocumentType('file')}
                className="flex-1"
                disabled
              >
                <Upload className="w-4 h-4 mr-2" />
                Arquivo
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-title">Título</Label>
              <Input
                id="doc-title"
                placeholder="Ex: Política de Preços 2024"
                value={documentFormData.title}
                onChange={(e) => setDocumentFormData({ ...documentFormData, title: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {documentType === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="doc-content">Conteúdo</Label>
                <Textarea
                  id="doc-content"
                  placeholder="Digite ou cole o conteúdo do documento..."
                  value={documentFormData.content}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, content: e.target.value })}
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
                  value={documentFormData.sourceUrl}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, sourceUrl: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-white/40">O conteúdo será extraído automaticamente da URL</p>
              </div>
            )}

            {documentType === 'file' && (
              <div className="py-8 text-center text-white/40">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p>Upload de arquivos em breve</p>
              </div>
            )}

            <Button onClick={handleAddDocument} className="w-full" disabled={!documentFormData.title || (documentType === 'text' && !documentFormData.content) || (documentType === 'url' && !documentFormData.sourceUrl)}>
              Adicionar Documento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
