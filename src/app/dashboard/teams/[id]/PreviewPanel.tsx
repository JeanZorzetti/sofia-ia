// src/app/dashboard/teams/[id]/PreviewPanel.tsx
// Preview mode (Lovable-style) — embeds the run's live dev server in an iframe.
// Client-only (loaded via next/dynamic ssr:false in TeamRunView). Polls GET .../preview
// as its own source of truth (independent of the run SSE stream, which closes ~45s after
// the run ends while the preview lives ~15min). Renders nothing unless the run opted in.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MonitorPlay, Monitor, Smartphone, RefreshCw, Square, ExternalLink, Loader2, Clock, AlertTriangle } from 'lucide-react'
import { shouldKeepPolling, RUN_FAILED } from './preview-poll'

interface PreviewState {
  runStatus: string | null
  previewEnabled: boolean
  previewStatus: string | null
  previewUrl: string | null
  previewExpiresAt: string | null
  previewError: string | null
}

const POLL_MS = 4000

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function PreviewPanel({ teamId, runId }: { teamId: string; runId: string }) {
  const [state, setState] = useState<PreviewState | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [busy, setBusy] = useState<'extend' | 'stop' | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const base = `/api/teams/${teamId}/runs/${runId}/preview`

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch(base)
      const j = await r.json()
      if (j.success) setState(j.data as PreviewState)
    } catch {
      /* transient — next tick retries */
    }
  }, [base])

  // Poll until the preview reaches a terminal state (failed/stopped/expired) — keeping it
  // running through the null→starting→live window so the iframe appears without a reload.
  useEffect(() => {
    fetchState()
    timerRef.current = setInterval(() => {
      setState(cur => {
        if (cur && !shouldKeepPolling(cur)) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
          return cur
        }
        fetchState()
        return cur
      })
    }, POLL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchState])

  // Local 1s tick for the countdown (the poll reconciles the real expiry).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  async function extend() {
    setBusy('extend')
    try { await fetch(`${base}/extend`, { method: 'POST' }); await fetchState() }
    finally { setBusy(null) }
  }
  async function stop() {
    setBusy('stop')
    try { await fetch(`${base}/stop`, { method: 'POST' }); await fetchState() }
    finally { setBusy(null) }
  }

  if (!state || !state.previewEnabled) return null
  // previewEnabled but the run failed before any preview could start → nothing to show.
  if (!state.previewStatus && RUN_FAILED.has(state.runStatus ?? '')) return null

  const status = state.previewStatus
  const remaining = state.previewExpiresAt ? new Date(state.previewExpiresAt).getTime() - now : 0

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-white text-sm flex items-center gap-2">
          <MonitorPlay className="h-4 w-4 text-cyan-400" /> Preview ao vivo
        </h2>
        {status === 'live' && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> No ar
          </span>
        )}
        {status === 'live' && state.previewExpiresAt && (
          <span className={`inline-flex items-center gap-1 text-[11px] ${remaining < 120_000 ? 'text-amber-400' : 'text-white/40'}`}>
            <Clock className="h-3 w-3" /> expira em {fmtCountdown(remaining)}
          </span>
        )}

        {status === 'live' && (
          <div className="flex items-center gap-1 ml-auto">
            {/* device width toggle */}
            <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              {([
                { key: 'desktop', Icon: Monitor },
                { key: 'mobile', Icon: Smartphone },
              ] as const).map(({ key, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDevice(key)}
                  className={`p-1.5 rounded-md transition-colors ${device === key ? 'bg-blue-500/20 text-blue-300' : 'text-white/40 hover:text-white/70'}`}
                  title={key === 'desktop' ? 'Desktop' : 'Mobile'}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={extend}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:text-white disabled:opacity-40"
            >
              {busy === 'extend' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Estender +15min
            </button>
            {state.previewUrl && (
              <a
                href={state.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Nova aba
              </a>
            )}
            <button
              type="button"
              onClick={stop}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-40"
            >
              {busy === 'stop' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />} Parar
            </button>
          </div>
        )}
      </div>

      {!status && (
        <div className="flex items-center justify-center gap-2 h-[120px] text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Preview iniciará quando o run concluir…
        </div>
      )}

      {status === 'starting' && (
        <div className="flex items-center justify-center gap-2 h-[120px] text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Subindo o preview (instalando deps + dev server)…
        </div>
      )}

      {status === 'live' && state.previewUrl && (
        <div className="rounded-lg overflow-hidden border border-white/10 bg-white flex justify-center">
          <iframe
            src={state.previewUrl}
            title="Preview do site"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="bg-white"
            style={{ width: device === 'mobile' ? 390 : '100%', height: 640, border: 'none' }}
          />
        </div>
      )}

      {status === 'failed' && (
        <div className="space-y-2 text-sm text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> O preview não subiu. A entrega de código (diff/PR) não foi afetada.
          </div>
          {state.previewError && (
            <pre className="text-[11px] text-amber-200/70 whitespace-pre-wrap break-words max-h-40 overflow-y-auto custom-scrollbar bg-black/30 rounded p-2 font-mono">
              {state.previewError}
            </pre>
          )}
        </div>
      )}

      {(status === 'stopped' || status === 'expired') && (
        <div className="text-sm text-white/40 bg-white/[0.03] border border-white/10 rounded-lg p-3">
          Preview {status === 'stopped' ? 'parado' : 'expirado'}. O sandbox foi encerrado — dispare a missão novamente para um novo preview.
        </div>
      )}
    </div>
  )
}
