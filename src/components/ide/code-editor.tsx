'use client'

// ─────────────────────────────────────────────────────────
// Code Editor — Monaco Editor wrapper for Sofia IDE
// ─────────────────────────────────────────────────────────

import { useRef, useCallback, useEffect } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Code2, Loader2 } from 'lucide-react'

// ── Extension → Monaco language mapping ─────────────────────
const LANG_MAP: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', scss: 'scss', less: 'less',
    html: 'html', xml: 'xml', py: 'python', rs: 'rust', go: 'go',
    sql: 'sql', sh: 'shell', bash: 'shell', zsh: 'shell',
    yml: 'yaml', yaml: 'yaml', toml: 'ini',
    prisma: 'graphql', graphql: 'graphql', gql: 'graphql',
    dockerfile: 'dockerfile', env: 'ini', gitignore: 'ini',
    'c': 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    java: 'java', kt: 'kotlin', swift: 'swift', rb: 'ruby', php: 'php',
    lua: 'lua', r: 'r', dart: 'dart',
}

function getLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    // Special filenames
    if (fileName.toLowerCase() === 'dockerfile') return 'dockerfile'
    if (fileName.toLowerCase() === 'makefile') return 'makefile'
    return LANG_MAP[ext] || 'plaintext'
}

interface CodeEditorProps {
    content: string
    fileName: string
    filePath: string
    onChange: (value: string) => void
    onSave: () => void
    onCursorChange: (line: number, column: number) => void
}

export function CodeEditor({
    content, fileName, filePath, onChange, onSave, onCursorChange,
}: CodeEditorProps) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    const language = getLanguage(fileName)

    const handleMount: OnMount = useCallback((editorInstance, monaco) => {
        editorRef.current = editorInstance

        // Custom dark theme matching Sofia
        monaco.editor.defineTheme('sofia-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'c586c0' },
                { token: 'string', foreground: 'ce9178' },
                { token: 'number', foreground: 'b5cea8' },
                { token: 'type', foreground: '4ec9b0' },
                { token: 'function', foreground: 'dcdcaa' },
                { token: 'variable', foreground: '9cdcfe' },
            ],
            colors: {
                'editor.background': '#0d0d11',
                'editor.foreground': '#d4d4d4',
                'editorLineNumber.foreground': '#444',
                'editorLineNumber.activeForeground': '#888',
                'editor.selectionBackground': '#264f7820',
                'editor.lineHighlightBackground': '#ffffff06',
                'editorCursor.foreground': '#3b82f6',
                'editorIndentGuide.background': '#ffffff08',
                'editorIndentGuide.activeBackground': '#ffffff15',
                'editorWidget.background': '#1a1a24',
                'editorSuggestWidget.background': '#1a1a24',
                'editorSuggestWidget.border': '#ffffff10',
                'list.hoverBackground': '#ffffff08',
                'list.activeSelectionBackground': '#3b82f620',
                'scrollbarSlider.background': '#ffffff08',
                'scrollbarSlider.hoverBackground': '#ffffff12',
            },
        })
        monaco.editor.setTheme('sofia-dark')

        // Cursor position tracking
        editorInstance.onDidChangeCursorPosition(e => {
            onCursorChange(e.position.lineNumber, e.position.column)
        })

        // Ctrl+S save
        editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            onSave()
        })

        // Focus the editor
        editorInstance.focus()
    }, [onCursorChange, onSave])

    // Update editor when switching files
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.focus()
        }
    }, [filePath])

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Editor
                height="100%"
                language={language}
                value={content}
                onChange={val => onChange(val || '')}
                onMount={handleMount}
                loading={
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '100%', background: '#0d0d11', color: '#555',
                    }}>
                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                        Carregando editor...
                    </div>
                }
                options={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                    fontLigatures: true,
                    lineHeight: 20,
                    tabSize: 2,
                    minimap: { enabled: true, maxColumn: 80, renderCharacters: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'off',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    guides: {
                        bracketPairs: true,
                        indentation: true,
                    },
                    suggest: {
                        preview: true,
                        showIcons: true,
                    },
                    padding: { top: 8, bottom: 8 },
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                    renderLineHighlight: 'line',
                    folding: true,
                    foldingHighlight: false,
                    links: true,
                    colorDecorators: true,
                }}
            />
        </div>
    )
}

// ── Empty state ─────────────────────────────────────────────
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
                    Sofia IDE
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
