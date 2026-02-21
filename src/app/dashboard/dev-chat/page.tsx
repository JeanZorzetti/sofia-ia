
'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Code,
    MessageSquare,
    Plus,
    Trash2,
    Terminal,
    Send,
    Loader2,
    Cpu,
    MoreVertical
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface DevSession {
    id: string
    name: string
    agentId: string
    agent: {
        name: string
        model: string
    }
    messages: any[]
    updatedAt: string
}

interface Agent {
    id: string
    name: string
    model: string
}

export default function DevChatPage() {
    const [sessions, setSessions] = useState<DevSession[]>([])
    const [selectedSession, setSelectedSession] = useState<DevSession | null>(null)
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [messageInput, setMessageInput] = useState('')
    const [sending, setSending] = useState(false)
    const [newSessionName, setNewSessionName] = useState('')
    const [selectedAgentId, setSelectedAgentId] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchSessions()
        fetchAgents()
    }, [])

    useEffect(() => {
        if (selectedSession) {
            scrollToBottom()
        }
    }, [selectedSession?.messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/dev-sessions')
            const data = await res.json()
            if (data.success) {
                setSessions(data.sessions)
            }
        } catch (error) {
            console.error('Error fetching sessions:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/agents')
            const data = await res.json()
            if (data.success) {
                setAgents(data.data)
            }
        } catch (error) {
            console.error('Error fetching agents:', error)
        }
    }

    const handleCreateSession = async () => {
        if (!newSessionName.trim() || !selectedAgentId) return

        try {
            const res = await fetch('/api/dev-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newSessionName,
                    agentId: selectedAgentId
                })
            })
            const data = await res.json()
            if (data.success) {
                setSessions([data.session, ...sessions])
                setSelectedSession(data.session)
                setIsCreating(false)
                setNewSessionName('')
                setSelectedAgentId('')
            }
        } catch (error) {
            console.error('Error creating session:', error)
        }
    }

    const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Tem certeza que deseja apagar esta sessão?')) return

        try {
            const res = await fetch(`/api/dev-sessions/${id}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (data.success) {
                setSessions(sessions.filter(s => s.id !== id))
                if (selectedSession?.id === id) {
                    setSelectedSession(null)
                }
            }
        } catch (error) {
            console.error('Error deleting session:', error)
        }
    }

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedSession) return

        const tempMessage = {
            role: 'user',
            content: messageInput,
            timestamp: new Date().toISOString()
        }

        // Optimistic update
        const updatedSession = {
            ...selectedSession,
            messages: [...(selectedSession.messages || []), tempMessage]
        }
        setSelectedSession(updatedSession)
        setSessions(sessions.map(s => s.id === selectedSession.id ? updatedSession : s))
        setMessageInput('')
        setSending(true)

        try {
            const res = await fetch(`/api/dev-sessions/${selectedSession.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: tempMessage.content })
            })
            const data = await res.json()

            if (data.success) {
                const finalSession = {
                    ...updatedSession,
                    messages: [...updatedSession.messages, data.message]
                }
                setSelectedSession(finalSession)
                setSessions(sessions.map(s => s.id === selectedSession.id ? finalSession : s))
            }
        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-[#0a0a0b] text-white overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r border-white/10 flex flex-col bg-black/20">
                <div className="p-4 border-b border-white/10">
                    <Button
                        onClick={() => setIsCreating(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Sessão
                    </Button>
                </div>

                {isCreating && (
                    <div className="p-4 bg-white/5 border-b border-white/10 space-y-3 animate-in slide-in-from-top-2">
                        <Input
                            placeholder="Nome da Sessão"
                            value={newSessionName}
                            onChange={(e) => setNewSessionName(e.target.value)}
                            className="bg-black/50 border-white/10 text-white h-9"
                        />
                        <select
                            value={selectedAgentId}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-md text-white text-sm h-9 px-3"
                        >
                            <option value="">Selecione um Agente</option>
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.name} ({agent.model})
                                </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setIsCreating(false)}
                                variant="ghost"
                                size="sm"
                                className="flex-1 text-white/60 hover:text-white"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateSession}
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                disabled={!newSessionName || !selectedAgentId}
                            >
                                Criar
                            </Button>
                        </div>
                    </div>
                )}

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => setSelectedSession(session)}
                                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedSession?.id === session.id
                                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-200'
                                        : 'hover:bg-white/5 border border-transparent text-white/70'
                                    }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Terminal className="h-4 w-4 opacity-70" />
                                        <span className="font-medium truncate text-sm">{session.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs opacity-50">
                                        <Cpu className="h-3 w-3" />
                                        <span className="truncate">{session.agent?.name}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all"
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        {sessions.length === 0 && !loading && (
                            <div className="text-center p-8 text-white/30 text-sm">
                                Nenhuma sessão criada
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-[#0f0f12]">
                {selectedSession ? (
                    <>
                        <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-black/20">
                            <div className="flex items-center gap-3">
                                <Terminal className="h-5 w-5 text-blue-400" />
                                <div>
                                    <h2 className="font-semibold text-white">{selectedSession.name}</h2>
                                    <p className="text-xs text-white/50 flex items-center gap-1">
                                        Agente: <span className="text-blue-300">{selectedSession.agent?.name}</span>
                                        <span className="mx-1">•</span>
                                        Modelo: {selectedSession.agent?.model}
                                    </p>
                                </div>
                            </div>
                        </header>

                        <ScrollArea className="flex-1 p-6">
                            <div className="max-w-4xl mx-auto space-y-6">
                                {(selectedSession.messages || []).map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-lg p-4 ${msg.role === 'user'
                                                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100'
                                                    : 'bg-[#1a1a1e] border border-white/10 text-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2 opacity-50 text-xs uppercase tracking-wider font-semibold">
                                                {msg.role === 'user' ? (
                                                    <>
                                                        <span>Você</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Cpu className="h-3 w-3" />
                                                        <span>{selectedSession.agent?.name}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed">
                                                <ReactMarkdown
                                                    components={{
                                                        code({ node, inline, className, children, ...props }: any) {
                                                            const match = /language-(\w+)/.exec(className || '')
                                                            return !inline && match ? (
                                                                <SyntaxHighlighter
                                                                    style={vscDarkPlus}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    {...props}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            ) : (
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            )
                                                        }
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {sending && (
                                    <div className="flex justify-start">
                                        <div className="bg-[#1a1a1e] border border-white/10 rounded-lg p-4 flex items-center gap-3">
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                                            <span className="text-sm text-gray-400">Gerando resposta...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t border-white/10 bg-black/20">
                            <div className="max-w-4xl mx-auto relative">
                                <Input
                                    className="bg-white/5 border-white/10 text-white pr-12 h-12 text-base shadow-lg focus-visible:ring-blue-500/50"
                                    placeholder="Digite sua mensagem para o agente..."
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    autoFocus
                                />
                                <Button
                                    size="icon"
                                    className="absolute right-1 top-1 h-10 w-10 text-white bg-blue-600 hover:bg-blue-700"
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || sending}
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                        <Terminal className="h-16 w-16 mb-4 opacity-50" />
                        <h2 className="text-xl font-medium text-white/40">Dev Chat Playground</h2>
                        <p className="max-w-md text-center mt-2">
                            Selecione ou crie uma sessão para começar a desenvolver com seus agentes.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
