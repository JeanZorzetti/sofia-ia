'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, FileText, Loader2, Trash2, Eye, Database } from 'lucide-react'

interface Document {
  id: string
  title: string
  content: string
  sourceUrl: string | null
  fileType: string | null
  chunks: any
  status: string
  createdAt: string
}

interface KnowledgeBase {
  id: string
  name: string
  agentId: string | null
  type: string
  config: any
  createdAt: string
  documents: Document[]
}

export default function KnowledgeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchKnowledgeBase()
    }
  }, [params.id])

  const fetchKnowledgeBase = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/knowledge/${params.id}`)
      const result = await response.json()

      if (result.knowledgeBase) {
        setKnowledgeBase(result.knowledgeBase)
      }
    } catch (error) {
      console.error('Error fetching knowledge base:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return

    try {
      const response = await fetch(`/api/knowledge/${params.id}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchKnowledgeBase()
        if (selectedDocument?.id === documentId) {
          setSelectedDocument(null)
        }
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Processado</Badge>
      case 'processing':
        return <Badge variant="secondary">Processando</Badge>
      case 'error':
        return <Badge variant="destructive">Erro</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    )
  }

  if (!knowledgeBase) {
    return (
      <div className="p-8">
        <p className="text-white/60">Base de conhecimento não encontrada</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/knowledge')}
          className="mb-4 text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <Database className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{knowledgeBase.name}</h1>
            <p className="text-white/60">
              {knowledgeBase.documents.length} documento(s) • Criado em {formatDate(knowledgeBase.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de documentos */}
        <Card className="glass-card border-white/10 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white text-lg">Documentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {knowledgeBase.documents.length === 0 ? (
                <div className="p-6 text-center text-white/40">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-white/20" />
                  <p>Nenhum documento</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {knowledgeBase.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedDocument?.id === doc.id
                          ? 'bg-white/10'
                          : 'hover:bg-white/5'
                      }`}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          <FileText className="w-4 h-4 text-white/40 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{doc.title}</p>
                            <p className="text-white/40 text-xs mt-1">{formatDate(doc.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        {doc.fileType && (
                          <Badge variant="outline" className="text-xs">{doc.fileType}</Badge>
                        )}
                      </div>
                      {Array.isArray(doc.chunks) && doc.chunks.length > 0 && (
                        <p className="text-xs text-white/40 mt-2">{doc.chunks.length} chunks</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Preview do documento */}
        <Card className="glass-card border-white/10 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">
                {selectedDocument ? 'Preview do Documento' : 'Selecione um Documento'}
              </CardTitle>
              {selectedDocument && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteDocument(selectedDocument.id)}
                  className="text-white/60 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDocument ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/40">
                <Eye className="w-12 h-12 mb-4 text-white/20" />
                <p>Selecione um documento para visualizar</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{selectedDocument.title}</h3>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedDocument.status)}
                      {selectedDocument.fileType && (
                        <Badge variant="outline">{selectedDocument.fileType}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedDocument.sourceUrl && (
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-white/40 mb-1">Fonte:</p>
                    <a
                      href={selectedDocument.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline break-all"
                    >
                      {selectedDocument.sourceUrl}
                    </a>
                  </div>
                )}

                <div>
                  <p className="text-sm text-white/40 mb-2">Conteúdo:</p>
                  <ScrollArea className="h-[400px] rounded-lg bg-white/5 p-4">
                    <p className="text-white/80 text-sm whitespace-pre-wrap">{selectedDocument.content}</p>
                  </ScrollArea>
                </div>

                {Array.isArray(selectedDocument.chunks) && selectedDocument.chunks.length > 0 && (
                  <div>
                    <p className="text-sm text-white/40 mb-2">Chunks ({selectedDocument.chunks.length}):</p>
                    <ScrollArea className="h-[200px] rounded-lg bg-white/5 p-4">
                      <div className="space-y-2">
                        {selectedDocument.chunks.map((chunk: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white/5 rounded border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-white/40">Chunk {chunk.index + 1}</span>
                              <Badge variant="outline" className="text-xs">~{chunk.tokens} tokens</Badge>
                            </div>
                            <p className="text-xs text-white/60 line-clamp-3">{chunk.text}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
