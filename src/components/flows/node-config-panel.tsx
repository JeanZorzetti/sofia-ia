'use client'

// ─────────────────────────────────────────────────────────
// NodeConfigPanel — Right sidebar for configuring a selected node
// ─────────────────────────────────────────────────────────

import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { X, Settings2, Trash2 } from 'lucide-react'

interface ConfigField {
    key: string
    label: string
    type: 'string' | 'number' | 'boolean' | 'select' | 'code' | 'json' | 'text' | 'expression'
    placeholder?: string
    required?: boolean
    default?: any
    options?: { label: string; value: string }[]
    description?: string
}

interface NodeConfigPanelProps {
    nodeId: string
    nodeLabel: string
    nodeType: string
    category: string
    config: Record<string, any>
    configFields: ConfigField[]
    onUpdate: (nodeId: string, config: Record<string, any>) => void
    onDelete: (nodeId: string) => void
    onClose: () => void
}

export function NodeConfigPanel({
    nodeId,
    nodeLabel,
    nodeType,
    category,
    config,
    configFields,
    onUpdate,
    onDelete,
    onClose,
}: NodeConfigPanelProps) {
    const categoryColors: Record<string, string> = {
        trigger: 'text-emerald-400',
        action: 'text-blue-400',
        logic: 'text-amber-400',
        transform: 'text-violet-400',
    }

    const handleFieldChange = (key: string, value: any) => {
        onUpdate(nodeId, { ...config, [key]: value })
    }

    const renderField = (field: ConfigField) => {
        const value = config[field.key] ?? field.default ?? ''

        switch (field.type) {
            case 'string':
            case 'expression':
                return (
                    <Input
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="bg-white/5 border-white/10 text-white text-xs h-8 placeholder:text-white/30"
                    />
                )

            case 'number':
                return (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value) || 0)}
                        placeholder={field.placeholder}
                        className="bg-white/5 border-white/10 text-white text-xs h-8 placeholder:text-white/30"
                    />
                )

            case 'text':
            case 'code':
            case 'json':
                return (
                    <Textarea
                        value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                        onChange={(e) => {
                            if (field.type === 'json') {
                                try {
                                    handleFieldChange(field.key, JSON.parse(e.target.value))
                                } catch {
                                    handleFieldChange(field.key, e.target.value)
                                }
                            } else {
                                handleFieldChange(field.key, e.target.value)
                            }
                        }}
                        placeholder={field.placeholder}
                        className={`bg-white/5 border-white/10 text-white text-xs min-h-[80px] placeholder:text-white/30 ${field.type === 'code' ? 'font-mono' : ''
                            }`}
                    />
                )

            case 'boolean':
                return (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                            className="rounded border-white/20 bg-white/5 text-blue-500"
                        />
                        <span className="text-xs text-white/70">{field.label}</span>
                    </label>
                )

            case 'select':
                return (
                    <select
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="w-full h-8 px-2 text-xs rounded-md bg-white/5 border border-white/10 text-white appearance-none cursor-pointer"
                    >
                        <option value="" className="bg-slate-900">Selecione...</option>
                        {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-slate-900">
                                {opt.label}
                            </option>
                        ))}
                    </select>
                )

            default:
                return null
        }
    }

    return (
        <div className="h-full flex flex-col bg-slate-900/50 border-l border-white/10">
            {/* Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-white/60" />
                    <span className="text-sm font-medium text-white">Configuração</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Node info */}
            <div className="px-3 py-2 border-b border-white/10">
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${categoryColors[category] || 'text-white/50'} mb-0.5`}>
                    {category === 'trigger' ? 'Gatilho' : category === 'action' ? 'Ação' : category === 'logic' ? 'Lógica' : 'Transformar'}
                </div>
                <div className="text-sm font-medium text-white">{nodeLabel}</div>
                <div className="text-[10px] text-white/30 font-mono">{nodeType}</div>
            </div>

            {/* Config fields */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {configFields.length === 0 ? (
                    <div className="text-xs text-white/40 text-center py-8">
                        Este nó não requer configuração
                    </div>
                ) : (
                    configFields.map((field) => (
                        <div key={field.key}>
                            {field.type !== 'boolean' && (
                                <label className="text-[11px] font-medium text-white/60 mb-1 block">
                                    {field.label}
                                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                                </label>
                            )}
                            {renderField(field)}
                            {field.description && (
                                <p className="text-[10px] text-white/30 mt-0.5">{field.description}</p>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Delete node */}
            <div className="p-3 border-t border-white/10">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(nodeId)}
                    className="w-full text-red-400 border-red-400/30 hover:bg-red-400/10 hover:text-red-300 text-xs"
                >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    Remover Nó
                </Button>
            </div>
        </div>
    )
}
