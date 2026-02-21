'use client'

// ─────────────────────────────────────────────────────────
// Execution History Panel — Detailed execution log viewer
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import {
    X, RefreshCw, CheckCircle, XCircle, Clock, Play,
    ChevronDown, ChevronUp, Timer, Activity, Loader2,
} from 'lucide-react'

interface Execution {
    id: string
    status: string
    mode: string
    startedAt: string
    finishedAt: string | null
    duration: number | null
    nodeResults: Record<string, any>
    error: string | null
    triggerData: any
}

interface ExecutionHistoryPanelProps {
    flowId: string
    onClose: () => void
}

export function ExecutionHistoryPanel({ flowId, onClose }: ExecutionHistoryPanelProps) {
    const [executions, setExecutions] = useState<Execution[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [autoRefresh, setAutoRefresh] = useState(false)

    const fetchExecutions = useCallback(async () => {
        try {
            const res = await fetch(`/api/flows/${flowId}/executions?limit=50`)
            const json = await res.json()
            if (json.data?.executions) setExecutions(json.data.executions)
        } catch (err) {
            console.error('Failed to load executions:', err)
        } finally {
            setLoading(false)
        }
    }, [flowId])

    useEffect(() => {
        fetchExecutions()
    }, [fetchExecutions])

    // Auto-refresh every 3s when enabled
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(fetchExecutions, 3000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchExecutions])

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'success': return { icon: CheckCircle, color: '#10b981', label: 'Sucesso', bg: 'rgba(16,185,129,0.1)' }
            case 'failed': return { icon: XCircle, color: '#ef4444', label: 'Falhou', bg: 'rgba(239,68,68,0.1)' }
            case 'running': return { icon: Loader2, color: '#3b82f6', label: 'Rodando', bg: 'rgba(59,130,246,0.1)' }
            default: return { icon: Clock, color: '#888', label: status, bg: 'rgba(136,136,136,0.1)' }
        }
    }

    const getModeLabel = (mode: string) => {
        const modes: Record<string, string> = {
            manual: '▶ Manual', webhook: '🌐 Webhook', cron: '⏰ Cron', subflow: '🔀 Sub-flow',
        }
        return modes[mode] || mode
    }

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        const diffHour = Math.floor(diffMs / 3600000)
        const diffDay = Math.floor(diffMs / 86400000)

        if (diffMin < 1) return 'agora'
        if (diffMin < 60) return `${diffMin}min atrás`
        if (diffHour < 24) return `${diffHour}h atrás`
        if (diffDay < 7) return `${diffDay}d atrás`
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

    const formatDuration = (ms: number | null) => {
        if (!ms) return '—'
        if (ms < 1000) return `${ms}ms`
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
        return `${(ms / 60000).toFixed(1)}min`
    }

    return (
        <div style={{
            position: 'fixed', top: 0, right: 0, width: '420px', height: '100vh',
            background: 'rgba(15, 15, 20, 0.98)', borderLeft: '1px solid rgba(255,255,255,0.1)',
            zIndex: 1000, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(20px)',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={20} style={{ color: '#3b82f6' }} />
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>Execuções</span>
                    <span style={{
                        background: 'rgba(59,130,246,0.2)', color: '#60a5fa',
                        padding: '2px 8px', borderRadius: '10px', fontSize: '12px',
                    }}>
                        {executions.length}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        onClick={() => setAutoRefresh(v => !v)}
                        title={autoRefresh ? 'Parar auto-refresh' : 'Auto-refresh (3s)'}
                        style={{
                            background: autoRefresh ? 'rgba(16,185,129,0.15)' : 'none',
                            border: autoRefresh ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                            borderRadius: '6px', color: autoRefresh ? '#10b981' : '#555',
                            cursor: 'pointer', padding: '4px',
                        }}
                    >
                        <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} style={autoRefresh ? { animation: 'spin 2s linear infinite' } : {}} />
                    </button>
                    <button onClick={() => fetchExecutions()} title="Atualizar"
                        style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}>
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Executions List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                        Carregando...
                    </div>
                ) : executions.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#555', fontSize: '13px' }}>
                        <Play size={32} style={{ color: '#333', marginBottom: '12px' }} />
                        <p>Nenhuma execução ainda.</p>
                        <p style={{ marginTop: '4px', fontSize: '12px' }}>Execute o flow para ver o histórico.</p>
                    </div>
                ) : (
                    executions.map(exec => {
                        const si = getStatusInfo(exec.status)
                        const StatusIcon = si.icon
                        const isExpanded = expandedId === exec.id
                        const nodeEntries = Object.entries(exec.nodeResults || {})

                        return (
                            <div key={exec.id} style={{
                                margin: '0 12px 6px', borderRadius: '10px',
                                background: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                                border: isExpanded ? `1px solid ${si.color}25` : '1px solid rgba(255,255,255,0.04)',
                                transition: 'all 0.2s ease',
                            }}>
                                {/* Row */}
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : exec.id)}
                                    style={{
                                        padding: '10px 14px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                    }}
                                >
                                    <StatusIcon size={16} style={{ color: si.color, flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#ccc', fontSize: '12px', fontWeight: 500 }}>
                                                {si.label}
                                            </span>
                                            <span style={{
                                                fontSize: '10px', padding: '1px 5px', borderRadius: '6px',
                                                background: 'rgba(255,255,255,0.04)', color: '#777',
                                            }}>
                                                {getModeLabel(exec.mode)}
                                            </span>
                                        </div>
                                        <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>
                                            {formatTime(exec.startedAt)}
                                            {exec.duration && (
                                                <span style={{ marginLeft: '8px' }}>
                                                    <Timer size={10} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
                                                    {formatDuration(exec.duration)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp size={14} style={{ color: '#555' }} /> : <ChevronDown size={14} style={{ color: '#555' }} />}
                                </div>

                                {/* Detail */}
                                {isExpanded && (
                                    <div style={{
                                        padding: '0 14px 14px',
                                        borderTop: '1px solid rgba(255,255,255,0.04)',
                                    }}>
                                        {/* Error */}
                                        {exec.error && (
                                            <div style={{
                                                marginTop: '10px', padding: '8px 10px', borderRadius: '8px',
                                                background: 'rgba(239,68,68,0.08)',
                                                border: '1px solid rgba(239,68,68,0.15)',
                                                color: '#f87171', fontSize: '12px', fontFamily: 'monospace',
                                                wordBreak: 'break-all',
                                            }}>
                                                ❌ {exec.error}
                                            </div>
                                        )}

                                        {/* Node results */}
                                        {nodeEntries.length > 0 && (
                                            <div style={{ marginTop: '10px' }}>
                                                <span style={{ color: '#666', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    Resultados por nó
                                                </span>
                                                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {nodeEntries.map(([nodeId, result]: [string, any]) => {
                                                        const nsi = getStatusInfo(result.status)
                                                        const NIcon = nsi.icon
                                                        return (
                                                            <div key={nodeId} style={{
                                                                padding: '6px 8px', borderRadius: '6px',
                                                                background: nsi.bg,
                                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                            }}>
                                                                <NIcon size={12} style={{ color: nsi.color }} />
                                                                <span style={{
                                                                    color: '#bbb', fontSize: '11px', fontFamily: 'monospace',
                                                                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                }}>
                                                                    {nodeId.split('_').slice(0, 2).join('_')}
                                                                </span>
                                                                {result.duration && (
                                                                    <span style={{ color: '#666', fontSize: '10px' }}>
                                                                        {formatDuration(result.duration)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* ID */}
                                        <div style={{ marginTop: '10px', color: '#444', fontSize: '10px', fontFamily: 'monospace' }}>
                                            ID: {exec.id.slice(0, 8)}...
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Footer stats */}
            {executions.length > 0 && (
                <div style={{
                    padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', justifyContent: 'space-around',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#10b981', fontSize: '16px', fontWeight: 700 }}>
                            {executions.filter(e => e.status === 'success').length}
                        </div>
                        <div style={{ color: '#555', fontSize: '10px' }}>Sucesso</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#ef4444', fontSize: '16px', fontWeight: 700 }}>
                            {executions.filter(e => e.status === 'failed').length}
                        </div>
                        <div style={{ color: '#555', fontSize: '10px' }}>Falhas</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#60a5fa', fontSize: '16px', fontWeight: 700 }}>
                            {executions.length > 0
                                ? formatDuration(
                                    Math.round(executions.reduce((acc, e) => acc + (e.duration || 0), 0) / executions.length)
                                )
                                : '—'}
                        </div>
                        <div style={{ color: '#555', fontSize: '10px' }}>Média</div>
                    </div>
                </div>
            )}
        </div>
    )
}
