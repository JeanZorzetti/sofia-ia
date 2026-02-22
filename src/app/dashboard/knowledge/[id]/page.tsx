'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  FileText,
  Loader2,
  Trash2,
  Eye,
  Database,
  Search,
  Layers,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Hash,
  Sparkles,
  RefreshCw,
  Copy,
  BookOpen,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

interface Chunk {
  id: string
  chunkIndex: number
  text: string
  tokens: number
  document: {
    id: string
    title: string
    fileType: string | null
  }
  // For semantic search results
  similarity?: number
  combinedScore?: number
  metadata?: any
}

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

interface ChunkStats {
  totalDocuments: number
  totalChunks: number
  totalTokens: number
  avgTokensPerChunk: number
}

export default function KnowledgeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)

  // Chunks state
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [chunkStats, setChunkStats] = useState<ChunkStats | null>(null)
  const [chunksLoading, setChunksLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'list' | 'semantic_search'>('list')
  const [chunkPage, setChunkPage] = useState(1)
  const [chunkTotalPages, setChunkTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState('documents')

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

  const fetchChunks = useCallback(async (query?: string, page = 1) => {
    setChunksLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      if (query?.trim()) queryParams.append('query', query.trim())

      const response = await fetch(`/api/knowledge/${params.id}/chunks?${queryParams}`)
      const result = await response.json()

      if (result.success) {
        if (result.mode === 'semantic_search') {
          setChunks(result.results || [])
          setSearchMode('semantic_search')
          setChunkTotalPages(1)
        } else {
          setChunks(result.data || [])
          setSearchMode('list')
          setChunkTotalPages(result.pagination?.totalPages || 1)
          if (result.stats) setChunkStats(result.stats)
        }
      }
    } catch (error) {
      console.error('Error fetching chunks:', error)
      toast.error('Erro ao carregar chunks')
    } finally {
      setChunksLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (activeTab === 'chunks') {
      fetchChunks(undefined, chunkPage)
    }
  }, [activeTab, chunkPage, fetchChunks])

  const handleSemanticSearch = () => {
    setChunkPage(1)
    fetchChunks(searchQuery, 1)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setChunkPage(1)
    fetchChunks(undefined, 1)
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
        toast.success('Documento excluído')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Erro ao excluir documento')
    }
  }

  const copyChunkText = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Texto copiado')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Processado</Badge>
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse">Processando</Badge>
      case 'error':
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Erro</Badge>
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

  const getSimilarityColor = (score: number) => {
    if (score >= 0.85) return 'text-green-400'
    if (score >= 0.70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getSimilarityBar = (score: number) => {
    const pct = Math.round(score * 100)
    const color = score >= 0.85 ? 'bg-green-500' : score >= 0.70 ? 'bg-yellow-500' : 'bg-red-500'
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-medium ${getSimilarityColor(score)}`}>{pct}%</span>
      </div>
    )
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

  const processedDocs = knowledgeBase.documents.filter(d => d.status === 'completed')
  const totalChunksInDocs = processedDocs.reduce((sum, d) => {
    return sum + (Array.isArray(d.chunks) ? d.chunks.length : 0)
  }, 0)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/knowledge')}
          className="mb-4 text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Database className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{knowledgeBase.name}</h1>
              <p className="text-white/60">
                {knowledgeBase.documents.length} documento(s) •
                {totalChunksInDocs} chunks •
                Criado em {formatDate(knowledgeBase.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-blue-400" />
              <div>
                <p className="text-xs text-white/40">Documentos</p>
                <p className="text-xl font-bold text-white">{knowledgeBase.documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Layers className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-xs text-white/40">Chunks</p>
                <p className="text-xl font-bold text-white">{chunkStats?.totalChunks ?? totalChunksInDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Cpu className="h-6 w-6 text-green-400" />
              <div>
                <p className="text-xs text-white/40">Tokens totais</p>
                <p className="text-xl font-bold text-white">
                  {(chunkStats?.totalTokens ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-yellow-400" />
              <div>
                <p className="text-xs text-white/40">Média tokens/chunk</p>
                <p className="text-xl font-bold text-white">
                  {chunkStats?.avgTokensPerChunk ?? '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Documents + Chunks */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documentos ({knowledgeBase.documents.length})
          </TabsTrigger>
          <TabsTrigger value="chunks" className="gap-2">
            <Layers className="h-4 w-4" />
            Preview de Chunks
          </TabsTrigger>
        </TabsList>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Document List */}
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
                          className={`p-4 cursor-pointer transition-colors ${selectedDocument?.id === doc.id
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDocument(doc.id)
                              }}
                              className="h-6 w-6 p-0 text-white/40 hover:text-red-400 flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(doc.status)}
                            {doc.fileType && (
                              <Badge variant="outline" className="text-xs">{doc.fileType.toUpperCase()}</Badge>
                            )}
                            {Array.isArray(doc.chunks) && doc.chunks.length > 0 && (
                              <Badge variant="outline" className="text-xs text-purple-300 border-purple-500/30">
                                <Layers className="w-2.5 h-2.5 mr-1" />
                                {doc.chunks.length} chunks
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Document Preview */}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(selectedDocument.status)}
                          {selectedDocument.fileType && (
                            <Badge variant="outline">{selectedDocument.fileType.toUpperCase()}</Badge>
                          )}
                          {Array.isArray(selectedDocument.chunks) && (
                            <Badge variant="outline" className="text-purple-300 border-purple-500/30">
                              <Layers className="w-3 h-3 mr-1" />
                              {selectedDocument.chunks.length} chunks vetorizados
                            </Badge>
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

                    <Tabs defaultValue="content">
                      <TabsList className="bg-white/5 border border-white/10">
                        <TabsTrigger value="content">Conteúdo</TabsTrigger>
                        <TabsTrigger value="chunks" disabled={!Array.isArray(selectedDocument.chunks) || selectedDocument.chunks.length === 0}>
                          Chunks ({Array.isArray(selectedDocument.chunks) ? selectedDocument.chunks.length : 0})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="content">
                        <ScrollArea className="h-[350px] rounded-lg bg-white/5 p-4 mt-2">
                          <p className="text-white/80 text-sm whitespace-pre-wrap">{selectedDocument.content}</p>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="chunks">
                        <ScrollArea className="h-[350px] mt-2">
                          <div className="space-y-2 pr-2">
                            {Array.isArray(selectedDocument.chunks) && selectedDocument.chunks.map((chunk: any, idx: number) => (
                              <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10 group">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-white/40">
                                      <Hash className="inline w-3 h-3 mr-0.5" />{(chunk.index ?? idx) + 1}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-500/30">
                                      ~{chunk.tokens} tokens
                                    </Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => copyChunkText(chunk.text)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                                <p className="text-xs text-white/60 line-clamp-4">{chunk.text}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CHUNKS TAB */}
        <TabsContent value="chunks">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-400" />
                  Preview de Chunks Vetorizados
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchChunks(undefined, 1)}
                  className="gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Atualizar
                </Button>
              </div>

              {/* Semantic Search */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Busca Semântica — teste a relevância dos chunks com uma query real
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      placeholder="Ex: Como funciona o sistema de pagamentos?"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                      className="pl-9 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <Button onClick={handleSemanticSearch} disabled={!searchQuery.trim() || chunksLoading}>
                    {chunksLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                  </Button>
                  {searchMode === 'semantic_search' && (
                    <Button variant="outline" onClick={handleClearSearch}>
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              {/* Mode indicator */}
              {searchMode === 'semantic_search' ? (
                <div className="mt-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <p className="text-xs text-purple-300">
                    Mostrando {chunks.length} chunks mais relevantes para &ldquo;{searchQuery}&rdquo; (busca híbrida vetorial + texto)
                  </p>
                </div>
              ) : chunkStats && (
                <div className="mt-2 grid grid-cols-4 gap-3">
                  {[
                    { label: 'Documentos', value: chunkStats.totalDocuments },
                    { label: 'Chunks', value: chunkStats.totalChunks },
                    { label: 'Tokens', value: chunkStats.totalTokens.toLocaleString() },
                    { label: 'Média tokens', value: chunkStats.avgTokensPerChunk }
                  ].map((stat) => (
                    <div key={stat.label} className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-lg font-bold text-white">{stat.value}</p>
                      <p className="text-[10px] text-white/40">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent>
              {chunksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                </div>
              ) : chunks.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 mb-2">
                    {searchMode === 'semantic_search'
                      ? 'Nenhum chunk relevante encontrado para esta query'
                      : 'Nenhum chunk vetorizado ainda'}
                  </p>
                  {searchMode !== 'semantic_search' && (
                    <p className="text-white/40 text-sm">
                      Adicione documentos e aguarde o processamento dos embeddings
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {chunks.map((chunk, idx) => (
                    <div
                      key={chunk.id || idx}
                      className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-white/40">
                            <Hash className="inline w-3 h-3 mr-0.5" />{chunk.chunkIndex + 1}
                          </span>
                          <Badge variant="outline" className="text-[10px] text-blue-300 border-blue-500/30">
                            {chunk.document.title}
                          </Badge>
                          {chunk.document.fileType && (
                            <Badge variant="outline" className="text-[10px]">
                              {chunk.document.fileType.toUpperCase()}
                            </Badge>
                          )}
                          {chunk.tokens > 0 && (
                            <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-500/30">
                              ~{chunk.tokens} tokens
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => copyChunkText(chunk.text)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Similarity bar for semantic search */}
                      {searchMode === 'semantic_search' && chunk.similarity !== undefined && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
                            <span>Similaridade semântica</span>
                            {chunk.combinedScore !== undefined && (
                              <span>Score combinado: {(chunk.combinedScore * 100).toFixed(1)}%</span>
                            )}
                          </div>
                          {getSimilarityBar(chunk.similarity)}
                        </div>
                      )}

                      {/* Chunk text */}
                      <div className="bg-black/20 rounded-md p-3 border border-white/5">
                        <p className="text-sm text-white/70 whitespace-pre-wrap line-clamp-6">
                          {chunk.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination (only in list mode) */}
              {searchMode === 'list' && chunkTotalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setChunkPage(p => Math.max(1, p - 1))}
                    disabled={chunkPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-white/60">
                    Página {chunkPage} de {chunkTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setChunkPage(p => Math.min(chunkTotalPages, p + 1))}
                    disabled={chunkPage === chunkTotalPages}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
