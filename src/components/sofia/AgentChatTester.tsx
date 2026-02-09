'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Loader2, Bot, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AgentChatTesterProps {
  agentId: string
  agentName: string
}

export function AgentChatTester({ agentId, agentName }: AgentChatTesterProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages([...messages, userMessage])
    setInputValue('')
    setLoading(true)

    try {
      // Formatar mensagens para a API
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          messages: apiMessages,
          leadContext: {
            leadName: 'Teste',
            leadPhone: '5511999999999',
            leadStatus: 'teste'
          }
        })
      })

      const result = await response.json()

      if (result.success && result.data) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.data.content,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        console.error('Error from AI:', result.error)
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Desculpe, não foi possível enviar a mensagem.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearChat = () => {
    setMessages([])
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Testar Agente
        </CardTitle>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearChat}>
            Limpar Chat
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">
                  Envie uma mensagem para testar o agente {agentName}
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-white/10">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || loading}
            className="flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-white/40 text-center">
          Este é um ambiente de teste. As mensagens não serão salvas.
        </p>
      </CardContent>
    </Card>
  )
}
