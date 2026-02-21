'use client'

// ─────────────────────────────────────────────────────────
// IDE Terminal — Simple command output panel
// ─────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'
import { Terminal as TerminalIcon, X, Loader2, Trash2 } from 'lucide-react'
import { DesktopService } from '@/services/desktop-service'

interface TerminalLine {
    type: 'input' | 'stdout' | 'stderr' | 'info'
    content: string
    timestamp: string
}

interface IDETerminalProps {
    cwd: string
    onClose: () => void
}

export function IDETerminal({ cwd, onClose }: IDETerminalProps) {
    const [lines, setLines] = useState<TerminalLine[]>([
        { type: 'info', content: `Terminal — ${cwd}`, timestamp: new Date().toISOString() },
    ])
    const [input, setInput] = useState('')
    const [running, setRunning] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [lines])

    // Auto-focus
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const addLine = (type: TerminalLine['type'], content: string) => {
        setLines(prev => [...prev, { type, content, timestamp: new Date().toISOString() }])
    }

    const runCommand = useCallback(async () => {
        const cmd = input.trim()
        if (!cmd || running) return

        addLine('input', `$ ${cmd}`)
        setInput('')
        setRunning(true)

        try {
            const result = await DesktopService.runCommand(cmd, cwd)
            if (result) {
                if (result.stdout.trim()) {
                    addLine('stdout', result.stdout.trim())
                }
                if (result.stderr.trim()) {
                    addLine('stderr', result.stderr.trim())
                }
                if (result.exitCode !== 0) {
                    addLine('info', `Process exited with code ${result.exitCode}`)
                }
            } else {
                addLine('stderr', 'Terminal only available in Desktop mode')
            }
        } catch (err) {
            addLine('stderr', `Error: ${err}`)
        } finally {
            setRunning(false)
            inputRef.current?.focus()
        }
    }, [input, running, cwd])

    const clear = () => {
        setLines([{ type: 'info', content: `Terminal — ${cwd}`, timestamp: new Date().toISOString() }])
    }

    const lineColor = (type: TerminalLine['type']) => {
        switch (type) {
            case 'input': return '#a78bfa'
            case 'stdout': return '#ccc'
            case 'stderr': return '#f87171'
            case 'info': return '#555'
        }
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: '#0a0a0f', borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(255,255,255,0.02)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TerminalIcon size={12} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>TERMINAL</span>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                    <button onClick={clear} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '3px' }} title="Limpar">
                        <Trash2 size={12} />
                    </button>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '3px' }} title="Fechar">
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Output */}
            <div ref={scrollRef} onClick={() => inputRef.current?.focus()} style={{
                flex: 1, overflowY: 'auto', padding: '8px 12px',
                fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                fontSize: '12px', lineHeight: '1.6', cursor: 'text',
            }}>
                {lines.map((line, idx) => (
                    <div key={idx} style={{ color: lineColor(line.type), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {line.content}
                    </div>
                ))}
                {running && (
                    <div style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Executando...
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.04)',
                fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            }}>
                <span style={{ color: '#8b5cf6', fontSize: '12px', fontWeight: 700 }}>$</span>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') runCommand() }}
                    disabled={running}
                    placeholder="Digite um comando..."
                    style={{
                        flex: 1, background: 'none', border: 'none', outline: 'none',
                        color: '#ddd', fontSize: '12px', fontFamily: 'inherit',
                    }}
                />
            </div>
        </div>
    )
}
