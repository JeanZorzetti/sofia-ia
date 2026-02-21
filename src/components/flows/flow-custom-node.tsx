'use client'

// ─────────────────────────────────────────────────────────
// FlowCustomNode — React Flow custom node component
// ─────────────────────────────────────────────────────────

import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
    Play, Webhook, Clock, Zap, Globe, Timer, Bot, Reply, Database, Bell,
    GitBranch, Route, Repeat, Merge, CircleStop,
    PenLine, Code, FileText, Braces, Filter, Calculator, Calendar,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<any>> = {
    Play, Webhook, Clock, Zap, Globe, Timer, Bot, Reply, Database, Bell,
    GitBranch, Route, Repeat, Merge, CircleStop,
    PenLine, Code, FileText, Braces, Filter, Calculator, Calendar,
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; accent: string; handle: string }> = {
    trigger: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/40',
        accent: 'text-emerald-400',
        handle: '#34d399',
    },
    action: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/40',
        accent: 'text-blue-400',
        handle: '#60a5fa',
    },
    logic: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/40',
        accent: 'text-amber-400',
        handle: '#fbbf24',
    },
    transform: {
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/40',
        accent: 'text-violet-400',
        handle: '#a78bfa',
    },
}

interface FlowNodeData {
    label: string
    nodeType: string        // e.g. 'trigger_manual'
    category: string        // 'trigger' | 'action' | 'logic' | 'transform'
    icon: string
    config: Record<string, any>
    outputs?: { name: string; label?: string }[]
    inputs?: { name: string; label?: string }[]
    executionStatus?: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
}

function FlowCustomNodeComponent({ data, selected }: NodeProps & { data: FlowNodeData }) {
    const category = data.category || 'action'
    const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.action
    const IconComponent = ICON_MAP[data.icon] || Zap
    const outputs = data.outputs || [{ name: 'main' }]
    const inputs = data.inputs || (category === 'trigger' ? [] : [{ name: 'main' }])

    // Execution status styling
    const statusStyles: Record<string, string> = {
        running: 'ring-2 ring-blue-400 animate-pulse',
        success: 'ring-2 ring-emerald-400',
        failed: 'ring-2 ring-red-400',
        skipped: 'opacity-50',
    }
    const statusClass = data.executionStatus ? statusStyles[data.executionStatus] || '' : ''

    return (
        <div
            className={`
        relative min-w-[180px] max-w-[240px] rounded-xl border backdrop-blur-sm
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-white/50 shadow-lg shadow-white/10' : ''}
        ${statusClass}
        transition-all duration-200 hover:shadow-lg
      `}
        >
            {/* Input handles */}
            {inputs.map((input, i) => (
                <Handle
                    key={`input-${input.name}`}
                    type="target"
                    position={Position.Left}
                    id={input.name}
                    style={{
                        top: inputs.length === 1 ? '50%' : `${((i + 1) / (inputs.length + 1)) * 100}%`,
                        background: colors.handle,
                        width: 10,
                        height: 10,
                        border: '2px solid rgba(0,0,0,0.3)',
                    }}
                />
            ))}

            {/* Node content */}
            <div className="px-3 py-2.5">
                {/* Category label */}
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${colors.accent} mb-1`}>
                    {category === 'trigger' ? 'Gatilho' : category === 'action' ? 'Ação' : category === 'logic' ? 'Lógica' : 'Transformar'}
                </div>

                {/* Icon + Label */}
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${colors.bg} border ${colors.border}`}>
                        <IconComponent className={`h-4 w-4 ${colors.accent}`} />
                    </div>
                    <span className="text-sm font-medium text-white truncate">
                        {data.label}
                    </span>
                </div>

                {/* Execution status indicator */}
                {data.executionStatus && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${data.executionStatus === 'running' ? 'bg-blue-400 animate-pulse' :
                                data.executionStatus === 'success' ? 'bg-emerald-400' :
                                    data.executionStatus === 'failed' ? 'bg-red-400' :
                                        data.executionStatus === 'skipped' ? 'bg-white/30' : 'bg-white/20'
                            }`} />
                        <span className="text-[10px] text-white/50">
                            {data.executionStatus === 'running' ? 'Executando...' :
                                data.executionStatus === 'success' ? 'Sucesso' :
                                    data.executionStatus === 'failed' ? 'Falhou' :
                                        data.executionStatus === 'skipped' ? 'Ignorado' : 'Pendente'}
                        </span>
                    </div>
                )}
            </div>

            {/* Output handles */}
            {outputs.map((output, i) => (
                <Handle
                    key={`output-${output.name}`}
                    type="source"
                    position={Position.Right}
                    id={output.name}
                    style={{
                        top: outputs.length === 1 ? '50%' : `${((i + 1) / (outputs.length + 1)) * 100}%`,
                        background: colors.handle,
                        width: 10,
                        height: 10,
                        border: '2px solid rgba(0,0,0,0.3)',
                    }}
                />
            ))}

            {/* Output labels for multi-handle nodes */}
            {outputs.length > 1 && (
                <div className="absolute -right-14 top-0 bottom-0 flex flex-col justify-around pointer-events-none">
                    {outputs.map((output) => (
                        <span key={output.name} className="text-[9px] text-white/40 font-medium">
                            {output.label || output.name}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

export const FlowCustomNode = memo(FlowCustomNodeComponent)
