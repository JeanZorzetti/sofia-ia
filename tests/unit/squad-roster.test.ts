// 009-usecase-squads T027 — unit: validateSquadBlueprint + buildSquadRoster.
import { validateSquadBlueprint, buildSquadRoster } from '@/lib/companies/squad-roster'
import { getBlueprintsForNiche } from '@/lib/companies/squad-blueprint'
import type { SquadBlueprint } from '@/lib/companies/squad-blueprint'

const FEATURE_BP: SquadBlueprint = {
  squadKey: 'test__feature',
  name: 'Feature',
  useCase: 'Feature end-to-end',
  members: [
    { roleKey: 'architect', role: 'lead' },
    { roleKey: 'backend',   role: 'worker' },
    { roleKey: 'frontend',  role: 'worker' },
    { roleKey: 'qa',        role: 'reviewer' },
  ],
}

describe('validateSquadBlueprint', () => {
  it('blueprint válido → ok', () => {
    expect(validateSquadBlueprint(FEATURE_BP)).toEqual({ ok: true })
  })

  it('rejeita blueprints sem squadKey', () => {
    const bp = { ...FEATURE_BP, squadKey: '' }
    const r = validateSquadBlueprint(bp)
    expect(r.ok).toBe(false)
  })

  it('rejeita blueprints com 0 leads', () => {
    const bp: SquadBlueprint = { ...FEATURE_BP, members: [{ roleKey: 'backend', role: 'worker' }] }
    const r = validateSquadBlueprint(bp)
    expect(r.ok).toBe(false)
    expect((r as { ok: false; error: string }).error).toMatch(/1 lead/)
  })

  it('rejeita blueprints com 2 leads', () => {
    const bp: SquadBlueprint = { ...FEATURE_BP, members: [
      { roleKey: 'architect', role: 'lead' },
      { roleKey: 'pm', role: 'lead' },
      { roleKey: 'backend', role: 'worker' },
    ]}
    const r = validateSquadBlueprint(bp)
    expect(r.ok).toBe(false)
    expect((r as { ok: false; error: string }).error).toMatch(/1 lead/)
  })
})

describe('buildSquadRoster', () => {
  const fullStaffing = { architect: 'a1', backend: 'a2', frontend: 'a3', qa: 'a4' }

  it('resolve todos os cargos ocupados', () => {
    const r = buildSquadRoster(FEATURE_BP, fullStaffing)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.roster).toHaveLength(4)
    expect(r.roster[0]).toMatchObject({ agentId: 'a1', role: 'lead', position: 0 })
  })

  it('pula cargos vagos (não critica, apenas omite)', () => {
    const staffing = { architect: 'a1', backend: 'a2' } // frontend e qa vagos
    const r = buildSquadRoster(FEATURE_BP, staffing)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // architect (lead) + backend (worker) — frontend e qa pulados
    expect(r.roster).toHaveLength(2)
  })

  it('retorna skipped se lead está vago', () => {
    const staffing = { backend: 'a2', frontend: 'a3' } // architect (lead) vago
    const r = buildSquadRoster(FEATURE_BP, staffing)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.skipped).toBe(true)
    expect(r.reason).toMatch(/lead.*architect/)
  })

  it('positions são incrementais (0,1,2,…)', () => {
    const r = buildSquadRoster(FEATURE_BP, fullStaffing)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    r.roster.forEach((entry, idx) => expect(entry.position).toBe(idx))
  })
})

describe('getBlueprintsForNiche', () => {
  it('software_house tem ≥3 blueprints', () => {
    const bps = getBlueprintsForNiche('software_house')
    expect(bps.length).toBeGreaterThanOrEqual(3)
  })

  it('todos os blueprints do software_house são válidos', () => {
    const bps = getBlueprintsForNiche('software_house')
    for (const bp of bps) {
      expect(validateSquadBlueprint(bp)).toEqual({ ok: true })
    }
  })

  it('nicho desconhecido retorna lista vazia', () => {
    expect(getBlueprintsForNiche('nonexistent_niche')).toEqual([])
  })
})
