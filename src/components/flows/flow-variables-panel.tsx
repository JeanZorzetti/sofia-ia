'use client'

// ─────────────────────────────────────────────────────────
// Flow Variables Panel — Create/Edit/Delete flow variables
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import {
    X, Plus, Trash2, Variable, Type, Hash, ToggleLeft, Braces,
    ChevronDown, ChevronUp, Copy, Check,
} from 'lucide-react'

interface FlowVariable {
    key: string
    value: any
    type: 'string' | 'number' | 'boolean' | 'json'
    description?: string
}

interface FlowVariablesPanelProps {
    variables: Record<string, any>
    onUpdate: (variables: Record<string, any>) => void
    onClose: () => void
}

const TYPE_ICONS: Record<string, any> = {
    string: Type,
    number: Hash,
    boolean: ToggleLeft,
    json: Braces,
}

const TYPE_COLORS: Record<string, string> = {
    string: '#10b981',
    number: '#3b82f6',
    boolean: '#f59e0b',
    json: '#8b5cf6',
}

export function FlowVariablesPanel({ variables, onUpdate, onClose }: FlowVariablesPanelProps) {
    const [vars, setVars] = useState<FlowVariable[]>(() => {
        // Parse existing variables into structured format
        const entries = Object.entries(variables || {})
        return entries.map(([key, value]) => ({
            key,
            value: typeof value === 'object' ? JSON.stringify(value, null, 2) : value,
            type: detectType(value),
            description: '',
        }))
    })
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
    const [copiedRef, setCopiedRef] = useState<string | null>(null)

    const addVariable = useCallback(() => {
        const newKey = `var_${vars.length + 1}`
        setVars(prev => [...prev, { key: newKey, value: '', type: 'string', description: '' }])
        setExpandedIdx(vars.length)
    }, [vars.length])

    const removeVariable = useCallback((idx: number) => {
        setVars(prev => prev.filter((_, i) => i !== idx))
        setExpandedIdx(null)
    }, [])

    const updateVariable = useCallback((idx: number, updates: Partial<FlowVariable>) => {
        setVars(prev => prev.map((v, i) => i === idx ? { ...v, ...updates } : v))
    }, [])

    const handleSave = useCallback(() => {
        const result: Record<string, any> = {}
        for (const v of vars) {
            if (!v.key.trim()) continue
            try {
                if (v.type === 'number') result[v.key] = Number(v.value)
                else if (v.type === 'boolean') result[v.key] = v.value === true || v.value === 'true'
                else if (v.type === 'json') result[v.key] = JSON.parse(v.value)
                else result[v.key] = String(v.value)
            } catch {
                result[v.key] = v.value
            }
        }
        onUpdate(result)
    }, [vars, onUpdate])

    const copyRef = useCallback((key: string) => {
        navigator.clipboard.writeText(`{{var.${key}}}`)
        setCopiedRef(key)
        setTimeout(() => setCopiedRef(null), 2000)
    }, [])

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '400px',
            height: '100vh',
            background: 'rgba(15, 15, 20, 0.98)',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(20px)',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Variable size={20} style={{ color: '#8b5cf6' }} />
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>
                        Variáveis do Flow
                    </span>
                    <span style={{
                        background: 'rgba(139, 92, 246, 0.2)',
                        color: '#a78bfa',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                    }}>
                        {vars.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '4px',
                    }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Info */}
            <div style={{
                padding: '12px 20px',
                background: 'rgba(139, 92, 246, 0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: '12px',
                color: '#888',
                lineHeight: '1.5',
            }}>
                Variáveis são acessíveis em qualquer nó via{' '}
                <code style={{ color: '#a78bfa', background: 'rgba(139,92,246,0.15)', padding: '1px 4px', borderRadius: '3px' }}>
                    {'{{var.nome}}'}
                </code>
            </div>

            {/* Variable List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                {vars.length === 0 ? (
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#555',
                        fontSize: '13px',
                    }}>
                        <Variable size={32} style={{ color: '#333', marginBottom: '12px' }} />
                        <p>Nenhuma variável definida.</p>
                        <p style={{ marginTop: '4px', fontSize: '12px' }}>
                            Clique em &quot;Adicionar&quot; para criar uma.
                        </p>
                    </div>
                ) : (
                    vars.map((v, idx) => {
                        const isExpanded = expandedIdx === idx
                        const TypeIcon = TYPE_ICONS[v.type] || Type
                        const typeColor = TYPE_COLORS[v.type] || '#888'

                        return (
                            <div key={idx} style={{
                                margin: '0 12px 8px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '8px',
                                border: isExpanded
                                    ? '1px solid rgba(139, 92, 246, 0.3)'
                                    : '1px solid rgba(255,255,255,0.06)',
                                transition: 'all 0.2s ease',
                            }}>
                                {/* Collapsed row */}
                                <div
                                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                    style={{
                                        padding: '10px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <TypeIcon size={14} style={{ color: typeColor, flexShrink: 0 }} />
                                    <span style={{ color: '#e0e0e0', fontSize: '13px', fontFamily: 'monospace', flex: 1 }}>
                                        {v.key || 'sem_nome'}
                                    </span>
                                    <span style={{ color: '#666', fontSize: '11px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {String(v.value).slice(0, 20)}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); copyRef(v.key) }}
                                        title="Copiar referência {{var.nome}}"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: copiedRef === v.key ? '#10b981' : '#555',
                                            cursor: 'pointer',
                                            padding: '2px',
                                        }}
                                    >
                                        {copiedRef === v.key ? <Check size={13} /> : <Copy size={13} />}
                                    </button>
                                    {isExpanded ? <ChevronUp size={14} style={{ color: '#555' }} /> : <ChevronDown size={14} style={{ color: '#555' }} />}
                                </div>

                                {/* Expanded form */}
                                {isExpanded && (
                                    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* Key */}
                                        <div>
                                            <label style={labelStyle}>Nome</label>
                                            <input
                                                value={v.key}
                                                onChange={e => updateVariable(idx, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                                placeholder="nome_da_variavel"
                                                style={inputStyle}
                                            />
                                        </div>

                                        {/* Type */}
                                        <div>
                                            <label style={labelStyle}>Tipo</label>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {(['string', 'number', 'boolean', 'json'] as const).map(t => {
                                                    const Icon = TYPE_ICONS[t]
                                                    return (
                                                        <button
                                                            key={t}
                                                            onClick={() => updateVariable(idx, { type: t })}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 8px',
                                                                background: v.type === t
                                                                    ? `${TYPE_COLORS[t]}15`
                                                                    : 'rgba(255,255,255,0.03)',
                                                                border: v.type === t
                                                                    ? `1px solid ${TYPE_COLORS[t]}40`
                                                                    : '1px solid rgba(255,255,255,0.08)',
                                                                borderRadius: '6px',
                                                                color: v.type === t ? TYPE_COLORS[t] : '#666',
                                                                cursor: 'pointer',
                                                                fontSize: '11px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '4px',
                                                            }}
                                                        >
                                                            <Icon size={12} />
                                                            {t}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Value */}
                                        <div>
                                            <label style={labelStyle}>Valor padrão</label>
                                            {v.type === 'boolean' ? (
                                                <button
                                                    onClick={() => updateVariable(idx, { value: !(v.value === true || v.value === 'true') })}
                                                    style={{
                                                        ...inputStyle,
                                                        cursor: 'pointer',
                                                        color: (v.value === true || v.value === 'true') ? '#10b981' : '#ef4444',
                                                    }}
                                                >
                                                    {(v.value === true || v.value === 'true') ? 'true' : 'false'}
                                                </button>
                                            ) : v.type === 'json' ? (
                                                <textarea
                                                    value={typeof v.value === 'string' ? v.value : JSON.stringify(v.value, null, 2)}
                                                    onChange={e => updateVariable(idx, { value: e.target.value })}
                                                    placeholder='{"chave": "valor"}'
                                                    rows={4}
                                                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
                                                />
                                            ) : (
                                                <input
                                                    type={v.type === 'number' ? 'number' : 'text'}
                                                    value={v.value}
                                                    onChange={e => updateVariable(idx, { value: e.target.value })}
                                                    placeholder={v.type === 'number' ? '0' : 'valor'}
                                                    style={inputStyle}
                                                />
                                            )}
                                        </div>

                                        {/* Reference */}
                                        <div style={{
                                            padding: '8px 10px',
                                            background: 'rgba(139, 92, 246, 0.08)',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}>
                                            <code style={{ color: '#a78bfa', fontSize: '12px' }}>
                                                {`{{var.${v.key}}}`}
                                            </code>
                                            <button
                                                onClick={() => copyRef(v.key)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: copiedRef === v.key ? '#10b981' : '#a78bfa',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                {copiedRef === v.key ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                                            </button>
                                        </div>

                                        {/* Delete */}
                                        <button
                                            onClick={() => removeVariable(idx)}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                                borderRadius: '6px',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            <Trash2 size={12} /> Excluir variável
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Footer */}
            <div style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                gap: '8px',
            }}>
                <button
                    onClick={addVariable}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: 'rgba(139, 92, 246, 0.12)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        borderRadius: '8px',
                        color: '#a78bfa',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                    }}
                >
                    <Plus size={14} /> Adicionar
                </button>
                <button
                    onClick={handleSave}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                    }}
                >
                    Salvar
                </button>
            </div>
        </div>
    )
}

// ── Helpers ──────────────────────────────────────────────

function detectType(value: any): FlowVariable['type'] {
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'object') return 'json'
    return 'string'
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#888',
    fontSize: '11px',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '13px',
    outline: 'none',
}
