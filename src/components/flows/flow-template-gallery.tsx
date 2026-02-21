'use client'

// ─────────────────────────────────────────────────────────
// Flow Templates — Pre-built flow templates gallery
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    X, ArrowRight, Search, Star, Zap, Globe, Clock, Bot,
    Database, Bell, GitBranch, Filter as FilterIcon, Mail,
    FileText, MessageSquare, BarChart3,
} from 'lucide-react'

// ── Template definitions ─────────────────────────────────

export interface FlowTemplate {
    id: string
    name: string
    description: string
    category: string
    icon: string
    color: string
    difficulty: 'Fácil' | 'Médio' | 'Avançado'
    tags: string[]
    nodes: any[]
    edges: any[]
    variables: Record<string, any>
    triggerType: string
    cronExpression?: string
}

const TEMPLATE_CATEGORIES = [
    { id: 'all', label: 'Todos', icon: Star },
    { id: 'automation', label: 'Automação', icon: Zap },
    { id: 'integration', label: 'Integração', icon: Globe },
    { id: 'notification', label: 'Notificação', icon: Bell },
    { id: 'data', label: 'Dados', icon: Database },
    { id: 'ai', label: 'IA', icon: Bot },
]

export const FLOW_TEMPLATES: FlowTemplate[] = [
    // ── Automation ─────────────────────────────
    {
        id: 'welcome-email',
        name: 'Email de Boas-Vindas',
        description: 'Envia email automático quando um novo lead é criado via webhook.',
        category: 'automation',
        icon: 'Mail',
        color: '#3b82f6',
        difficulty: 'Fácil',
        tags: ['email', 'lead', 'webhook'],
        triggerType: 'webhook',
        variables: { emailSubject: 'Bem-vindo!', senderName: 'Sofia' },
        nodes: [
            { id: 'trigger_1', type: 'trigger_webhook', position: { x: 100, y: 200 }, data: { label: 'Webhook', config: {} } },
            { id: 'transform_1', type: 'transform_template', position: { x: 400, y: 200 }, data: { label: 'Template Email', config: { template: 'Olá {{name}}, seja bem-vindo!' } } },
            { id: 'action_1', type: 'action_http', position: { x: 700, y: 200 }, data: { label: 'Enviar Email', config: { method: 'POST', url: 'https://api.email.com/send' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger_1', target: 'transform_1' },
            { id: 'e2', source: 'transform_1', target: 'action_1' },
        ],
    },
    {
        id: 'daily-report',
        name: 'Relatório Diário',
        description: 'Gera e envia relatório automático todos os dias às 8h.',
        category: 'automation',
        icon: 'FileText',
        color: '#10b981',
        difficulty: 'Médio',
        tags: ['cron', 'relatório', 'agendado'],
        triggerType: 'cron',
        cronExpression: '0 8 * * *',
        variables: { reportTitle: 'Relatório Diário', recipientEmail: 'team@company.com' },
        nodes: [
            { id: 'trigger_1', type: 'trigger_cron', position: { x: 100, y: 200 }, data: { label: 'Cron 8h', config: {} } },
            { id: 'action_1', type: 'action_database', position: { x: 400, y: 200 }, data: { label: 'Buscar Dados', config: { operation: 'query', sql: 'SELECT * FROM metrics WHERE date = CURRENT_DATE' } } },
            { id: 'transform_1', type: 'transform_template', position: { x: 700, y: 200 }, data: { label: 'Formatar', config: {} } },
            { id: 'action_2', type: 'action_notification', position: { x: 1000, y: 200 }, data: { label: 'Notificar', config: { channel: 'email' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger_1', target: 'action_1' },
            { id: 'e2', source: 'action_1', target: 'transform_1' },
            { id: 'e3', source: 'transform_1', target: 'action_2' },
        ],
    },

    // ── Integration ────────────────────────────
    {
        id: 'api-sync',
        name: 'Sincronização de API',
        description: 'Busca dados de API externa, transforma e salva no banco.',
        category: 'integration',
        icon: 'Globe',
        color: '#8b5cf6',
        difficulty: 'Médio',
        tags: ['api', 'sync', 'banco'],
        triggerType: 'manual',
        variables: { apiUrl: 'https://api.exemplo.com/data', apiKey: '' },
        nodes: [
            { id: 'trigger_1', type: 'trigger_manual', position: { x: 100, y: 200 }, data: { label: 'Manual', config: {} } },
            { id: 'action_1', type: 'action_http', position: { x: 400, y: 200 }, data: { label: 'GET API', config: { method: 'GET', url: '{{var.apiUrl}}' } } },
            { id: 'transform_1', type: 'transform_map', position: { x: 700, y: 150 }, data: { label: 'Mapear', config: {} } },
            { id: 'logic_1', type: 'logic_if', position: { x: 700, y: 300 }, data: { label: 'Validar', config: { condition: '{{data.length}} > 0' } } },
            { id: 'action_2', type: 'action_database', position: { x: 1000, y: 150 }, data: { label: 'Salvar', config: { operation: 'insert' } } },
            { id: 'action_3', type: 'action_notification', position: { x: 1000, y: 300 }, data: { label: 'Erro', config: { title: 'Sync falhou' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger_1', target: 'action_1' },
            { id: 'e2', source: 'action_1', target: 'transform_1' },
            { id: 'e3', source: 'action_1', target: 'logic_1' },
            { id: 'e4', source: 'transform_1', target: 'action_2' },
            { id: 'e5', source: 'logic_1', target: 'action_3', sourceHandle: 'false' },
        ],
    },

    // ── Notification ───────────────────────────
    {
        id: 'webhook-alert',
        name: 'Alerta de Webhook',
        description: 'Recebe webhook e dispara notificação com filtro condicional.',
        category: 'notification',
        icon: 'Bell',
        color: '#f59e0b',
        difficulty: 'Fácil',
        tags: ['webhook', 'alerta', 'filtro'],
        triggerType: 'webhook',
        variables: {},
        nodes: [
            { id: 'trigger_1', type: 'trigger_webhook', position: { x: 100, y: 200 }, data: { label: 'Webhook', config: {} } },
            { id: 'logic_1', type: 'logic_if', position: { x: 400, y: 200 }, data: { label: 'É urgente?', config: { condition: '{{priority}} === "high"' } } },
            { id: 'action_1', type: 'action_notification', position: { x: 700, y: 100 }, data: { label: '🚨 Urgente', config: { channel: 'email', title: 'URGENTE: {{title}}' } } },
            { id: 'action_2', type: 'action_notification', position: { x: 700, y: 300 }, data: { label: 'In-App', config: { channel: 'in_app', title: '{{title}}' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger_1', target: 'logic_1' },
            { id: 'e2', source: 'logic_1', target: 'action_1', sourceHandle: 'true' },
            { id: 'e3', source: 'logic_1', target: 'action_2', sourceHandle: 'false' },
        ],
    },

    // ── Data ───────────────────────────────────
    {
        id: 'data-pipeline',
        name: 'Pipeline de Dados',
        description: 'Coleta, filtra, agrega e exporta dados em lote.',
        category: 'data',
        icon: 'BarChart3',
        color: '#06b6d4',
        difficulty: 'Avançado',
        tags: ['etl', 'pipeline', 'dados'],
        triggerType: 'manual',
        variables: { batchSize: 100, outputFormat: 'json' },
        nodes: [
            { id: 'trigger_1', type: 'trigger_manual', position: { x: 100, y: 200 }, data: { label: 'Iniciar', config: {} } },
            { id: 'action_1', type: 'action_database', position: { x: 350, y: 200 }, data: { label: 'Query', config: { operation: 'query', sql: 'SELECT * FROM raw_data LIMIT {{var.batchSize}}' } } },
            { id: 'transform_1', type: 'transform_filter', position: { x: 600, y: 200 }, data: { label: 'Filtrar', config: {} } },
            { id: 'transform_2', type: 'transform_aggregate', position: { x: 850, y: 200 }, data: { label: 'Agregar', config: {} } },
            { id: 'transform_3', type: 'transform_template', position: { x: 1100, y: 200 }, data: { label: 'Formatar', config: {} } },
            { id: 'action_2', type: 'action_http', position: { x: 1350, y: 200 }, data: { label: 'Exportar', config: { method: 'POST' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger_1', target: 'action_1' },
            { id: 'e2', source: 'action_1', target: 'transform_1' },
            { id: 'e3', source: 'transform_1', target: 'transform_2' },
            { id: 'e4', source: 'transform_2', target: 'transform_3' },
            { id: 'e5', source: 'transform_3', target: 'action_2' },
        ],
    },

    // ── AI ──────────────────────────────────────
    {
        id: 'ai-classifier',
        name: 'Classificador IA',
        description: 'Usa Sofia IA para classificar e rotear mensagens automaticamente.',
        category: 'ai',
        icon: 'Bot',
        color: '#ec4899',
        difficulty: 'Avançado',
        tags: ['ia', 'classificação', 'nlp'],
        triggerType: 'webhook',
        variables: { agentId: '', categories: 'suporte,vendas,financeiro' },
        nodes: [
            { id: 'trigger_1', type: 'trigger_webhook', position: { x: 100, y: 250 }, data: { label: 'Mensagem', config: {} } },
            { id: 'action_1', type: 'action_ai_agent', position: { x: 400, y: 250 }, data: { label: 'Sofia IA', config: { prompt: 'Classifique: {{message}}. Categorias: {{var.categories}}' } } },
            { id: 'logic_1', type: 'logic_switch', position: { x: 700, y: 250 }, data: { label: 'Rotear', config: { field: 'category' } } },
            { id: 'action_2', type: 'action_notification', position: { x: 1000, y: 100 }, data: { label: 'Suporte', config: { title: 'Novo ticket' } } },
            { id: 'action_3', type: 'action_notification', position: { x: 1000, y: 250 }, data: { label: 'Vendas', config: { title: 'Novo lead' } } },
            { id: 'action_4', type: 'action_notification', position: { x: 1000, y: 400 }, data: { label: 'Financeiro', config: { title: 'Nova solicitação' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger_1', target: 'action_1' },
            { id: 'e2', source: 'action_1', target: 'logic_1' },
            { id: 'e3', source: 'logic_1', target: 'action_2', sourceHandle: 'case_0' },
            { id: 'e4', source: 'logic_1', target: 'action_3', sourceHandle: 'case_1' },
            { id: 'e5', source: 'logic_1', target: 'action_4', sourceHandle: 'case_2' },
        ],
    },
]

// ── Template Gallery Component ───────────────────────────

interface FlowTemplateGalleryProps {
    onClose: () => void
}

export function FlowTemplateGallery({ onClose }: FlowTemplateGalleryProps) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [creating, setCreating] = useState<string | null>(null)

    const filtered = FLOW_TEMPLATES.filter(t => {
        const matchSearch = !search ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase()) ||
            t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
        const matchCategory = activeCategory === 'all' || t.category === activeCategory
        return matchSearch && matchCategory
    })

    const handleUseTemplate = useCallback(async (template: FlowTemplate) => {
        setCreating(template.id)
        try {
            const res = await fetch('/api/flows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: template.name,
                    description: template.description,
                    nodes: template.nodes,
                    edges: template.edges,
                    variables: template.variables,
                    triggerType: template.triggerType,
                    cronExpression: template.cronExpression,
                    tags: template.tags,
                    icon: template.icon,
                    color: template.color,
                }),
            })
            const { data, error } = await res.json()
            if (error) throw new Error(error)
            toast.success(`Template "${template.name}" criado!`)
            router.push(`/dashboard/workflows/${data.id}`)
        } catch (err: any) {
            toast.error('Erro ao criar: ' + err.message)
        } finally {
            setCreating(null)
        }
    }, [router])

    const ICON_MAP: Record<string, any> = {
        Mail, FileText, Globe, Bell, BarChart3, Bot, Zap, Database,
        GitBranch, MessageSquare, Clock, FilterIcon,
    }

    const getDifficultyColor = (d: string) => {
        if (d === 'Fácil') return { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' }
        if (d === 'Médio') return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' }
        return { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                width: '900px', maxHeight: '85vh',
                background: 'rgba(15, 15, 20, 0.98)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                            Templates de Flow
                        </h2>
                        <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>
                            Comece rapidamente com flows pré-configurados
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', color: '#888', cursor: 'pointer', padding: '6px',
                    }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Search + Categories */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.08)', padding: '0 12px',
                    }}>
                        <Search size={16} style={{ color: '#555' }} />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar templates..."
                            style={{
                                flex: 1, background: 'none', border: 'none', outline: 'none',
                                color: '#e0e0e0', fontSize: '13px', padding: '10px 0',
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {TEMPLATE_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: '16px',
                                    border: activeCategory === cat.id
                                        ? '1px solid rgba(139,92,246,0.4)'
                                        : '1px solid rgba(255,255,255,0.08)',
                                    background: activeCategory === cat.id
                                        ? 'rgba(139,92,246,0.15)'
                                        : 'rgba(255,255,255,0.03)',
                                    color: activeCategory === cat.id ? '#a78bfa' : '#888',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <cat.icon size={12} />
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates Grid */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '16px 24px',
                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px', alignContent: 'start',
                }}>
                    {filtered.length === 0 ? (
                        <div style={{
                            gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: '#555',
                        }}>
                            Nenhum template encontrado.
                        </div>
                    ) : (
                        filtered.map(template => {
                            const Icon = ICON_MAP[template.icon] || Zap
                            const diff = getDifficultyColor(template.difficulty)
                            const isCreating = creating === template.id

                            return (
                                <div key={template.id} style={{
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }} onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = `${template.color}40`
                                        ; (e.currentTarget as HTMLElement).style.background = `${template.color}08`
                                }} onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                                        ; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: `${template.color}18`,
                                            border: `1px solid ${template.color}30`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <Icon size={18} style={{ color: template.color }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h3 style={{
                                                    color: '#e0e0e0', fontSize: '14px', fontWeight: 600,
                                                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {template.name}
                                                </h3>
                                                <span style={{
                                                    fontSize: '10px', padding: '1px 6px', borderRadius: '8px',
                                                    background: diff.bg, color: diff.color, border: `1px solid ${diff.border}`,
                                                    flexShrink: 0,
                                                }}>
                                                    {template.difficulty}
                                                </span>
                                            </div>
                                            <p style={{
                                                color: '#777', fontSize: '12px', margin: '6px 0 0',
                                                lineHeight: '1.4', display: '-webkit-box',
                                                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}>
                                                {template.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        marginTop: '12px',
                                    }}>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {template.tags.slice(0, 3).map(tag => (
                                                <span key={tag} style={{
                                                    fontSize: '10px', padding: '2px 6px', borderRadius: '6px',
                                                    background: 'rgba(255,255,255,0.04)', color: '#666',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                }}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => handleUseTemplate(template)}
                                            disabled={!!creating}
                                            style={{
                                                padding: '5px 12px', borderRadius: '8px',
                                                background: isCreating ? 'rgba(255,255,255,0.05)' : `${template.color}20`,
                                                border: `1px solid ${template.color}30`,
                                                color: isCreating ? '#666' : template.color,
                                                cursor: creating ? 'not-allowed' : 'pointer',
                                                fontSize: '11px', fontWeight: 600,
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                            }}
                                        >
                                            {isCreating ? 'Criando...' : <>Usar <ArrowRight size={12} /></>}
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 24px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <span style={{ color: '#555', fontSize: '12px' }}>
                        {filtered.length} template{filtered.length !== 1 ? 's' : ''} disponíve{filtered.length !== 1 ? 'is' : 'l'}
                    </span>
                    <span style={{ color: '#444', fontSize: '11px' }}>
                        {FLOW_TEMPLATES.length} templates no total
                    </span>
                </div>
            </div>
        </div>
    )
}
