'use client'

// ─────────────────────────────────────────────────────────
// Editor empty state — lightweight fallback shown when no file is open.
// Kept in its own module (no Monaco import) so it can be bundled eagerly
// while the heavy CodeEditor is code-split via next/dynamic.
// ─────────────────────────────────────────────────────────

import { Code2 } from 'lucide-react'

export function EditorEmptyState() {
    return (
        <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#0d0d11',
            color: '#333', gap: '16px',
        }}>
            <Code2 size={48} strokeWidth={1} />
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '16px', color: '#555', marginBottom: '4px' }}>
                    Polaris IA IDE
                </p>
                <p style={{ fontSize: '12px', color: '#444' }}>
                    Selecione um arquivo para começar a editar
                </p>
            </div>
            <div style={{
                marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '6px', fontSize: '11px', color: '#333',
            }}>
                <span><kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>S</kbd> — Salvar</span>
            </div>
        </div>
    )
}

const kbdStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '3px', padding: '1px 5px', fontSize: '10px', fontFamily: 'monospace',
}
