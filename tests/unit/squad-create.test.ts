// 009-usecase-squads T008 — validação de composição do squad (domínio puro).
// Testa: exatamente 1 lead, agentes do dono, tamanho > teto → aviso (não erro).
import { validateSquadComposition } from '@/lib/companies/squad-store'

describe('validateSquadComposition', () => {
  const lead = { agentId: 'a1', role: 'lead' as const }
  const w1   = { agentId: 'a2', role: 'worker' as const }
  const w2   = { agentId: 'a3', role: 'worker' as const }
  const rev  = { agentId: 'a4', role: 'reviewer' as const }

  it('aceita 1 lead + 1 worker', () => {
    expect(validateSquadComposition([lead, w1])).toEqual({ ok: true })
  })

  it('aceita 1 lead + 2 workers + reviewer', () => {
    expect(validateSquadComposition([lead, w1, w2, rev])).toEqual({ ok: true })
  })

  it('rejeita 0 leads', () => {
    const r = validateSquadComposition([w1, rev])
    expect(r.ok).toBe(false)
  })

  it('rejeita 2 leads', () => {
    const r = validateSquadComposition([lead, { ...lead, agentId: 'a9' }, w1])
    expect(r.ok).toBe(false)
  })

  it('rejeita sem workers', () => {
    const r = validateSquadComposition([lead, rev])
    expect(r.ok).toBe(false)
  })

  it('aceita squad acima do teto (aviso, não erro)', () => {
    const big = [lead, w1, w2, rev, { agentId: 'a5', role: 'worker' as const }]
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const r = validateSquadComposition(big, { SQUAD_SIZE_WARN: 4 })
    expect(r.ok).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SC-001'))
    consoleSpy.mockRestore()
  })
})
