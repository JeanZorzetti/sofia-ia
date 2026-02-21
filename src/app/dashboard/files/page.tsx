'use client'

// ─────────────────────────────────────────────────────────
// Sofia IDE — Code editor with AI assistance
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDesktop } from '@/contexts/DesktopContext'
import { DesktopService, type FileTreeEntry } from '@/services/desktop-service'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
    FolderOpen, AlertTriangle, Download, Code2,
    PanelLeftClose, PanelLeftOpen, Sparkles, Terminal,
} from 'lucide-react'

import { FileTree } from '@/components/ide/file-tree'
import { EditorTabs, type OpenFile } from '@/components/ide/editor-tabs'
import { CodeEditor, EditorEmptyState } from '@/components/ide/code-editor'
import { StatusBar } from '@/components/ide/status-bar'
import { AIPanel } from '@/components/ide/ai-panel'
import { QuickOpen } from '@/components/ide/quick-open'
import { IDETerminal } from '@/components/ide/terminal'

// ── File content cache ──────────────────────────────────────
interface FileState {
    content: string
    originalContent: string
    isDirty: boolean
}

export default function IDEPage() {
    const { isDesktop, currentDirectory, selectDirectory } = useDesktop()

    // File tree
    const [fileTree, setFileTree] = useState<FileTreeEntry[]>([])
    const [treeLoading, setTreeLoading] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [aiPanelOpen, setAiPanelOpen] = useState(false)

    // Editor state
    const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
    const [fileContents, setFileContents] = useState<Record<string, FileState>>({})

    // Cursor
    const [cursorLine, setCursorLine] = useState(1)
    const [cursorCol, setCursorCol] = useState(1)

    // Panels
    const [quickOpenVisible, setQuickOpenVisible] = useState(false)
    const [terminalOpen, setTerminalOpen] = useState(false)

    // ── Load file tree ──────────────────────────────────────
    const loadTree = useCallback(async () => {
        if (!currentDirectory) return
        setTreeLoading(true)
        try {
            const tree = await DesktopService.listFilesRecursive(currentDirectory, 4)
            setFileTree(tree)
        } catch (err) {
            console.error('Failed to load tree:', err)
            toast.error('Erro ao carregar árvore de arquivos')
        } finally {
            setTreeLoading(false)
        }
    }, [currentDirectory])

    useEffect(() => {
        if (currentDirectory) loadTree()
    }, [currentDirectory, loadTree])

    // ── Keyboard shortcuts ──────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Ctrl+P → Quick Open
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault()
                setQuickOpenVisible(v => !v)
            }
            // Ctrl+` → Toggle terminal
            if ((e.ctrlKey || e.metaKey) && e.key === '`') {
                e.preventDefault()
                setTerminalOpen(v => !v)
            }
            // Ctrl+B → Toggle sidebar
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault()
                setSidebarOpen(v => !v)
            }
            // Ctrl+Shift+I → Toggle AI panel
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
                e.preventDefault()
                setAiPanelOpen(v => !v)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    // ── Open file ───────────────────────────────────────────
    const handleFileSelect = useCallback(async (filePath: string) => {
        // Already open? Just switch tab
        if (fileContents[filePath]) {
            setActiveFilePath(filePath)
            return
        }

        // Read file content
        try {
            const content = await DesktopService.readFile(filePath)
            const fileName = filePath.replace(/\\/g, '/').split('/').pop() || 'untitled'

            setFileContents(prev => ({
                ...prev,
                [filePath]: { content, originalContent: content, isDirty: false }
            }))

            setOpenFiles(prev => {
                if (prev.some(f => f.path === filePath)) return prev
                return [...prev, { path: filePath, name: fileName, isDirty: false }]
            })

            setActiveFilePath(filePath)
        } catch (err) {
            console.error('Failed to read file:', err)
            toast.error('Erro ao abrir arquivo')
        }
    }, [fileContents])

    // ── Editor change ───────────────────────────────────────
    const handleEditorChange = useCallback((value: string) => {
        if (!activeFilePath) return

        setFileContents(prev => {
            const existing = prev[activeFilePath]
            if (!existing) return prev
            const isDirty = value !== existing.originalContent
            return {
                ...prev,
                [activeFilePath]: { ...existing, content: value, isDirty }
            }
        })

        setOpenFiles(prev => prev.map(f => {
            if (f.path !== activeFilePath) return f
            const existing = fileContents[activeFilePath]
            const isDirty = existing ? value !== existing.originalContent : false
            return { ...f, isDirty }
        }))
    }, [activeFilePath, fileContents])

    // ── Save file ───────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!activeFilePath) return
        const state = fileContents[activeFilePath]
        if (!state) return

        try {
            await DesktopService.writeFile(activeFilePath, state.content)

            setFileContents(prev => ({
                ...prev,
                [activeFilePath]: { ...state, originalContent: state.content, isDirty: false }
            }))
            setOpenFiles(prev => prev.map(f =>
                f.path === activeFilePath ? { ...f, isDirty: false } : f
            ))

            toast.success('Arquivo salvo', {
                description: activeFilePath.replace(/\\/g, '/').split('/').pop(),
                duration: 1500,
            })
        } catch (err) {
            console.error('Failed to save:', err)
            toast.error('Erro ao salvar arquivo')
        }
    }, [activeFilePath, fileContents])

    // ── Close tab ───────────────────────────────────────────
    const handleCloseTab = useCallback((path: string) => {
        const state = fileContents[path]
        if (state?.isDirty) {
            if (!confirm('Arquivo modificado. Descartar mudanças?')) return
        }

        setOpenFiles(prev => prev.filter(f => f.path !== path))
        setFileContents(prev => {
            const next = { ...prev }
            delete next[path]
            return next
        })

        if (activeFilePath === path) {
            setOpenFiles(prev => {
                const remaining = prev.filter(f => f.path !== path)
                setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null)
                return remaining
            })
        }
    }, [activeFilePath, fileContents])

    // ── Create file ─────────────────────────────────────────
    const handleCreateFile = useCallback(async (dirPath: string, name: string) => {
        const fullPath = `${dirPath}${dirPath.endsWith('/') || dirPath.endsWith('\\') ? '' : '/'}${name}`
        try {
            await DesktopService.createFile(fullPath)
            toast.success('Arquivo criado')
            loadTree()
            handleFileSelect(fullPath)
        } catch {
            toast.error('Erro ao criar arquivo')
        }
    }, [loadTree, handleFileSelect])

    // ── Create directory ────────────────────────────────────
    const handleCreateDir = useCallback(async (dirPath: string, name: string) => {
        const fullPath = `${dirPath}${dirPath.endsWith('/') || dirPath.endsWith('\\') ? '' : '/'}${name}`
        try {
            await DesktopService.createDirectory(fullPath)
            toast.success('Pasta criada')
            loadTree()
        } catch {
            toast.error('Erro ao criar pasta')
        }
    }, [loadTree])

    // ── Delete ──────────────────────────────────────────────
    const handleDelete = useCallback(async (path: string) => {
        const name = path.replace(/\\/g, '/').split('/').pop() || path
        if (!confirm(`Deletar "${name}"? Esta ação é irreversível.`)) return
        try {
            await DesktopService.deleteFile(path)
            toast.success('Deletado')
            loadTree()
            // Close tab if open
            if (fileContents[path]) {
                handleCloseTab(path)
            }
        } catch {
            toast.error('Erro ao deletar')
        }
    }, [loadTree, fileContents, handleCloseTab])

    // ── Rename ──────────────────────────────────────────────
    const handleRename = useCallback(async (oldPath: string, newName: string) => {
        const dir = oldPath.replace(/\\/g, '/').replace(/\/[^/]*$/, '')
        const newPath = `${dir}/${newName}`
        try {
            await DesktopService.renameFile(oldPath, newPath)
            toast.success(`Renomeado para "${newName}"`)
            loadTree()

            // Update open tabs if renamed file was open
            if (fileContents[oldPath]) {
                setFileContents(prev => {
                    const next = { ...prev }
                    next[newPath] = next[oldPath]
                    delete next[oldPath]
                    return next
                })
                setOpenFiles(prev => prev.map(f =>
                    f.path === oldPath ? { ...f, path: newPath, name: newName } : f
                ))
                if (activeFilePath === oldPath) setActiveFilePath(newPath)
            }
        } catch {
            toast.error('Erro ao renomear')
        }
    }, [loadTree, fileContents, activeFilePath])

    // ── Copy path ───────────────────────────────────────────
    const handleCopyPath = useCallback((path: string) => {
        toast.success('Caminho copiado', { duration: 1200 })
    }, [])

    // ── Active file info ────────────────────────────────────
    const activeState = activeFilePath ? fileContents[activeFilePath] : null
    const activeFileName = activeFilePath?.replace(/\\/g, '/').split('/').pop() || null

    // ── Not Desktop ─────────────────────────────────────────
    if (!isDesktop) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', background: '#0d0d11',
            }}>
                <div style={{
                    textAlign: 'center', maxWidth: '420px', padding: '40px',
                    background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <AlertTriangle size={40} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
                    <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                        Modo Desktop Necessário
                    </h2>
                    <p style={{ color: '#777', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
                        A IDE com acesso ao sistema de arquivos só funciona na versão Desktop da Sofia.
                    </p>
                    <Button variant="outline" onClick={() => window.open('https://github.com/JeanZorzetti/sofia-ia', '_blank')}>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Desktop
                    </Button>
                </div>
            </div>
        )
    }

    // ── No directory selected ───────────────────────────────
    if (!currentDirectory) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', background: '#0d0d11',
            }}>
                <div style={{
                    textAlign: 'center', maxWidth: '420px', padding: '40px',
                    background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <Code2 size={48} strokeWidth={1} style={{ color: '#3b82f6', margin: '0 auto 16px' }} />
                    <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                        Sofia IDE
                    </h2>
                    <p style={{ color: '#777', fontSize: '13px', lineHeight: '1.6', marginBottom: '24px' }}>
                        Abra um projeto para começar. A Sofia vai analisar seu código com IA
                        e ajudar com refatorações, debugging e sugestões.
                    </p>
                    <Button onClick={selectDirectory} size="lg" style={{
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        border: 'none', color: '#fff', gap: '8px',
                    }}>
                        <FolderOpen className="h-5 w-5" />
                        Abrir Projeto
                    </Button>
                </div>
            </div>
        )
    }

    // ── IDE Layout ──────────────────────────────────────────
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)',
            background: '#0d0d11', overflow: 'hidden',
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(13, 13, 17, 0.98)',
            }}>
                <button
                    onClick={() => setSidebarOpen(v => !v)}
                    style={{
                        background: 'none', border: 'none', color: '#555',
                        cursor: 'pointer', padding: '4px', borderRadius: '4px',
                    }}
                    title={sidebarOpen ? 'Fechar painel' : 'Abrir painel'}
                >
                    {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                </button>

                <div style={{
                    fontSize: '11px', color: '#555', fontFamily: 'monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                    📂 {currentDirectory}
                </div>

                <button
                    onClick={() => setTerminalOpen(v => !v)}
                    style={{
                        background: terminalOpen ? 'rgba(139,92,246,0.15)' : 'none',
                        border: terminalOpen ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                        color: terminalOpen ? '#a78bfa' : '#555',
                        cursor: 'pointer', padding: '3px 8px', borderRadius: '4px',
                        fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                        transition: 'all 0.15s',
                    }}
                    title="Terminal (Ctrl+`)"
                >
                    <Terminal size={13} />
                </button>

                <button
                    onClick={() => setAiPanelOpen(v => !v)}
                    style={{
                        background: aiPanelOpen ? 'rgba(139,92,246,0.15)' : 'none',
                        border: aiPanelOpen ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                        color: aiPanelOpen ? '#a78bfa' : '#555',
                        cursor: 'pointer', padding: '3px 8px', borderRadius: '4px',
                        fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                        transition: 'all 0.15s',
                    }}
                    title="Sofia IA (Ctrl+Shift+I)"
                >
                    <Sparkles size={13} />
                    IA
                </button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectDirectory}
                    style={{ fontSize: '11px', color: '#666', height: '26px' }}
                >
                    <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                    Alterar
                </Button>
            </div>

            {/* Main layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* File Tree */}
                {sidebarOpen && (
                    <div style={{ width: '240px', flexShrink: 0, overflow: 'hidden' }}>
                        <FileTree
                            tree={fileTree}
                            activeFile={activeFilePath}
                            rootPath={currentDirectory}
                            onFileSelect={handleFileSelect}
                            onRefresh={loadTree}
                            onCreateFile={handleCreateFile}
                            onCreateDir={handleCreateDir}
                            onDelete={handleDelete}
                            onRename={handleRename}
                            onCopyPath={handleCopyPath}
                        />
                    </div>
                )}

                {/* Editor area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Tabs */}
                    <EditorTabs
                        openFiles={openFiles}
                        activeFile={activeFilePath}
                        onSelectTab={setActiveFilePath}
                        onCloseTab={handleCloseTab}
                    />

                    {/* Editor + Terminal */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Editor */}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            {activeState ? (
                                <CodeEditor
                                    content={activeState.content}
                                    fileName={activeFileName || ''}
                                    filePath={activeFilePath || ''}
                                    onChange={handleEditorChange}
                                    onSave={handleSave}
                                    onCursorChange={(ln, col) => { setCursorLine(ln); setCursorCol(col) }}
                                />
                            ) : (
                                <EditorEmptyState />
                            )}
                        </div>

                        {/* Terminal */}
                        {terminalOpen && currentDirectory && (
                            <div style={{ height: '200px', flexShrink: 0 }}>
                                <IDETerminal
                                    cwd={currentDirectory}
                                    onClose={() => setTerminalOpen(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Panel */}
                {aiPanelOpen && (
                    <div style={{ width: '340px', flexShrink: 0, overflow: 'hidden' }}>
                        <AIPanel
                            fileName={activeFileName}
                            filePath={activeFilePath}
                            fileContent={activeState?.content || null}
                            onClose={() => setAiPanelOpen(false)}
                        />
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <StatusBar
                fileName={activeFileName}
                line={cursorLine}
                column={cursorCol}
                isDirty={activeState?.isDirty || false}
            />

            {/* Quick Open Overlay */}
            {quickOpenVisible && (
                <QuickOpen
                    tree={fileTree}
                    rootPath={currentDirectory || ''}
                    onSelect={handleFileSelect}
                    onClose={() => setQuickOpenVisible(false)}
                />
            )}
        </div>
    )
}
