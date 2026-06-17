// src/__tests__/lib/team/team-graph-coordinator.test.ts
// G0 (modo grafo opt-in): o dispatcher escolhe o executor por topologia e o
// runTeamGraph é, nesta fatia, paritário com runTeam (delega). Estes testes
// travam as duas garantias do G0: decisão de topologia + paridade de execução.
import { runTeam } from '@/lib/orchestration/team/team-coordinator'
import { runTeamGraph } from '@/lib/orchestration/team/team-graph-coordinator'
import { pickTopology } from '@/lib/orchestration/team/team-executor'
import { createMemoryStore } from './helpers/memory-store'
import type { MemberCtx, ChatFn, ChatResult } from '@/lib/orchestration/team/team-types'

const members: MemberCtx[] = [
  { id: 'L', agentId: 'al', agentName: 'Lia', role: 'lead', model: null, effort: null },
  { id: 'W', agentId: 'aw', agentName: 'Ana', role: 'worker', model: null, effort: null },
  { id: 'R', agentId: 'ar', agentName: 'Rex', role: 'reviewer', model: null, effort: null },
]
const reply = (message: string): ChatResult => ({ message, model: 'mock', usage: { total_tokens: 10 } })

function scriptedChat(script: Record<string, string[]>): ChatFn {
  const idx: Record<string, number> = {}
  return async (agentId) => {
    const queue = script[agentId] ?? []
    const i = idx[agentId] ?? 0
    idx[agentId] = i + 1
    return reply(queue[Math.min(i, queue.length - 1)] ?? '@DONE vazio')
  }
}

/** Wraps scriptedChat and records, in order, the title of each task the worker
 *  (agentId 'aw') is asked to execute — read from the `## Tarefa\n<title>` line
 *  buildTaskPrompt emits. Lets a test assert the EXECUTION ORDER of tasks. */
function recordingChat(script: Record<string, string[]>, executed: string[]): ChatFn {
  const base = scriptedChat(script)
  return async (agentId, messages, ctx, opts) => {
    if (agentId === 'aw') {
      const m = (messages[0]?.content ?? '').match(/## Tarefa\n(\S+)/)
      if (m) executed.push(m[1])
    }
    return base(agentId, messages, ctx, opts)
  }
}

describe('pickTopology — default linear, opt-in graph', () => {
  it('falls back to linear for missing/invalid config', () => {
    expect(pickTopology(null)).toBe('linear')
    expect(pickTopology(undefined)).toBe('linear')
    expect(pickTopology({})).toBe('linear')
    expect(pickTopology({ topology: 'linear' })).toBe('linear')
    expect(pickTopology({ topology: 'weird' })).toBe('linear')
    expect(pickTopology('graph')).toBe('linear') // not an object
  })
  it('returns graph only when explicitly set', () => {
    expect(pickTopology({ topology: 'graph' })).toBe('graph')
    expect(pickTopology({ maxTurns: 6, topology: 'graph' })).toBe('graph')
  })
})

describe('runTeamGraph — G0 parity with runTeam', () => {
  it('produces identical terminal state on the happy path (task→review→done)', async () => {
    const script = {
      al: ['@TASK [worker:Ana] Implementar X\n  faça direito', '@DONE concluído'],
      aw: ['resultado da Ana'],
      ar: ['@APPROVE'],
    }
    const lin = createMemoryStore({ mission: 'Fazer X', members })
    await runTeam('run-1', { store: lin.store, chat: scriptedChat(script) })

    const gra = createMemoryStore({ mission: 'Fazer X', members })
    await runTeamGraph('run-1', { store: gra.store, chat: scriptedChat(script) })

    expect(gra.state.status).toBe('completed')
    expect(gra.state.status).toBe(lin.state.status)
    expect(gra.state.tasks.map(t => t.status)).toEqual(lin.state.tasks.map(t => t.status))
    expect(gra.state.tasks.map(t => t.result)).toEqual(lin.state.tasks.map(t => t.result))
    expect(gra.state.finished?.output).toBe(lin.state.finished?.output)
  })

  it('matches runTeam on the no-reviewer auto-approve path', async () => {
    const noReviewer = members.filter(m => m.role !== 'reviewer')
    const script = { al: ['@TASK [worker:Ana] Z'], aw: ['feito'] }

    const lin = createMemoryStore({ mission: 'Z', members: noReviewer })
    await runTeam('run-1', { store: lin.store, chat: scriptedChat(script) })

    const gra = createMemoryStore({ mission: 'Z', members: noReviewer })
    await runTeamGraph('run-1', { store: gra.store, chat: scriptedChat(script) })

    expect(gra.state.tasks[0].status).toBe('done')
    expect(gra.state.tasks.map(t => t.status)).toEqual(lin.state.tasks.map(t => t.status))
    expect(gra.state.status).toBe(lin.state.status)
  })
})

describe('runTeamGraph — G1 dependency gating (DAG)', () => {
  // Lead seeds A and B (B depends on the board #1 = A) in one turn, then @DONE.
  const depScript = {
    al: ['@TASK [worker:Ana] A\n@TASK [worker:Ana] [after:#1] B', '@DONE ok'],
    aw: ['resultado A', 'resultado B'],
    ar: ['@APPROVE', '@APPROVE'],
  }

  it('runs A before B when B depends on A — B never executes first', async () => {
    const executed: string[] = []
    const gra = createMemoryStore({ mission: 'M', members })
    await runTeamGraph('run-1', { store: gra.store, chat: recordingChat(depScript, executed) })

    expect(executed).toEqual(['A', 'B'])
    expect(executed.indexOf('A')).toBeLessThan(executed.indexOf('B'))
    const a = gra.state.tasks.find(t => t.title === 'A')!
    const b = gra.state.tasks.find(t => t.title === 'B')!
    expect(a.status).toBe('done')
    expect(b.status).toBe('done')
    expect(b.dependsOn).toEqual([a.id]) // display #1 resolved to A's real id
  })

  it('holds a dependent task in `blocked` while its dependency is not yet done', async () => {
    // Cap at one turn: A runs and is approved (→ done), but B must NOT run this
    // turn (its dep finishes only at the end of the turn) and stays `blocked`.
    const executed: string[] = []
    const gra = createMemoryStore({
      mission: 'M', members, config: { maxTurns: 1, retryCap: 2 },
    })
    await runTeamGraph('run-1', { store: gra.store, chat: recordingChat(depScript, executed) })

    expect(executed).toEqual(['A']) // B never executed
    const a = gra.state.tasks.find(t => t.title === 'A')!
    const b = gra.state.tasks.find(t => t.title === 'B')!
    expect(a.status).toBe('done')
    expect(b.status).toBe('blocked')
  })

  it('a graph team WITHOUT dependencies still runs like the linear path', async () => {
    const script = {
      al: ['@TASK [worker:Ana] X\n  faça', '@DONE concluído'],
      aw: ['resultado da Ana'],
      ar: ['@APPROVE'],
    }
    const lin = createMemoryStore({ mission: 'Fazer X', members })
    await runTeam('run-1', { store: lin.store, chat: scriptedChat(script) })

    const gra = createMemoryStore({ mission: 'Fazer X', members })
    await runTeamGraph('run-1', { store: gra.store, chat: scriptedChat(script) })

    expect(gra.state.status).toBe('completed')
    expect(gra.state.tasks.map(t => t.status)).toEqual(lin.state.tasks.map(t => t.status))
    expect(gra.state.finished?.output).toBe(lin.state.finished?.output)
  })
})
