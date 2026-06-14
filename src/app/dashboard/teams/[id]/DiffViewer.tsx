// src/app/dashboard/teams/[id]/DiffViewer.tsx
// Diff viewer for code-runs (Sub-projeto C — C2). Renders the per-file unified-diff
// patches captured worker-side (changedFiles[].patch) using diff2html, with a
// side-by-side / unified toggle. Loaded via next/dynamic({ssr:false}) from TeamRunView.
'use client'

import { useMemo, useState } from 'react'
import { html } from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'
import { FileDiff, Columns2, AlignJustify } from 'lucide-react'

interface ChangedFile { path: string; status: string; patch?: string; truncated?: boolean; binary?: boolean }
type OutputFormat = 'side-by-side' | 'line-by-line'

export default function DiffViewer({ changedFiles }: { changedFiles: ChangedFile[] }) {
  const [format, setFormat] = useState<OutputFormat>('line-by-line')

  const withPatch = changedFiles.filter(f => f.patch)
  const truncated = changedFiles.filter(f => f.truncated)
  const binary = changedFiles.filter(f => f.binary)

  const rendered = useMemo(() => {
    if (withPatch.length === 0) return ''
    const combined = withPatch.map(f => f.patch).join('\n')
    return html(combined, {
      drawFileList: false, // the delivery panel already lists files
      matching: 'lines',
      outputFormat: format,
      colorScheme: 'dark',
    } as Parameters<typeof html>[1])
  }, [withPatch, format])

  if (withPatch.length === 0) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-white text-sm flex items-center gap-2">
          <FileDiff className="h-4 w-4 text-blue-400" /> Diff das mudanças
        </h2>
        <div className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 p-0.5">
          <button
            type="button"
            onClick={() => setFormat('line-by-line')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors ${
              format === 'line-by-line' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <AlignJustify className="h-3 w-3" /> Unificado
          </button>
          <button
            type="button"
            onClick={() => setFormat('side-by-side')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors ${
              format === 'side-by-side' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Columns2 className="h-3 w-3" /> Lado a lado
          </button>
        </div>
      </div>

      <div
        className="max-h-[600px] overflow-auto custom-scrollbar rounded-lg text-[12px]"
        // diff2html outputs trusted HTML built from our own captured git diff (no user-controlled markup)
        dangerouslySetInnerHTML={{ __html: rendered }}
      />

      {(truncated.length > 0 || binary.length > 0) && (
        <div className="text-[11px] text-white/40 space-y-0.5">
          {truncated.length > 0 && (
            <div>⚠ {truncated.length} arquivo(s) com diff truncado (limite de tamanho).</div>
          )}
          {binary.length > 0 && (
            <div>⛔ {binary.length} arquivo(s) binário(s) sem diff de texto.</div>
          )}
        </div>
      )}
    </div>
  )
}
