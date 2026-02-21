'use client'

// ─────────────────────────────────────────────────────────
// Status Bar — Bottom bar with file info and cursor position
// ─────────────────────────────────────────────────────────

import { GitBranch, FileText } from 'lucide-react'

// ── Extension → language label ──────────────────────────────
const LANG_LABELS: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript', jsx: 'JavaScript React',
    json: 'JSON', md: 'Markdown', css: 'CSS', scss: 'SCSS', html: 'HTML',
    py: 'Python', rs: 'Rust', go: 'Go', sql: 'SQL', prisma: 'Prisma',
    yml: 'YAML', yaml: 'YAML', sh: 'Shell', dockerfile: 'Dockerfile',
    env: 'Environment', gitignore: 'Git Ignore', xml: 'XML',
    java: 'Java', kt: 'Kotlin', swift: 'Swift', rb: 'Ruby', php: 'PHP',
    c: 'C', cpp: 'C++', dart: 'Dart', lua: 'Lua', r: 'R',
}

interface StatusBarProps {
    fileName: string | null
    line: number
    column: number
    isDirty: boolean
    encoding?: string
}

export function StatusBar({ fileName, line, column, isDirty, encoding = 'UTF-8' }: StatusBarProps) {
    const ext = fileName?.split('.').pop()?.toLowerCase() || ''
    const langLabel = LANG_LABELS[ext] || 'Plain Text'

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '24px', padding: '0 12px',
            background: '#0a0a0f', borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: '11px', color: '#555', userSelect: 'none',
        }}>
            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <GitBranch size={12} />
                    main
                </span>
                {isDirty && (
                    <span style={{ color: '#f59e0b' }}>● Modificado</span>
                )}
            </div>

            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {fileName && (
                    <>
                        <span>Ln {line}, Col {column}</span>
                        <span>{encoding}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={11} />
                            {langLabel}
                        </span>
                    </>
                )}
                <span style={{ color: '#3b82f6', fontWeight: 500 }}>Sofia IDE</span>
            </div>
        </div>
    )
}
