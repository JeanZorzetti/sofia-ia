'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Database, FileText, Loader2, Settings, Trash2 } from 'lucide-react'
import { useKnowledge, type KnowledgeBase } from '@/components/dashboard/kb/useKnowledge'
import { CreateKnowledgeBaseDialog } from '@/components/dashboard/kb/CreateKnowledgeBaseDialog'
import { AddDocumentDialog } from '@/components/dashboard/kb/AddDocumentDialog'

function getStatusBadge(kb: KnowledgeBase) {
  if (kb.errorCount > 0) return <Badge variant="destructive">{kb.errorCount} com erro</Badge>
  if (kb.processingCount > 0) return <Badge variant="secondary">{kb.processingCount} processando</Badge>
  if (kb.processedCount > 0) return <Badge variant="default">{kb.processedCount} prontos</Badge>
  return <Badge variant="outline">Vazio</Badge>
}

export default function KnowledgePage() {
  const router = useRouter()
  const { knowledgeBases, agents, loading, fetchKnowledgeBases, handleDeleteKnowledgeBase, getAgentName } = useKnowledge()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [addDocumentDialogOpen, setAddDocumentDialogOpen] = useState(false)
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Knowledge Base</h1>
          <p className="text-white/60">Gerencie bases de conhecimento para seus agentes de IA</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Nova Base
        </Button>
      </div>

      {/* Content */}
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
                      setSelectedKBId(kb.id)
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
                      {kb.documents.slice(0, 3).map((doc) => (
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

      {/* Dialogs */}
      <CreateKnowledgeBaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        agents={agents}
        onSuccess={fetchKnowledgeBases}
      />
      <AddDocumentDialog
        open={addDocumentDialogOpen}
        onOpenChange={setAddDocumentDialogOpen}
        selectedKBId={selectedKBId}
        onSuccess={fetchKnowledgeBases}
      />
    </div>
  )
}
