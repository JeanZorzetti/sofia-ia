'use client'

// ─────────────────────────────────────────────────────────
// NodePalette — Sidebar with draggable node types
// ─────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
    Play, Webhook, Clock, Zap, Globe, Timer, Bot, Reply, Database, Bell,
    GitBranch, Route, Repeat, Merge, CircleStop,
    PenLine, Code, FileText, Braces, Filter, Calculator, Calendar,
    Search, ChevronDown, ChevronRight, GripVertical,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<any>> = {
    Play, Webhook, Clock, Zap, Globe, Timer, Bot, Reply, Database, Bell,
    GitBranch, Route, Repeat, Merge, CircleStop,
    PenLine, Code, FileText, Braces, Filter, Calculator, Calendar,
}

interface NodeTypeInfo {
    type: string
    label: string
    description: string
    icon: string
    category: 'trigger' | 'action' | 'logic' | 'transform'
    outputs?: { name: string; label?: string }[]
    inputs?: { name: string; label?: string }[]
}

// ── Built-in node catalog (static, no API) ───────────────

const NODE_CATALOG: NodeTypeInfo[] = [
    // Triggers
    { type: 'trigger_manual', label: 'Trigger Manual', description: 'Execução manual via botão', icon: 'Play', category: 'trigger', inputs: [], outputs: [{ name: 'main' }] },
    { type: 'trigger_webhook', label: 'Webhook', description: 'Recebe dados via HTTP', icon: 'Webhook', category: 'trigger', inputs: [], outputs: [{ name: 'main' }] },
    { type: 'trigger_cron', label: 'Agendamento', description: 'Cron schedule', icon: 'Clock', category: 'trigger', inputs: [], outputs: [{ name: 'main' }] },
    { type: 'trigger_event', label: 'Evento do Sistema', description: 'Eventos internos da Sofia', icon: 'Zap', category: 'trigger', inputs: [], outputs: [{ name: 'main' }] },

    // Actions
    { type: 'action_http', label: 'HTTP Request', description: 'Requisição HTTP/REST', icon: 'Globe', category: 'action', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'action_delay', label: 'Delay', description: 'Aguardar uma duração', icon: 'Timer', category: 'action', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'action_ai_agent', label: 'Agente IA', description: 'Chamar agente da Sofia', icon: 'Bot', category: 'action', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'action_webhook_response', label: 'Webhook Response', description: 'Responder webhook', icon: 'Reply', category: 'action', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'action_database', label: 'Consulta SQL', description: 'Query no banco de dados', icon: 'Database', category: 'action', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'action_notification', label: 'Notificação', description: 'Enviar notificação', icon: 'Bell', category: 'action', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'action_subflow', label: 'Sub-Flow', description: 'Executar outro flow como sub-rotina', icon: 'GitBranch', category: 'action', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },

    // Logic
    { type: 'logic_if', label: 'IF / Condição', description: 'Branch verdadeiro/falso', icon: 'GitBranch', category: 'logic', inputs: [{ name: 'main' }], outputs: [{ name: 'true', label: 'Verdadeiro' }, { name: 'false', label: 'Falso' }] },
    { type: 'logic_switch', label: 'Switch / Case', description: 'Múltiplos caminhos', icon: 'Route', category: 'logic', inputs: [{ name: 'main' }], outputs: [{ name: 'default', label: 'Default' }] },
    { type: 'logic_loop', label: 'Loop', description: 'Iterar sobre array', icon: 'Repeat', category: 'logic', inputs: [{ name: 'main' }], outputs: [{ name: 'item', label: 'Item' }, { name: 'done', label: 'Concluído' }] },
    { type: 'logic_merge', label: 'Merge', description: 'Combinar dados', icon: 'Merge', category: 'logic', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'logic_stop', label: 'Parar', description: 'Encerrar execução', icon: 'CircleStop', category: 'logic', inputs: [{ name: 'main' }], outputs: [] },

    // Transforms
    { type: 'transform_set', label: 'Set Variável', description: 'Definir/modificar dados', icon: 'PenLine', category: 'transform', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'transform_code', label: 'Código JS', description: 'JavaScript customizado', icon: 'Code', category: 'transform', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'transform_template', label: 'Template', description: 'Texto com variáveis', icon: 'FileText', category: 'transform', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'transform_json_parse', label: 'JSON Parse', description: 'Parse/stringify JSON', icon: 'Braces', category: 'transform', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'transform_filter', label: 'Filtrar Array', description: 'Filtrar items', icon: 'Filter', category: 'transform', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'transform_aggregate', label: 'Agregar', description: 'Soma, média, contagem', icon: 'Calculator', category: 'transform', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
    { type: 'transform_date', label: 'Data / Hora', description: 'Manipular datas', icon: 'Calendar', category: 'transform', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
]

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    trigger: { label: 'Gatilhos', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    action: { label: 'Ações', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    logic: { label: 'Lógica', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    transform: { label: 'Transformar', color: 'text-violet-400', bg: 'bg-violet-500/10' },
}

export function NodePalette() {
    const [search, setSearch] = useState('')
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

    const filteredNodes = search.trim()
        ? NODE_CATALOG.filter(n =>
            n.label.toLowerCase().includes(search.toLowerCase()) ||
            n.description.toLowerCase().includes(search.toLowerCase())
        )
        : NODE_CATALOG

    const categories = ['trigger', 'action', 'logic', 'transform']

    const onDragStart = (event: React.DragEvent, nodeInfo: NodeTypeInfo) => {
        event.dataTransfer.setData('application/reactflow-node', JSON.stringify(nodeInfo))
        event.dataTransfer.effectAllowed = 'move'
    }

    return (
        <div className="h-full flex flex-col bg-slate-900/50 border-r border-white/10">
            {/* Search */}
            <div className="p-3 border-b border-white/10">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/40" />
                    <Input
                        placeholder="Buscar nós..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                </div>
            </div>

            {/* Node list */}
            <div className="flex-1 overflow-y-auto py-1">
                {categories.map(cat => {
                    const catNodes = filteredNodes.filter(n => n.category === cat)
                    if (catNodes.length === 0) return null

                    const config = CATEGORY_CONFIG[cat]
                    const isCollapsed = collapsed[cat]

                    return (
                        <div key={cat} className="mb-1">
                            {/* Category header */}
                            <button
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/5 transition-colors"
                                onClick={() => setCollapsed(p => ({ ...p, [cat]: !p[cat] }))}
                            >
                                {isCollapsed ? (
                                    <ChevronRight className={`h-3.5 w-3.5 ${config.color}`} />
                                ) : (
                                    <ChevronDown className={`h-3.5 w-3.5 ${config.color}`} />
                                )}
                                <span className={`text-[11px] font-semibold uppercase tracking-wider ${config.color}`}>
                                    {config.label}
                                </span>
                                <span className="text-[10px] text-white/30 ml-auto">{catNodes.length}</span>
                            </button>

                            {/* Node items */}
                            {!isCollapsed && (
                                <div className="px-2 pb-1">
                                    {catNodes.map(node => {
                                        const Icon = ICON_MAP[node.icon] || Zap
                                        return (
                                            <div
                                                key={node.type}
                                                draggable
                                                onDragStart={(e) => onDragStart(e, node)}
                                                className={`
                          flex items-center gap-2.5 px-2 py-1.5 mx-1 my-0.5 rounded-lg
                          cursor-grab active:cursor-grabbing
                          hover:bg-white/10 transition-all duration-150
                          border border-transparent hover:border-white/10
                          group
                        `}
                                            >
                                                <GripVertical className="h-3 w-3 text-white/20 group-hover:text-white/40 flex-shrink-0" />
                                                <div className={`p-1 rounded-md ${config.bg} flex-shrink-0`}>
                                                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-medium text-white truncate">{node.label}</div>
                                                    <div className="text-[10px] text-white/40 truncate">{node.description}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Stats */}
            <div className="p-3 border-t border-white/10">
                <div className="text-[10px] text-white/30 text-center">
                    {NODE_CATALOG.length} nós disponíveis
                </div>
            </div>
        </div>
    )
}

export { NODE_CATALOG }
export type { NodeTypeInfo }
