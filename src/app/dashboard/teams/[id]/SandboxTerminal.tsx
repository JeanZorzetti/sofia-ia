// src/app/dashboard/teams/[id]/SandboxTerminal.tsx
// Rich sandbox terminal for code-runs (Sub-projeto C — C2). Renders the per-task
// command transcripts (batch, captured in TeamTask.artifacts) in a real xterm.js
// terminal with ANSI colors, grouped by task. Loaded via next/dynamic({ssr:false})
// from TeamRunView, so xterm.js (DOM-only) never runs on the server.
'use client'

import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { Terminal as TerminalIcon } from 'lucide-react'

interface CommandRun { cmd: string; stdout: string; stderr: string; exitCode: number; ms: number }
interface TerminalTask { taskId: string; title: string; artifacts: { commands: CommandRun[] } }

// ANSI helpers (xterm interprets these escape codes).
const RESET = '\x1b[0m'
const c = (code: string, s: string) => `\x1b[${code}m${s}${RESET}`

/** Build the full ANSI transcript from the per-task command artifacts. */
function buildTranscript(tasks: TerminalTask[]): string {
  const out: string[] = []
  for (const t of tasks) {
    out.push(c('1;36', `▌ ${t.title}`)) // bold cyan task header
    if (t.artifacts.commands.length === 0) {
      out.push(c('90', '  — nenhum comando —'))
    }
    for (const cmd of t.artifacts.commands) {
      const codeColor = cmd.exitCode === 0 ? '90' : '31'
      out.push(`${c('32', '$')} ${c('97', cmd.cmd)} ${c(codeColor, `(exit ${cmd.exitCode} · ${cmd.ms}ms)`)}`)
      if (cmd.stdout.trim()) out.push(cmd.stdout.replace(/\s+$/, ''))
      if (cmd.stderr.trim()) out.push(c('31', cmd.stderr.replace(/\s+$/, '')))
    }
    out.push('') // blank line between tasks
  }
  return out.join('\n')
}

export default function SandboxTerminal({ tasks }: { tasks: TerminalTask[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  // Mount xterm once.
  useEffect(() => {
    if (!hostRef.current) return
    const term = new Terminal({
      convertEol: true, // treat \n as \r\n so captured stdout wraps lines correctly
      disableStdin: true,
      cursorBlink: false,
      cursorInactiveStyle: 'none',
      scrollback: 5000,
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
      theme: { background: '#0a0e14', foreground: '#e5e7eb', cursor: '#0a0e14' },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(hostRef.current)
    try { fit.fit() } catch { /* container not measured yet */ }
    termRef.current = term
    fitRef.current = fit

    const ro = new ResizeObserver(() => { try { fit.fit() } catch { /* ignore */ } })
    ro.observe(hostRef.current)

    return () => {
      ro.disconnect()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [])

  // Re-render the transcript whenever the tasks change (batch updates per task).
  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.reset()
    term.write(buildTranscript(tasks))
    try { fitRef.current?.fit() } catch { /* ignore */ }
  }, [tasks])

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0e14] p-4">
      <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
        <TerminalIcon className="h-4 w-4 text-emerald-400" /> Terminal do sandbox
      </h2>
      <div ref={hostRef} className="h-[480px] w-full" />
    </div>
  )
}
