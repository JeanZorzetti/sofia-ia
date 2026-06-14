// src/lib/orchestration/team/code-protocol.ts
// Pure parser for the code-agent exec protocol (Sub-projeto C — Code Factory).
// A member running code responds with line directives:
//   @RUN <shell command>     (one per line; may repeat)
//   @DONE <final summary>    (when the task is finished; trailing lines accumulate)
// No I/O — safe to unit test in isolation (mirrors team-protocol.ts).

export interface CodeAction {
  type: 'run' | 'done'
  command?: string // for 'run'
  text?: string // for 'done'
}

/** Strip surrounding backticks / a leading shell prompt ("$ ") from a command. */
function stripCommand(raw: string): string {
  let cmd = raw.trim()
  if (cmd.startsWith('`') && cmd.endsWith('`') && cmd.length >= 2) cmd = cmd.slice(1, -1).trim()
  cmd = cmd.replace(/^\$\s+/, '')
  return cmd.trim()
}

/**
 * Parse a code-agent turn into ordered actions.
 * Directives must start a line: @RUN / @DONE (case-insensitive).
 * Lines after @DONE accumulate as its text. Non-directive lines elsewhere are ignored.
 */
export function parseCodeActions(text: string): CodeAction[] {
  const lines = text.split(/\r?\n/)
  const actions: CodeAction[] = []
  let done: CodeAction | null = null

  const flushDone = () => {
    if (!done) return
    done.text = (done.text ?? '').trim()
    actions.push(done)
    done = null
  }

  for (const line of lines) {
    const runM = line.match(/^@RUN\b\s*(.*)$/i)
    const doneM = line.match(/^@DONE\b\s*(.*)$/i)

    if (runM) {
      flushDone()
      const cmd = stripCommand(runM[1])
      if (cmd) actions.push({ type: 'run', command: cmd })
    } else if (doneM) {
      flushDone()
      done = { type: 'done', text: doneM[1] }
    } else if (done) {
      done.text = done.text ? `${done.text}\n${line}` : line
    }
  }
  flushDone()
  return actions
}
