'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Send, Loader2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatWidgetProps {
  agentId: string
  apiUrl?: string
  primaryColor?: string
  position?: 'bottom-right' | 'bottom-left'
  welcomeMessage?: string
  placeholder?: string
  title?: string
  subtitle?: string
  logo?: string
}

export function ChatWidget({
  agentId,
  apiUrl = '/api/chat/widget',
  primaryColor = '#3b82f6',
  position = 'bottom-right',
  welcomeMessage = 'Olá! Como posso ajudar você hoje?',
  placeholder = 'Digite sua mensagem...',
  title = 'Chat',
  subtitle = 'Estamos online',
  logo,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [sessionId] = useState<string>(() => {
    // Generate unique session ID
    return `widget-${Date.now()}-${Math.random().toString(36).substring(7)}`
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message
      setMessages([
        {
          id: '0',
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }, [isOpen, messages.length, welcomeMessage])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          sessionId,
          message: userMessage.content,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Desculpe, não consegui processar sua mensagem.',
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const positionClasses = position === 'bottom-right'
    ? 'bottom-4 right-4'
    : 'bottom-4 left-4'

  if (!isOpen) {
    return (
      <div className={cn('fixed z-50', positionClasses)}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('fixed z-50', positionClasses)}>
      <div
        className={cn(
          'flex flex-col bg-white rounded-lg shadow-2xl transition-all',
          isMinimized ? 'h-14 w-80' : 'h-[500px] w-80 sm:w-96'
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 rounded-t-lg text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3">
            {logo && (
              <img src={logo} alt="Logo" className="h-8 w-8 rounded-full" />
            )}
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs opacity-90">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg p-3 text-sm',
                      message.role === 'user'
                        ? 'text-white'
                        : 'bg-white text-gray-800 shadow-sm'
                    )}
                    style={
                      message.role === 'user'
                        ? { backgroundColor: primaryColor }
                        : {}
                    }
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white rounded-b-lg">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
