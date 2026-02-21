'use client'

// ─────────────────────────────────────────────────────────
// File Tree — IDE sidebar with recursive directory listing
// ─────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react'
import {
    ChevronRight, ChevronDown, File, Folder, FolderOpen,
    FilePlus, FolderPlus, Trash2, RefreshCw, Search,
    Copy, Scissors, ClipboardPaste, Pencil,
} from 'lucide-react'
import type { FileTreeEntry } from '@/services/desktop-service'
import { ContextMenu, useContextMenu } from './context-menu'

// ── File extension → icon color mapping ────────────────────
const EXT_COLORS: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
    json: '#5b9a32', md: '#ffffff', css: '#264de4', scss: '#cd6799',
    html: '#e44d26', py: '#3776ab', rs: '#dea584', go: '#00add8',
    sql: '#e38c00', prisma: '#2d3748', yml: '#cb171e', yaml: '#cb171e',
    env: '#ecd53f', gitignore: '#f05032', lock: '#555', svg: '#ffb13b',
    png: '#a855f7', jpg: '#a855f7', ico: '#a855f7',
}

function getFileColor(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    return EXT_COLORS[ext] || '#888'
}

interface FileTreeProps {
    tree: FileTreeEntry[]
    activeFile: string | null
    onFileSelect: (path: string) => void
    onRefresh: () => void
    onCreateFile: (dirPath: string, name: string) => void
    onCreateDir: (dirPath: string, name: string) => void
    onDelete: (path: string) => void
    onRename?: (oldPath: string, newName: string) => void
    onCopyPath?: (path: string) => void
    rootPath: string
}

export function FileTree({
    tree, activeFile, onFileSelect, onRefresh,
    onCreateFile, onCreateDir, onDelete, onRename, onCopyPath, rootPath,
}: FileTreeProps) {
    const [search, setSearch] = useState('')
    const [creating, setCreating] = useState<{ dir: string; type: 'file' | 'folder' } | null>(null)
    const [newName, setNewName] = useState('')
    const { menu, showMenu, closeMenu } = useContextMenu()

    const projectName = useMemo(() => {
        const parts = rootPath.replace(/\\/g, '/').split('/')
        return parts[parts.length - 1] || 'Project'
    }, [rootPath])

    const handleCreate = useCallback(() => {
        if (!creating || !newName.trim()) { setCreating(null); return }
        if (creating.type === 'file') {
            onCreateFile(creating.dir, newName.trim())
        } else {
            onCreateDir(creating.dir, newName.trim())
        }
        setNewName('')
        setCreating(null)
    }, [creating, newName, onCreateFile, onCreateDir])

    // Root-level context menu (right-click on empty area)
    const handleRootContextMenu = useCallback((e: React.MouseEvent) => {
        showMenu(e, [
            { label: 'Novo Arquivo', icon: <FilePlus size={14} />, onClick: () => setCreating({ dir: rootPath, type: 'file' }) },
            { label: 'Nova Pasta', icon: <FolderPlus size={14} />, onClick: () => setCreating({ dir: rootPath, type: 'folder' }) },
            { label: '', separator: true, onClick: () => { } },
            { label: 'Atualizar', icon: <RefreshCw size={14} />, onClick: onRefresh },
        ])
    }, [showMenu, rootPath, onRefresh])

    return (
        <div
            onContextMenu={handleRootContextMenu}
            style={{
                width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                background: 'rgba(13, 13, 17, 0.95)', borderRight: '1px solid rgba(255,255,255,0.06)',
                fontSize: '13px', color: '#ccc', userSelect: 'none',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#777', fontWeight: 600 }}>
                    {projectName}
                </span>
                <div style={{ display: 'flex', gap: '2px' }}>
                    <button onClick={() => setCreating({ dir: rootPath, type: 'file' })}
                        style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px' }}
                        title="Novo Arquivo">
                        <FilePlus size={14} />
                    </button>
                    <button onClick={() => setCreating({ dir: rootPath, type: 'folder' })}
                        style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px' }}
                        title="Nova Pasta">
                        <FolderPlus size={14} />
                    </button>
                    <button onClick={onRefresh}
                        style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px' }}
                        title="Atualizar">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '4px 8px',
                }}>
                    <Search size={12} style={{ color: '#555' }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar arquivo..."
                        style={{
                            background: 'none', border: 'none', outline: 'none',
                            color: '#ccc', fontSize: '12px', width: '100%',
                        }}
                    />
                </div>
            </div>

            {/* New file/folder input */}
            {creating && (
                <div style={{
                    padding: '4px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                    {creating.type === 'folder' ? <Folder size={14} style={{ color: '#60a5fa' }} /> : <File size={14} style={{ color: '#888' }} />}
                    <input
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(null) }}
                        onBlur={handleCreate}
                        placeholder={creating.type === 'file' ? 'nome.ext' : 'pasta'}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: '3px', padding: '2px 6px', outline: 'none',
                            color: '#fff', fontSize: '12px', flex: 1,
                        }}
                    />
                </div>
            )}

            {/* Tree */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                {tree.map(entry => (
                    <TreeNode
                        key={entry.path}
                        entry={entry}
                        depth={0}
                        activeFile={activeFile}
                        search={search.toLowerCase()}
                        onFileSelect={onFileSelect}
                        onDelete={onDelete}
                        onCreateFile={onCreateFile}
                        onCreateDir={onCreateDir}
                        onRename={onRename}
                        onCopyPath={onCopyPath}
                        showContextMenu={showMenu}
                        setCreating={setCreating}
                    />
                ))}
            </div>

            {/* Context Menu */}
            {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />}
        </div>
    )
}

// ── Recursive tree node ─────────────────────────────────────
interface TreeNodeProps {
    entry: FileTreeEntry
    depth: number
    activeFile: string | null
    search: string
    onFileSelect: (path: string) => void
    onDelete: (path: string) => void
    onCreateFile: (dirPath: string, name: string) => void
    onCreateDir: (dirPath: string, name: string) => void
    onRename?: (oldPath: string, newName: string) => void
    onCopyPath?: (path: string) => void
    showContextMenu: (e: React.MouseEvent, items: any[]) => void
    setCreating: (v: { dir: string; type: 'file' | 'folder' } | null) => void
}

function TreeNode({ entry, depth, activeFile, search, onFileSelect, onDelete, onCreateFile, onCreateDir, onRename, onCopyPath, showContextMenu, setCreating }: TreeNodeProps) {
    const [expanded, setExpanded] = useState(depth < 1)
    const [hovering, setHovering] = useState(false)
    const [renaming, setRenaming] = useState(false)
    const [renameName, setRenameName] = useState(entry.name)

    const isActive = activeFile === entry.path

    // Filter by search
    if (search) {
        if (entry.isDirectory) {
            const hasMatch = entry.children?.some(function hasMatchRecursive(c: FileTreeEntry): boolean {
                if (c.name.toLowerCase().includes(search)) return true
                if (c.isDirectory && c.children) return c.children.some(hasMatchRecursive)
                return false
            })
            if (!hasMatch && !entry.name.toLowerCase().includes(search)) return null
        } else {
            if (!entry.name.toLowerCase().includes(search)) return null
        }
    }

    const handleClick = () => {
        if (renaming) return
        if (entry.isDirectory) {
            setExpanded(v => !v)
        } else {
            onFileSelect(entry.path)
        }
    }

    const handleRenameSubmit = () => {
        if (renameName.trim() && renameName.trim() !== entry.name && onRename) {
            onRename(entry.path, renameName.trim())
        }
        setRenaming(false)
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        const dirPath = entry.isDirectory ? entry.path : entry.path.replace(/[/\\][^/\\]*$/, '')

        const items = []

        if (!entry.isDirectory) {
            items.push({ label: 'Abrir', icon: <File size={14} />, onClick: () => onFileSelect(entry.path) })
            items.push({ label: '', separator: true, onClick: () => { } })
        }

        if (entry.isDirectory) {
            items.push({ label: 'Novo Arquivo', icon: <FilePlus size={14} />, onClick: () => setCreating({ dir: entry.path, type: 'file' }) })
            items.push({ label: 'Nova Pasta', icon: <FolderPlus size={14} />, onClick: () => setCreating({ dir: entry.path, type: 'folder' }) })
            items.push({ label: '', separator: true, onClick: () => { } })
        }

        items.push({
            label: 'Copiar Caminho', icon: <Copy size={14} />, shortcut: '', onClick: () => {
                navigator.clipboard?.writeText(entry.path)
                onCopyPath?.(entry.path)
            }
        })

        items.push({ label: 'Renomear', icon: <Pencil size={14} />, shortcut: 'F2', onClick: () => { setRenameName(entry.name); setRenaming(true) } })
        items.push({ label: '', separator: true, onClick: () => { } })
        items.push({ label: 'Excluir', icon: <Trash2 size={14} />, danger: true, onClick: () => onDelete(entry.path) })

        showContextMenu(e, items)
    }

    return (
        <>
            <div
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: `2px 8px 2px ${12 + depth * 16}px`,
                    cursor: 'pointer',
                    background: isActive ? 'rgba(59,130,246,0.12)' : hovering ? 'rgba(255,255,255,0.04)' : 'transparent',
                    borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                    transition: 'background 0.1s',
                }}
            >
                {/* Chevron */}
                {entry.isDirectory ? (
                    expanded
                        ? <ChevronDown size={14} style={{ color: '#555', flexShrink: 0 }} />
                        : <ChevronRight size={14} style={{ color: '#555', flexShrink: 0 }} />
                ) : (
                    <span style={{ width: 14, flexShrink: 0 }} />
                )}

                {/* Icon */}
                {entry.isDirectory ? (
                    expanded
                        ? <FolderOpen size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
                        : <Folder size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
                ) : (
                    <File size={14} style={{ color: getFileColor(entry.name), flexShrink: 0 }} />
                )}

                {/* Name or rename input */}
                {renaming ? (
                    <input
                        autoFocus
                        value={renameName}
                        onChange={e => setRenameName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false) }}
                        onBlur={handleRenameSubmit}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.4)',
                            borderRadius: '3px', padding: '1px 4px', outline: 'none',
                            color: '#fff', fontSize: '12px', flex: 1, minWidth: 0,
                        }}
                    />
                ) : (
                    <span style={{
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontSize: '12.5px', color: isActive ? '#fff' : entry.isDirectory ? '#ccc' : '#aaa',
                    }}>
                        {entry.name}
                    </span>
                )}

                {/* Hover actions */}
                {hovering && !renaming && (
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(entry.path) }}
                        style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '0 2px' }}
                        title="Deletar"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            {/* Children */}
            {entry.isDirectory && expanded && entry.children?.map(child => (
                <TreeNode
                    key={child.path}
                    entry={child}
                    depth={depth + 1}
                    activeFile={activeFile}
                    search={search}
                    onFileSelect={onFileSelect}
                    onDelete={onDelete}
                    onCreateFile={onCreateFile}
                    onCreateDir={onCreateDir}
                    onRename={onRename}
                    onCopyPath={onCopyPath}
                    showContextMenu={showContextMenu}
                    setCreating={setCreating}
                />
            ))}
        </>
    )
}
