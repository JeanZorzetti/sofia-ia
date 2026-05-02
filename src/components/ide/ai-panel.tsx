'use client'

// ─────────────────────────────────────────────────────────
// AI Panel — Context-aware AI chat for the IDE
// ─────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react'
import {
    Sparkles, Send, Loader2, Trash2, X,
    Bug, RefreshCw, FileCode2, BookOpen, Wand2, TestTube2,
    ChevronDown, Cpu, Zap, Brain,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

// ── Language labels ─────────────────────────────────────────
const LANG_LABELS: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript', jsx: 'JavaScript React',
    json: 'JSON', md: 'Markdown', css: 'CSS', html: 'HTML', py: 'Python',
    prisma: 'Prisma', sql: 'SQL', rs: 'Rust', go: 'Go',
}

// ── Model Library ───────────────────────────────────────────
interface AIModel {
    id: string
    name: string
    provider: string
    description: string
    speed: 'Rápido' | 'Médio' | 'Lento'
    quality: 'Alta' | 'Média' | 'Básica'
    context: string
    badge?: string
    color: string
    category: 'claude' | 'gpt' | 'gemini' | 'llama' | 'deepseek' | 'other'
}

const AI_MODELS: AIModel[] = [
    // ── Claude (Anthropic) ──────────────────────────────────
    {
        id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic',
        description: 'Modelo principal da Anthropic. Excelente em raciocínio, código e instruções complexas.',
        speed: 'Médio', quality: 'Alta', context: '200K',
        badge: '⭐ Recomendado', color: '#d97706', category: 'claude',
    },
    {
        id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic',
        description: 'Modelo mais poderoso da Anthropic. Máxima qualidade para tarefas extremamente complexas.',
        speed: 'Lento', quality: 'Alta', context: '200K',
        badge: '👑 Premium', color: '#b45309', category: 'claude',
    },
    {
        id: 'claude-sonnet-3.5', name: 'Claude Sonnet 3.5', provider: 'Anthropic',
        description: 'Versão anterior mas muito estável. Ótimo custo-benefício para programação.',
        speed: 'Médio', quality: 'Alta', context: '200K',
        color: '#d97706', category: 'claude',
    },
    {
        id: 'claude-haiku-3.5', name: 'Claude Haiku 3.5', provider: 'Anthropic',
        description: 'Ultra-rápido e barato. Ideal para tarefas simples, autocompletar e pequenas correções.',
        speed: 'Rápido', quality: 'Média', context: '200K',
        badge: '⚡ Veloz', color: '#f59e0b', category: 'claude',
    },

    // ── GPT (OpenAI) ────────────────────────────────────────
    {
        id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI',
        description: 'Modelo mais recente da OpenAI. Forte em código, análise e geração de texto.',
        speed: 'Médio', quality: 'Alta', context: '128K',
        badge: '🔥 Novo', color: '#10b981', category: 'gpt',
    },
    {
        id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI',
        description: 'Modelo multimodal rápido. Equilíbrio entre velocidade e inteligência.',
        speed: 'Médio', quality: 'Alta', context: '128K',
        color: '#10b981', category: 'gpt',
    },
    {
        id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI',
        description: 'Versão compacta do 4.1. Rápido e barato para tarefas do dia-a-dia.',
        speed: 'Rápido', quality: 'Média', context: '128K',
        color: '#34d399', category: 'gpt',
    },
    {
        id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI',
        description: 'Versão compacta do 4o. Eficiente para perguntas rápidas e pequenas tarefas.',
        speed: 'Rápido', quality: 'Média', context: '128K',
        color: '#34d399', category: 'gpt',
    },
    {
        id: 'o3-mini', name: 'o3-mini', provider: 'OpenAI',
        description: 'Modelo de raciocínio da OpenAI. Excelente para lógica, matemática e debugging.',
        speed: 'Lento', quality: 'Alta', context: '128K',
        badge: '🧠 Raciocínio', color: '#059669', category: 'gpt',
    },

    // ── Gemini (Google) ─────────────────────────────────────
    {
        id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google',
        description: 'Modelo mais avançado do Google. Forte em código, raciocínio e contextos longos.',
        speed: 'Médio', quality: 'Alta', context: '1M',
        badge: '🚀 1M ctx', color: '#4285f4', category: 'gemini',
    },
    {
        id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google',
        description: 'Versão rápida do 2.5. Bom equilíbrio velocidade/qualidade com contexto enorme.',
        speed: 'Rápido', quality: 'Alta', context: '1M',
        color: '#4285f4', category: 'gemini',
    },
    {
        id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google',
        description: 'Ultra-rápido e eficiente. Ideal para tarefas simples e respostas instantâneas.',
        speed: 'Rápido', quality: 'Média', context: '1M',
        color: '#60a5fa', category: 'gemini',
    },

    // ── Llama (Meta via Groq) ───────────────────────────────
    {
        id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Meta / Groq',
        description: 'Open-source poderoso. Excelente em código e análise. Roda muito rápido no Groq.',
        speed: 'Rápido', quality: 'Alta', context: '128K',
        badge: '🆓 Grátis', color: '#3b82f6', category: 'llama',
    },
    {
        id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'Meta / Groq',
        description: 'Ultra-rápido para tarefas triviais. Respostas instantâneas, zero custo.',
        speed: 'Rápido', quality: 'Básica', context: '128K',
        badge: '⚡🆓', color: '#60a5fa', category: 'llama',
    },
    {
        id: 'llama-3.2-90b-text-preview', name: 'Llama 3.2 90B', provider: 'Meta / Groq',
        description: 'Preview do maior Llama. Qualidade máxima open-source.',
        speed: 'Médio', quality: 'Alta', context: '128K',
        badge: '🔬 Preview', color: '#6366f1', category: 'llama',
    },
    {
        id: 'llama-3.2-11b-text-preview', name: 'Llama 3.2 11B', provider: 'Meta / Groq',
        description: 'Preview compacto. Boa alternativa intermediária gratuita.',
        speed: 'Rápido', quality: 'Média', context: '128K',
        color: '#818cf8', category: 'llama',
    },

    // ── DeepSeek ────────────────────────────────────────────
    {
        id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', provider: 'DeepSeek / Groq',
        description: 'Raciocínio avançado rodando no Groq. Rápido para um modelo de raciocínio.',
        speed: 'Médio', quality: 'Alta', context: '128K',
        badge: '🧠🆓', color: '#8b5cf6', category: 'deepseek',
    },
    {
        id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek',
        description: 'Modelo completo de raciocínio. Excelente em lógica e debugging complexo.',
        speed: 'Lento', quality: 'Alta', context: '64K',
        badge: '🧠 Raciocínio', color: '#7c3aed', category: 'deepseek',
    },
    {
        id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek',
        description: 'Modelo de uso geral. Forte em código e explicações técnicas detalhadas.',
        speed: 'Médio', quality: 'Alta', context: '64K',
        color: '#a78bfa', category: 'deepseek',
    },

    // ── Others (Groq) ───────────────────────────────────────
    {
        id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B', provider: 'Alibaba / Groq',
        description: 'Especialista em programação. Otimizado para geração e compreensão de código.',
        speed: 'Médio', quality: 'Alta', context: '128K',
        badge: '💻 Código', color: '#22d3ee', category: 'other',
    },
    {
        id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'Google / Groq',
        description: 'Modelo leve do Google. Bom para explicações, documentação e perguntas rápidas.',
        speed: 'Rápido', quality: 'Média', context: '8K',
        badge: '🆓', color: '#ef4444', category: 'other',
    },
    {
        id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'Mistral / Groq',
        description: 'Mixture-of-Experts eficiente. Forte multilíngue com contexto de 32K.',
        speed: 'Rápido', quality: 'Média', context: '32K',
        badge: '🆓', color: '#f97316', category: 'other',
    },
]

const CATEGORY_LABELS: Record<string, string> = {
    claude: '🟠 Claude (Anthropic)',
    gpt: '🟢 GPT (OpenAI)',
    gemini: '🔵 Gemini (Google)',
    llama: '🦙 Llama (Meta)',
    deepseek: '🟣 DeepSeek',
    other: '⚙️ Outros',
}

const CATEGORY_ORDER = ['claude', 'gpt', 'gemini', 'llama', 'deepseek', 'other']

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp?: string
}

interface AIPanelProps {
    fileName: string | null
    filePath: string | null
    fileContent: string | null
    onClose: () => void
    onApplyCode?: (code: string) => void
}

// ── Quick action buttons ────────────────────────────────────
const QUICK_ACTIONS = [
    { icon: BookOpen, label: 'Explique', prompt: 'Explique o que esse código faz de forma clara e concisa.' },
    { icon: Wand2, label: 'Refatore', prompt: 'Sugira melhorias e refatorações para esse código, mantendo a mesma funcionalidade.' },
    { icon: Bug, label: 'Bugs', prompt: 'Analise esse código em busca de bugs, problemas potenciais e edge cases não tratados.' },
    { icon: TestTube2, label: 'Testes', prompt: 'Gere testes unitários para as funções principais desse código.' },
    { icon: FileCode2, label: 'Documente', prompt: 'Adicione JSDoc/documentação às funções e classes principais desse código.' },
]

export function AIPanel({ fileName, filePath, fileContent, onClose, onApplyCode }: AIPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [selectedModel, setSelectedModel] = useState('claude-sonnet-4')
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, sending])

    // Get language from filename
    const language = fileName?.split('.').pop()?.toLowerCase() || 'plaintext'
    const langLabel = LANG_LABELS[language] || language
    const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0]

    // Group models by category
    const filteredModels = categoryFilter
        ? AI_MODELS.filter(m => m.category === categoryFilter)
        : AI_MODELS

    const groupedModels = CATEGORY_ORDER
        .map(cat => ({
            category: cat,
            label: CATEGORY_LABELS[cat],
            models: filteredModels.filter(m => m.category === cat),
        }))
        .filter(g => g.models.length > 0)

    // ── Send message ────────────────────────────────────────
    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || sending) return

        const userMsg: ChatMessage = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setSending(true)

        try {
            const res = await fetch('/api/ide/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    model: selectedModel,
                    history: messages,
                    fileContext: fileName && fileContent ? {
                        fileName,
                        filePath,
                        language: langLabel,
                        content: fileContent,
                    } : undefined,
                }),
            })

            const data = await res.json()

            if (data.success && data.message) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.message.content,
                    timestamp: new Date().toISOString(),
                }])
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `❌ ${data.error || 'Erro ao gerar resposta. Tente novamente.'}`,
                    timestamp: new Date().toISOString(),
                }])
            }
        } catch (err) {
            console.error('AI Panel error:', err)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Erro de conexão. Verifique se o servidor está rodando.',
                timestamp: new Date().toISOString(),
            }])
        } finally {
            setSending(false)
            inputRef.current?.focus()
        }
    }, [sending, messages, fileName, filePath, fileContent, langLabel, selectedModel])

    // ── Clear chat ──────────────────────────────────────────
    const clearChat = useCallback(() => {
        setMessages([])
    }, [])

    const speedIcon = (speed: string) => {
        switch (speed) {
            case 'Rápido': return <Zap size={10} />
            case 'Médio': return <Cpu size={10} />
            case 'Lento': return <Brain size={10} />
            default: return null
        }
    }

    return (
        <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            background: 'rgba(13, 13, 17, 0.98)', borderLeft: '1px solid rgba(255,255,255,0.06)',
            fontSize: '13px', color: '#ccc',
        }}>
            {/* Header */}
            <div style={{
                padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#aaa' }}>Polaris IA</span>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                        onClick={clearChat}
                        style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}
                        title="Limpar conversa"
                    >
                        <Trash2 size={13} />
                    </button>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}
                        title="Fechar painel"
                    >
                        <X size={13} />
                    </button>
                </div>
            </div>

            {/* Model Selector */}
            <div style={{
                padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                position: 'relative',
            }}>
                <button
                    onClick={() => setModelSelectorOpen(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                        padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
                        transition: 'all 0.15s', fontSize: '11px', color: '#aaa',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'}
                    onMouseLeave={e => { if (!modelSelectorOpen) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                    <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: currentModel.color, flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 500 }}>{currentModel.name}</span>
                    <span style={{ color: '#444', fontSize: '10px' }}>{currentModel.provider}</span>
                    <ChevronDown size={12} style={{
                        color: '#444', transition: 'transform 0.2s',
                        transform: modelSelectorOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }} />
                </button>

                {/* Model dropdown */}
                {modelSelectorOpen && (
                    <>
                        <div onClick={() => { setModelSelectorOpen(false); setCategoryFilter(null) }} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                        <div style={{
                            position: 'absolute', top: '100%', left: '8px', right: '8px', zIndex: 51,
                            background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', overflow: 'hidden', marginTop: '4px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                            maxHeight: '450px', display: 'flex', flexDirection: 'column',
                        }}>
                            {/* Header + Filter tabs */}
                            <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', fontWeight: 600 }}>
                                        Biblioteca de Modelos
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#333' }}>{AI_MODELS.length} modelos</span>
                                </div>
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => setCategoryFilter(null)}
                                        style={{
                                            padding: '2px 7px', borderRadius: '4px', fontSize: '9.5px', border: 'none',
                                            background: !categoryFilter ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                                            color: !categoryFilter ? '#a78bfa' : '#555', cursor: 'pointer',
                                        }}
                                    >Todos</button>
                                    {CATEGORY_ORDER.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                                            style={{
                                                padding: '2px 7px', borderRadius: '4px', fontSize: '9.5px', border: 'none',
                                                background: categoryFilter === cat ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                                                color: categoryFilter === cat ? '#a78bfa' : '#555', cursor: 'pointer',
                                            }}
                                        >{cat === 'other' ? '⚙️' : CATEGORY_LABELS[cat].split(' ')[0]}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Model list */}
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {groupedModels.map(group => (
                                    <div key={group.category}>
                                        <div style={{
                                            padding: '6px 12px', fontSize: '10px', color: '#444',
                                            fontWeight: 600, background: 'rgba(255,255,255,0.02)',
                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        }}>
                                            {group.label}
                                        </div>
                                        {group.models.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => { setSelectedModel(model.id); setModelSelectorOpen(false); setCategoryFilter(null) }}
                                                style={{
                                                    display: 'flex', flexDirection: 'column', gap: '3px',
                                                    width: '100%', padding: '8px 12px', border: 'none', textAlign: 'left',
                                                    background: model.id === selectedModel ? 'rgba(139,92,246,0.08)' : 'none',
                                                    borderLeft: model.id === selectedModel ? `2px solid ${model.color}` : '2px solid transparent',
                                                    cursor: 'pointer', transition: 'background 0.1s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                                onMouseLeave={e => e.currentTarget.style.background = model.id === selectedModel ? 'rgba(139,92,246,0.08)' : 'transparent'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: model.color }} />
                                                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#ddd', flex: 1 }}>{model.name}</span>
                                                    {model.badge && (
                                                        <span style={{
                                                            fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
                                                            background: `${model.color}15`, color: model.color,
                                                            border: `1px solid ${model.color}30`,
                                                        }}>{model.badge}</span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '10px', color: '#555', lineHeight: '1.3', paddingLeft: '12px' }}>
                                                    {model.description}
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px', paddingLeft: '12px', marginTop: '1px' }}>
                                                    <span style={{ fontSize: '9px', color: '#444', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        {speedIcon(model.speed)} {model.speed}
                                                    </span>
                                                    <span style={{ fontSize: '9px', color: '#444' }}>{model.quality}</span>
                                                    <span style={{ fontSize: '9px', color: '#333' }}>{model.context}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* File context badge */}
            {fileName && (
                <div style={{
                    padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '11px', color: '#555',
                }}>
                    <FileCode2 size={12} style={{ color: '#3b82f6' }} />
                    <span style={{ color: '#777' }}>{fileName}</span>
                    <span style={{ color: '#444' }}>•</span>
                    <span>{langLabel}</span>
                </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} style={{
                flex: 1, overflowY: 'auto', padding: '12px',
                display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
                {messages.length === 0 && !sending && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', flex: 1, gap: '12px', paddingTop: '32px',
                    }}>
                        <Sparkles size={28} style={{ color: '#8b5cf640' }} />
                        <p style={{ fontSize: '12px', color: '#444', textAlign: 'center', maxWidth: '220px', lineHeight: '1.5' }}>
                            Pergunte sobre o código ou use os atalhos abaixo
                        </p>

                        {/* Quick actions */}
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: '6px',
                            justifyContent: 'center', marginTop: '8px',
                        }}>
                            {QUICK_ACTIONS.map(action => (
                                <button
                                    key={action.label}
                                    onClick={() => sendMessage(action.prompt)}
                                    disabled={!fileName}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        padding: '5px 10px', borderRadius: '6px', fontSize: '11px',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid  rgba(255,255,255,0.06)',
                                        color: fileName ? '#888' : '#333', cursor: fileName ? 'pointer' : 'default',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { if (fileName) { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'; e.currentTarget.style.color = '#a78bfa' } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = fileName ? '#888' : '#333' }}
                                >
                                    <action.icon size={12} />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                        <div style={{
                            maxWidth: '95%', padding: '8px 12px', borderRadius: '8px',
                            fontSize: '12.5px', lineHeight: '1.6',
                            background: msg.role === 'user'
                                ? 'rgba(59,130,246,0.12)'
                                : 'rgba(255,255,255,0.03)',
                            border: msg.role === 'user'
                                ? '1px solid rgba(59,130,246,0.2)'
                                : '1px solid rgba(255,255,255,0.05)',
                            color: msg.role === 'user' ? '#93c5fd' : '#bbb',
                        }}>
                            {msg.role === 'assistant' ? (
                                <div className="prose prose-invert prose-sm max-w-none" style={{ fontSize: '12.5px' }}>
                                    <ReactMarkdown
                                        components={{
                                            code({ inline, className, children, ...props }: any) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                if (!inline && match) {
                                                    return (
                                                        <div style={{ position: 'relative', margin: '8px 0' }}>
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                customStyle={{
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    padding: '12px',
                                                                    background: '#0a0a0f',
                                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                                }}
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    )
                                                }
                                                return (
                                                    <code style={{
                                                        background: 'rgba(255,255,255,0.06)',
                                                        padding: '1px 5px', borderRadius: '3px',
                                                        fontSize: '11.5px', color: '#e5a56c',
                                                    }} {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            },
                                            p({ children }: any) {
                                                return <p style={{ margin: '4px 0' }}>{children}</p>
                                            },
                                            ul({ children }: any) {
                                                return <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>{children}</ul>
                                            },
                                            li({ children }: any) {
                                                return <li style={{ margin: '2px 0' }}>{children}</li>
                                            },
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <span>{msg.content}</span>
                            )}
                        </div>
                    </div>
                ))}

                {sending && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        <Loader2 size={14} style={{ color: currentModel.color, animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: '12px', color: '#666' }}>{currentModel.name} está pensando...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{
                padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', gap: '6px', alignItems: 'flex-end',
            }}>
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage(input)
                        }
                    }}
                    placeholder="Pergunte sobre o código..."
                    rows={1}
                    style={{
                        flex: 1, resize: 'none', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                        padding: '8px 10px', color: '#ddd', fontSize: '12px',
                        outline: 'none', fontFamily: 'inherit', lineHeight: '1.5',
                        maxHeight: '100px', overflowY: 'auto',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || sending}
                    style={{
                        background: input.trim() && !sending ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.04)',
                        border: 'none', borderRadius: '6px', padding: '8px',
                        color: input.trim() && !sending ? '#fff' : '#333',
                        cursor: input.trim() && !sending ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                    }}
                >
                    {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                </button>
            </div>
        </div>
    )
}
