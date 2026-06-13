// src/lib/orchestration/team/team-protocol.ts
// Pure parsers for the Lead/Reviewer line-directive protocol.
// No I/O — safe to unit test in isolation.

import type { LeadAction, ReviewVerdict } from './team-types'

/** Extracts a leading `[key:value]` target from a directive remainder. */
function extractTarget(rest: string): {
  assignTo?: { kind: 'name' | 'role'; value: string }
  text: string
} {
  const m = rest.match(/^\s*\[([a-zA-Z]+)\s*:\s*([^\]]+)\]\s*(.*)$/)
  if (!m) return { text: rest.trim() }
  const key = m[1].toLowerCase()
  const value = m[2].trim()
  const kind: 'name' | 'role' = key === 'role' ? 'role' : 'name'
  return { assignTo: { kind, value }, text: m[3].trim() }
}

/**
 * Parse the Lead's output into ordered actions.
 * Directives must start a line: @TASK / @MESSAGE / @DONE.
 * Indented / following lines after @TASK or @DONE accumulate as body/text.
 * Lines before the first directive are ignored.
 */
export function parseLeadActions(text: string): LeadAction[] {
  const lines = text.split(/\r?\n/)
  const actions: LeadAction[] = []
  let current: LeadAction | null = null

  const flush = () => {
    if (!current) return
    if (current.body !== undefined) current.body = current.body.trim()
    if (current.text !== undefined) current.text = current.text.trim()
    actions.push(current)
    current = null
  }

  for (const line of lines) {
    const taskM = line.match(/^@TASK\b\s*(.*)$/i)
    const msgM = line.match(/^@MESSAGE\b\s*(.*)$/i)
    const doneM = line.match(/^@DONE\b\s*(.*)$/i)

    if (taskM) {
      flush()
      const { assignTo, text } = extractTarget(taskM[1])
      current = { type: 'task', title: text || 'Tarefa', body: '', assignTo }
    } else if (msgM) {
      flush()
      const { assignTo, text } = extractTarget(msgM[1])
      actions.push({ type: 'message', to: assignTo?.value, summary: text })
      current = null
    } else if (doneM) {
      flush()
      current = { type: 'done', text: doneM[1] }
    } else if (current?.type === 'task') {
      current.body = current.body ? `${current.body}\n${line}` : line
    } else if (current?.type === 'done') {
      current.text = current.text ? `${current.text}\n${line}` : line
    }
  }
  flush()
  return actions
}

/**
 * Parse a Reviewer verdict. @REJECT (with optional reason) wins over @APPROVE.
 * No directive → lenient approve (the coordinator's retryCap bounds any loop).
 */
export function parseReviewVerdict(text: string): ReviewVerdict {
  const rejectM = text.match(/(?:^|\n)\s*@REJECT\b\s*([\s\S]*)/i)
  if (rejectM) {
    const reason = rejectM[1].trim()
    return { approved: false, reason: reason || undefined }
  }
  return { approved: true }
}
