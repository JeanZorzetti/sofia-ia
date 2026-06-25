// 009-usecase-squads T021 — unit: WIP=1 invariant em dispatchSquadQueue.
// Testa as invariantes de alto nível (pausa em rate_limited, sem run quando fila vazia,
// executa quando há pending). O advisory lock é testado por integração no CI.
import { dispatchSquadQueue } from '@/lib/companies/squad-queue'
import { prisma } from '@/lib/prisma'

const mockFindFirst = jest.fn()
const mockTransaction = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    teamRun: { findFirst: mockFindFirst },
    $transaction: mockTransaction,
  },
}))
jest.mock('@/lib/ai/claude-token-pool', () => ({ isClaudeRateLimit: jest.fn().mockReturnValue(false) }))
jest.mock('@/lib/orchestration/team/start-team-run', () => ({
  runTeamAndWait: jest.fn().mockResolvedValue({ status: 'completed', output: 'ok' }),
}))

describe('dispatchSquadQueue — invariantes WIP=1', () => {
  beforeEach(() => jest.clearAllMocks())

  it('pausa se há rate_limited com resetAt futuro', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'run-rl' }) // rate_limited check → found
    await dispatchSquadQueue()
    // Se pausou antes de chamar a transação, $transaction não é invocado.
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('não executa se $transaction (claimNextRun) retorna null', async () => {
    mockFindFirst.mockResolvedValueOnce(null) // rate_limited → none
    mockTransaction.mockResolvedValueOnce(null) // claimNextRun → nothing to claim
    await dispatchSquadQueue()
    const { runTeamAndWait } = await import('@/lib/orchestration/team/start-team-run')
    expect(runTeamAndWait).not.toHaveBeenCalled()
  })

  it('executa runTeamAndWait quando claimNextRun retorna run', async () => {
    const claimed = { id: 'run-1', teamId: 't1', mission: 'Test mission' }
    mockFindFirst
      .mockResolvedValueOnce(null)  // rate_limited → none (1ª chamada)
      .mockResolvedValueOnce(null)  // rate_limited → none (chamada recursiva)
    mockTransaction
      .mockResolvedValueOnce(claimed) // 1ª claim → encontrou
      .mockResolvedValueOnce(null)    // chamada recursiva → nada
    await dispatchSquadQueue()
    const { runTeamAndWait } = await import('@/lib/orchestration/team/start-team-run')
    expect(runTeamAndWait).toHaveBeenCalledWith('t1', { mission: 'Test mission' })
  })

  it('marca failed se runTeamAndWait lança erro', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({})
    ;(prisma.teamRun as unknown as Record<string, jest.Mock>).update = mockUpdate
    const claimed = { id: 'run-err', teamId: 't2', mission: 'Will fail' }
    mockFindFirst
      .mockResolvedValueOnce(null)  // rate_limited
      .mockResolvedValueOnce(null)  // rate_limited (recursivo)
    mockTransaction
      .mockResolvedValueOnce(claimed)
      .mockResolvedValueOnce(null)
    const { runTeamAndWait } = await import('@/lib/orchestration/team/start-team-run')
    ;(runTeamAndWait as jest.Mock).mockRejectedValueOnce(new Error('crashed'))
    await dispatchSquadQueue()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'run-err' }, data: expect.objectContaining({ status: 'failed' }) })
    )
  })
})
