'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select } from '@/components/ui/select'
import {
  Search,
  Send,
  User,
  Bot,
  Check,
  CheckCheck,
  Clock,
  X,
  Tag,
  UserCheck,
  Loader2,
  Filter,
} from 'lucide-react'

interface Lead {
  id: string
  nome: string
  telefone: string
  email: string | null
  status: string
  score: number
  interesse?: string
  valorMin?: number
  valorMax?: number
  regiao?: string
  tipoImovel?: string
}

interface Message {
  id: string
  sender: string
  content: string
  sentAt: string
  isAiGenerated: boolean
  aiModel?: string
  messageType: string
}

interface Conversation {
  id: string
  status: string
  channel: string
  handledBy: string
  tags: string[]
  notes: string | null
  unreadCount: number
  lastMessageAt: string
  messageCount: number
  lead: Lead
  messages: Message[]
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [statusFilter, channelFilter, searchTerm])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (channelFilter !== 'all') params.append('channel', channelFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/conversations?${params}`)
      const result = await response.json()

      if (result.conversations) {
        setConversations(result.conversations)
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      const result = await response.json()

      if (result.messages) {
        setMessages(result.messages)
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return

    try {
      setSendingMessage(true)
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: messageInput,
            messageType: 'text',
          }),
        }
      )

      const newMessage = await response.json()

      if (newMessage.id) {
        setMessages([...messages, newMessage])
        setMessageInput('')
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleTakeover = async (action: 'takeover' | 'release') => {
    if (!selectedConversation) return

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/takeover`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      )

      const result = await response.json()

      if (result.success) {
        setSelectedConversation({
          ...selectedConversation,
          handledBy: result.handledBy,
        })
        fetchConversations()
      }
    } catch (error) {
      console.error('Erro ao realizar takeover:', error)
    }
  }

  const handleCloseConversation = async () => {
    if (!selectedConversation) return

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/close`,
        {
          method: 'POST',
        }
      )

      const result = await response.json()

      if (result.success) {
        setSelectedConversation(null)
        fetchConversations()
      }
    } catch (error) {
      console.error('Erro ao encerrar conversa:', error)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400'
      case 'waiting':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'closed':
        return 'bg-gray-500/20 text-gray-400'
      default:
        return 'bg-blue-500/20 text-blue-400'
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return '💬'
      case 'webchat':
        return '🌐'
      case 'email':
        return '📧'
      default:
        return '💬'
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-6">
      {/* Coluna 1: Lista de Conversas */}
      <div className="flex w-80 flex-col gap-4">
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Buscar por nome, telefone..."
                className="bg-white/5 pl-9 text-white placeholder:text-white/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60">Status</label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="active">Ativas</option>
                <option value="waiting">Aguardando</option>
                <option value="closed">Encerradas</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60">Canal</label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="webchat">Webchat</option>
                <option value="email">Email</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card flex-1 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">
              Conversas ({conversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-24rem)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-white/40" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-white/40">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full rounded-lg p-3 text-left transition-colors ${
                        selectedConversation?.id === conv.id
                          ? 'bg-white/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                          {conv.lead.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white">
                              {conv.lead.nome}
                            </span>
                            <span className="text-xs text-white/40">
                              {formatTimestamp(conv.lastMessageAt)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs">{getChannelIcon(conv.channel)}</span>
                            <span className="truncate text-xs text-white/60">
                              {conv.messages[0]?.content || 'Sem mensagens'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge
                              className={`text-xs ${getStatusBadgeColor(conv.status)}`}
                            >
                              {conv.status}
                            </Badge>
                            {conv.unreadCount > 0 && (
                              <Badge className="bg-red-500/20 text-xs text-red-400">
                                {conv.unreadCount}
                              </Badge>
                            )}
                            {conv.handledBy === 'human' && (
                              <Badge className="bg-blue-500/20 text-xs text-blue-400">
                                <UserCheck className="mr-1 h-3 w-3" />
                                Humano
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Coluna 2: Área de Chat */}
      {selectedConversation ? (
        <Card className="glass-card flex flex-1 flex-col border-white/10">
          <CardHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                  {selectedConversation.lead.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedConversation.lead.nome}
                  </h3>
                  <p className="text-xs text-white/60">
                    {selectedConversation.lead.telefone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversation.handledBy === 'ai' ? (
                  <Button
                    onClick={() => handleTakeover('takeover')}
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Assumir Conversa
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleTakeover('release')}
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    Devolver para IA
                  </Button>
                )}
                <Button
                  onClick={handleCloseConversation}
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <X className="mr-2 h-4 w-4" />
                  Encerrar
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === 'user' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.sender === 'user'
                          ? 'bg-white/10 text-white'
                          : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {msg.sender === 'user' ? (
                          <User className="h-3 w-3" />
                        ) : msg.isAiGenerated ? (
                          <Bot className="h-3 w-3" />
                        ) : (
                          <UserCheck className="h-3 w-3" />
                        )}
                        <span className="text-xs opacity-80">
                          {msg.sender === 'user'
                            ? selectedConversation.lead.nome
                            : msg.isAiGenerated
                            ? 'IA'
                            : 'Humano'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{msg.content}</p>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <span className="text-xs opacity-60">
                          {formatTimestamp(msg.sentAt)}
                        </span>
                        {msg.sender === 'assistant' && (
                          <CheckCheck className="h-3 w-3 opacity-60" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  className="resize-none bg-white/5 text-white placeholder:text-white/40"
                  rows={2}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={
                    sendingMessage || selectedConversation.status === 'closed'
                  }
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    !messageInput.trim() ||
                    sendingMessage ||
                    selectedConversation.status === 'closed'
                  }
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {selectedConversation.status === 'closed' && (
                <p className="mt-2 text-xs text-yellow-400">
                  Esta conversa foi encerrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card flex flex-1 items-center justify-center border-white/10">
          <div className="text-center">
            <div className="mb-4 text-6xl opacity-20">💬</div>
            <p className="text-lg text-white/60">
              Selecione uma conversa para começar
            </p>
          </div>
        </Card>
      )}

      {/* Coluna 3: Detalhes do Lead */}
      {selectedConversation && (
        <div className="flex w-80 flex-col gap-4">
          <Card className="glass-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white">Detalhes do Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-white/60">Nome</label>
                <p className="text-sm text-white">
                  {selectedConversation.lead.nome}
                </p>
              </div>
              <div>
                <label className="text-xs text-white/60">Telefone</label>
                <p className="text-sm text-white">
                  {selectedConversation.lead.telefone}
                </p>
              </div>
              {selectedConversation.lead.email && (
                <div>
                  <label className="text-xs text-white/60">Email</label>
                  <p className="text-sm text-white">
                    {selectedConversation.lead.email}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-white/60">Status</label>
                <Badge
                  className={`mt-1 ${getStatusBadgeColor(
                    selectedConversation.lead.status
                  )}`}
                >
                  {selectedConversation.lead.status}
                </Badge>
              </div>
              <div>
                <label className="text-xs text-white/60">Score</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                      style={{ width: `${selectedConversation.lead.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {selectedConversation.lead.score}
                  </span>
                </div>
              </div>
              {selectedConversation.lead.interesse && (
                <div>
                  <label className="text-xs text-white/60">Interesse</label>
                  <p className="text-sm text-white">
                    {selectedConversation.lead.interesse}
                  </p>
                </div>
              )}
              {selectedConversation.lead.tipoImovel && (
                <div>
                  <label className="text-xs text-white/60">Tipo de Imóvel</label>
                  <p className="text-sm text-white">
                    {selectedConversation.lead.tipoImovel}
                  </p>
                </div>
              )}
              {selectedConversation.lead.regiao && (
                <div>
                  <label className="text-xs text-white/60">Região</label>
                  <p className="text-sm text-white">
                    {selectedConversation.lead.regiao}
                  </p>
                </div>
              )}
              {(selectedConversation.lead.valorMin ||
                selectedConversation.lead.valorMax) && (
                <div>
                  <label className="text-xs text-white/60">Faixa de Valor</label>
                  <p className="text-sm text-white">
                    {selectedConversation.lead.valorMin
                      ? `R$ ${selectedConversation.lead.valorMin.toLocaleString()}`
                      : 'N/A'}{' '}
                    -{' '}
                    {selectedConversation.lead.valorMax
                      ? `R$ ${selectedConversation.lead.valorMax.toLocaleString()}`
                      : 'N/A'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedConversation.tags.length === 0 ? (
                  <p className="text-xs text-white/40">Nenhuma tag</p>
                ) : (
                  selectedConversation.tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      className="bg-purple-500/20 text-xs text-purple-400"
                    >
                      {tag}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {selectedConversation.notes && (
            <Card className="glass-card border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Notas Internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/80">
                  {selectedConversation.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
