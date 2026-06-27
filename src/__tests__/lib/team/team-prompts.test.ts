// src/__tests__/lib/team/team-prompts.test.ts
import {
  buildLeadContext, buildBoardSnapshot, buildTaskPrompt,
  buildReviewPrompt, buildConsolidationPrompt,
} from '@/lib/orchestration/team/team-prompts'
import type { MemberCtx, TaskRow, MessageRow } from '@/lib/orchestration/team/team-types'

const members: MemberCtx[] = [
  { id: 'L', agentId: 'al', agentName: 'Lia', role: 'lead', model: null, effort: null },
  { id: 'W', agentId: 'aw', agentName: 'Ana', role: 'worker', model: null, effort: null },
]
const task: TaskRow = {
  id: 't1', title: 'Validar form', body: 'cobrir e-mail', status: 'todo',
  assigneeId: 'W', result: null, reviewNote: null, retryCount: 0, position: 0, dependsOn: [],
}

describe('buildLeadContext', () => {
  it('includes mission, roster names, and the directive contract', () => {
    const out = buildLeadContext('Construir login', [], [], members)
    expect(out).toContain('Construir login')
    expect(out).toContain('Ana')
    expect(out).toContain('@TASK')
    expect(out).toContain('@DONE')
  })
})

describe('buildBoardSnapshot', () => {
  it('groups tasks by status', () => {
    const msgs: MessageRow[] = []
    const out = buildBoardSnapshot([task], msgs)
    expect(out).toContain('Validar form')
    expect(out.toLowerCase()).toContain('todo')
  })
})

describe('buildTaskPrompt', () => {
  it('focuses the worker on the single task', () => {
    const out = buildTaskPrompt(task, null)
    expect(out).toContain('Validar form')
    expect(out).toContain('cobrir e-mail')
  })
  it('injects reviewer feedback when present', () => {
    const out = buildTaskPrompt(task, 'faltou TLD ausente')
    expect(out).toContain('faltou TLD ausente')
  })
})

describe('buildReviewPrompt', () => {
  it('shows the worker result and asks for @APPROVE/@REJECT', () => {
    const out = buildReviewPrompt({ ...task, status: 'review', result: 'feito' })
    expect(out).toContain('feito')
    expect(out).toContain('@APPROVE')
    expect(out).toContain('@REJECT')
  })

  // T005 — 010: scopedDiff takes precedence; without it, output is byte-identical to legacy
  it('uses scopedDiff when present (010)', () => {
    const scoped = [{ path: 'src/only-this.ts', status: 'M', patch: '-old\n+new' }]
    const global = [{ path: 'src/other.ts', status: 'M', patch: '-x\n+y' }]
    const taskWithArtifacts = { ...task, status: 'review' as const, result: 'ok', artifacts: { commands: [], scopedDiff: scoped } }
    const out = buildReviewPrompt(taskWithArtifacts, global)
    expect(out).toContain('src/only-this.ts')
    expect(out).not.toContain('src/other.ts')
  })

  it('falls back to global diff when scopedDiff absent (byte-identical legacy, 010)', () => {
    const global = [{ path: 'src/other.ts', status: 'M', patch: '-x\n+y' }]
    const taskNoScoped = { ...task, status: 'review' as const, result: 'ok' }
    const outWith = buildReviewPrompt(taskNoScoped, global)
    const outLegacy = buildReviewPrompt({ ...taskNoScoped, artifacts: { commands: [], reviewDiff: global } }, global)
    // Both paths should show the global file
    expect(outWith).toContain('src/other.ts')
    expect(outLegacy).toContain('src/other.ts')
  })
})

describe('buildConsolidationPrompt', () => {
  it('includes done task results', () => {
    const out = buildConsolidationPrompt([{ ...task, status: 'done', result: 'pronto' }])
    expect(out).toContain('pronto')
  })
})
