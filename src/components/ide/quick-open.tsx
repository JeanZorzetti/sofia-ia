'use client'

// ─────────────────────────────────────────────────────────
// Quick Open — Ctrl+P fuzzy file search (VS Code style)
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, File, Folder } from 'lucide-react'
import type { FileTreeEntry } from '@/services/desktop-service'

// ── Extension → color ───────────────────────────────────────
const EXT_COLORS: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
    json: '#5b9a32', md: '#fff', css: '#264de4', html: '#e44d26',
    py: '#3776ab', prisma: '#2d3748', sql: '#e38c00',
}

interface QuickOpenProps {
    tree: FileTreeEntry[]
    rootPath: string
    onSelect: (path: string) => void
    onClose: () => void
}

function flattenTree(entries: FileTreeEntry[]): FileTreeEntry[] {
    const result: FileTreeEntry[] = []
    for (const entry of entries) {
        if (!entry.isDirectory) {
            result.push(entry)
        }
        if (entry.children) {
            result.push(...flattenTree(entry.children))
        }
    }
    return result
}

export function QuickOpen({ tree, rootPath, onSelect, onClose }: QuickOpenProps) {
    const [query, setQuery] = useState('')
    const [selectedIdx, setSelectedIdx] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // Flatten tree to file list
    const allFiles = useMemo(() => flattenTree(tree), [tree])

    // Fuzzy filter
    const filtered = useMemo(() => {
        if (!query.trim()) return allFiles.slice(0, 50)
        const q = query.toLowerCase()
        return allFiles
            .filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
            .sort((a, b) => {
                // Prioritize name matches over path matches
                const aNameMatch = a.name.toLowerCase().includes(q)
                const bNameMatch = b.name.toLowerCase().includes(q)
                if (aNameMatch && !bNameMatch) return -1
                if (!aNameMatch && bNameMatch) return 1
                // Prioritize exact start match
                const aStartsWith = a.name.toLowerCase().startsWith(q)
                const bStartsWith = b.name.toLowerCase().startsWith(q)
                if (aStartsWith && !bStartsWith) return -1
                if (!aStartsWith && bStartsWith) return 1
                return a.name.localeCompare(b.name)
            })
            .slice(0, 30)
    }, [query, allFiles])

    // Reset selection on filter change
    useEffect(() => {
        setSelectedIdx(0)
    }, [filtered.length])

    // Auto-focus
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    // Scroll selected into view
    useEffect(() => {
        const list = listRef.current
        if (!list) return
        const item = list.children[selectedIdx] as HTMLElement
        if (item) item.scrollIntoView({ block: 'nearest' })
    }, [selectedIdx])

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIdx(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (filtered[selectedIdx]) {
                onSelect(filtered[selectedIdx].path)
                onClose()
            }
        } else if (e.key === 'Escape') {
            onClose()
        }
    }, [filtered, selectedIdx, onSelect, onClose])

    // Relative path helper
    const getRelPath = (fullPath: string) => {
        const normalized = fullPath.replace(/\\/g, '/')
        const rootNorm = rootPath.replace(/\\/g, '/')
        if (normalized.startsWith(rootNorm)) {
            return normalized.slice(rootNorm.length + 1)
        }
        return normalized
    }

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
                }}
            />

            {/* Dialog */}
            <div style={{
                position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
                width: '520px', maxHeight: '420px', zIndex: 101,
                background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}>
                {/* Search input */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <Search size={16} style={{ color: '#555', flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar arquivo por nome..."
                        style={{
                            background: 'none', border: 'none', outline: 'none',
                            color: '#ddd', fontSize: '14px', width: '100%',
                            fontFamily: 'inherit',
                        }}
                    />
                    <span style={{
                        fontSize: '10px', color: '#444', whiteSpace: 'nowrap',
                        background: 'rgba(255,255,255,0.04)', padding: '2px 6px',
                        borderRadius: '3px', border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        ESC
                    </span>
                </div>

                {/* Results */}
                <div ref={listRef} style={{
                    maxHeight: '340px', overflowY: 'auto', padding: '4px 0',
                }}>
                    {filtered.length === 0 && (
                        <div style={{
                            padding: '24px', textAlign: 'center',
                            color: '#444', fontSize: '13px',
                        }}>
                            Nenhum arquivo encontrado
                        </div>
                    )}
                    {filtered.map((file, idx) => {
                        const ext = file.name.split('.').pop()?.toLowerCase() || ''
                        const isSelected = idx === selectedIdx
                        const relPath = getRelPath(file.path)
                        const dirPart = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : ''

                        return (
                            <div
                                key={file.path}
                                onClick={() => { onSelect(file.path); onClose() }}
                                onMouseEnter={() => setSelectedIdx(idx)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '6px 16px', cursor: 'pointer',
                                    background: isSelected ? 'rgba(59,130,246,0.1)' : 'transparent',
                                    borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                                }}
                            >
                                <File size={14} style={{ color: EXT_COLORS[ext] || '#666', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{
                                        fontSize: '13px', color: isSelected ? '#fff' : '#ccc',
                                    }}>
                                        {file.name}
                                    </span>
                                    {dirPart && (
                                        <span style={{
                                            fontSize: '11px', color: '#444', marginLeft: '8px',
                                        }}>
                                            {dirPart}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </>
    )
}
