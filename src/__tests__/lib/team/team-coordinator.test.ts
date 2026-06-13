// src/__tests__/lib/team/team-coordinator.test.ts
import { runTeam } from '@/lib/orchestration/team/team-coordinator'
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

describe('runTeam — happy path with reviewer approve', () => {
  it('drives a task todo→doing→review→done and consolidates', async () => {
    const { store, state } = createMemoryStore({ mission: 'Fazer X', members })
    const chat = scriptedChat({
      al: [
        '@TASK [worker:Ana] Implementar X\n  faça direito',
        '@DONE concluído',
      ],
      aw: ['resultado da Ana'],
      ar: ['@APPROVE'],
    })
    await runTeam('run-1', { store, chat })

    expect(state.status).toBe('completed')
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0].status).toBe('done')
    expect(state.tasks[0].result).toBe('resultado da Ana')
    expect(state.finished?.output).toBeTruthy()
    expect(state.finished?.tokensUsed).toBeGreaterThan(0)
  })
})

describe('runTeam — reject then retry then approve', () => {
  it('re-queues a rejected task with feedback and completes', async () => {
    const { store, state } = createMemoryStore({ mission: 'Fazer Y', members })
    let workerCalls = 0
    const chat: ChatFn = async (agentId) => {
      if (agentId === 'al') {
        return reply(state.tasks.length === 0 ? '@TASK [worker:Ana] Tarefa Y' : 'sem novas tarefas')
      }
      if (agentId === 'aw') { workerCalls++; return reply(`tentativa ${workerCalls}`) }
      if (agentId === 'ar') {
        const t = state.tasks[0]
        return reply(t.retryCount === 0 ? '@REJECT corrija o caso A' : '@APPROVE')
      }
      return reply('@DONE')
    }
    await runTeam('run-1', { store, chat })

    expect(state.status).toBe('completed')
    expect(workerCalls).toBe(2)
    expect(state.tasks[0].status).toBe('done')
    expect(state.tasks[0].retryCount).toBe(1)
    expect(state.messages.some(m => m.kind === 'review' && /corrija/.test(m.content))).toBe(true)
  })
})

describe('runTeam — no reviewer auto-approves', () => {
  it('moves worker output straight to done', async () => {
    const noReviewer = members.filter(m => m.role !== 'reviewer')
    const { store, state } = createMemoryStore({ mission: 'Z', members: noReviewer })
    const chat = scriptedChat({ al: ['@TASK [worker:Ana] Z'], aw: ['feito'] })
    await runTeam('run-1', { store, chat })
    expect(state.tasks[0].status).toBe('done')
    expect(state.status).toBe('completed')
  })
})

describe('runTeam — cancellation', () => {
  it('stops and marks cancelled when status flips mid-run', async () => {
    const { store, state, cancel } = createMemoryStore({ mission: 'C', members })
    const chat: ChatFn = async (agentId) => {
      if (agentId === 'al') { cancel(); return reply('@TASK [worker:Ana] X') }
      return reply('x')
    }
    await runTeam('run-1', { store, chat })
    expect(state.status).toBe('cancelled')
  })
})

describe('runTeam — maxTurns guard', () => {
  it('stops after maxTurns without an infinite loop', async () => {
    const { store, state } = createMemoryStore({
      mission: 'loop', members, config: { maxTurns: 2, retryCap: 5 },
    })
    const chat: ChatFn = async (agentId) => {
      if (agentId === 'al') return reply(state.tasks.length === 0 ? '@TASK [worker:Ana] T' : 'nada')
      if (agentId === 'aw') return reply('tentativa')
      if (agentId === 'ar') return reply('@REJECT de novo')
      return reply('x')
    }
    await runTeam('run-1', { store, chat })
    expect(state.status).toBe('completed')
    expect(state.finished?.turnsUsed).toBe(2)
  })
})
