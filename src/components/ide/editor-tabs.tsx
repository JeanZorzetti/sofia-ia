'use client'

// ─────────────────────────────────────────────────────────
// Editor Tabs — Multi-file tab bar with dirty indicators
// ─────────────────────────────────────────────────────────

import { useCallback } from 'react'
import { X, File } from 'lucide-react'

// ── Extension → color ───────────────────────────────────────
const EXT_COLORS: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
    json: '#5b9a32', md: '#ffffff', css: '#264de4', html: '#e44d26',
    py: '#3776ab', prisma: '#2d3748', sql: '#e38c00',
}

export interface OpenFile {
    path: string
    name: string
    isDirty: boolean
}

interface EditorTabsProps {
    openFiles: OpenFile[]
    activeFile: string | null
    onSelectTab: (path: string) => void
    onCloseTab: (path: string) => void
}

export function EditorTabs({ openFiles, activeFile, onSelectTab, onCloseTab }: EditorTabsProps) {
    const handleClose = useCallback((e: React.MouseEvent, path: string) => {
        e.stopPropagation()
        onCloseTab(path)
    }, [onCloseTab])

    if (openFiles.length === 0) return null

    return (
        <div style={{
            display: 'flex', alignItems: 'stretch', overflowX: 'auto',
            background: 'rgba(13, 13, 17, 0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            minHeight: '35px', scrollbarWidth: 'none',
        }}>
            {openFiles.map(file => {
                const isActive = file.path === activeFile
                const ext = file.name.split('.').pop()?.toLowerCase() || ''
                const dotColor = EXT_COLORS[ext] || '#888'

                return (
                    <div
                        key={file.path}
                        onClick={() => onSelectTab(file.path)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '0 12px', cursor: 'pointer',
                            background: isActive ? 'rgba(30, 30, 40, 1)' : 'transparent',
                            borderRight: '1px solid rgba(255,255,255,0.04)',
                            borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                            transition: 'background 0.15s',
                            whiteSpace: 'nowrap', flexShrink: 0, minWidth: 0,
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                        <File size={13} style={{ color: dotColor, flexShrink: 0 }} />
                        <span style={{
                            fontSize: '12px', color: isActive ? '#fff' : '#888',
                            maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {file.name}
                        </span>
                        {file.isDirty && (
                            <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: '#f59e0b', flexShrink: 0,
                            }} />
                        )}
                        <button
                            onClick={e => handleClose(e, file.path)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#555', padding: '2px', lineHeight: 0,
                                borderRadius: '3px',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                            onMouseLeave={e => e.currentTarget.style.color = '#555'}
                        >
                            <X size={12} />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
