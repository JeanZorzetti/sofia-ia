// src/lib/orchestration/team/team-protocol.ts
// Pure parsers for the Lead/Reviewer line-directive protocol.
// No I/O — safe to unit test in isolation.

import type { LeadAction, ReviewVerdict } from './team-types'

/**
 * Consume the leading `[key:value]` directives from a directive remainder.
 * Recognises an assignment target (`[worker:Nome]` / `[role:worker]` / `[para:Nome]`)
 * and, for G1, dependency declarations (`[after:#n]` / `[after:#1,#3]`). The two
 * may appear in either order. Only the FIRST non-`after` bracket becomes the
 * assignment target (parity with the legacy single-target parser); any further
 * non-`after` bracket is left in the remaining text.
 */
function extractDirectives(rest: string): {
  assignTo?: { kind: 'name' | 'role'; value: string }
  dependsOn?: number[]
  text: string
} {
  let s = rest
  let assignTo: { kind: 'name' | 'role'; value: string } | undefined
  let dependsOn: number[] | undefined
  for (;;) {
    const m = s.match(/^\s*\[([a-zA-Z]+)\s*:\s*([^\]]+)\]\s*(.*)$/)
    if (!m) break
    const key = m[1].toLowerCase()
    const value = m[2].trim()
    const remainder = m[3]
    if (key === 'after') {
      // pull every integer out of e.g. "#1,#3" / "1, 3" / "#2"
      const nums = (value.match(/\d+/g) ?? []).map(Number)
      if (nums.length > 0) dependsOn = [...(dependsOn ?? []), ...nums]
      s = remainder
      continue
    }
    if (assignTo) break // second non-after bracket → leave it in the text
    const kind: 'name' | 'role' = key === 'role' ? 'role' : 'name'
    assignTo = { kind, value }
    s = remainder
  }
  return { assignTo, dependsOn, text: s.trim() }
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
      const { assignTo, dependsOn, text } = extractDirectives(taskM[1])
      current = { type: 'task', title: text || 'Tarefa', body: '', assignTo, ...(dependsOn ? { dependsOn } : {}) }
    } else if (msgM) {
      flush()
      const { assignTo, text } = extractDirectives(msgM[1])
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
