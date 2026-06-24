// 005-agentic-companies T025 — unit de buildPhaseRoster. jest roda no CI.
import { buildPhaseRoster, type Staffing } from '@/lib/companies/phase-roster'
import { getNicheBlueprint } from '@/lib/companies/company-blueprint'
import type { RaciMatrix } from '@/lib/companies/raci'

const RACI = getNicheBlueprint('software_house')!.raci as RaciMatrix

/** Staffing completo: cada cargo recebe um agentId determinístico. */
const fullStaffing: Staffing = Object.fromEntries(
  getNicheBlueprint('software_house')!.roles.map(r => [r.key, `agent-${r.key}`])
)

describe('buildPhaseRoster', () => {
  it('implementation: A(scrum_master)→lead, R(backend,frontend)→workers, sem reviewer', () => {
    const res = buildPhaseRoster(RACI, 'implementation', fullStaffing)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const lead = res.roster.find(m => m.role === 'lead')
    expect(lead?.agentId).toBe('agent-scrum_master')
    expect(res.roster.filter(m => m.role === 'worker').map(m => m.agentId).sort()).toEqual(['agent-backend', 'agent-frontend'])
    expect(res.roster.some(m => m.role === 'reviewer')).toBe(false)
  })

  it('testing: QA(R) é roteado a reviewer (loop de desalucinação)', () => {
    const res = buildPhaseRoster(RACI, 'testing', fullStaffing)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const reviewer = res.roster.find(m => m.role === 'reviewer')
    expect(reviewer?.agentId).toBe('agent-qa')
    expect(res.roster.filter(m => m.role === 'reviewer').length).toBe(1)
    // QA não aparece como worker (foi roteado a reviewer).
    expect(res.roster.filter(m => m.role === 'worker').map(m => m.agentId)).not.toContain('agent-qa')
    // Exatamente 1 lead.
    expect(res.roster.filter(m => m.role === 'lead').length).toBe(1)
  })

  it('erro quando o Accountable da fase está vago', () => {
    const partial: Staffing = { ...fullStaffing }
    delete partial.scrum_master // A de implementation
    const res = buildPhaseRoster(RACI, 'implementation', partial)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toMatch(/Accountable/)
  })

  it('erro quando todos os Responsáveis da fase estão vagos', () => {
    // requirements: A=ceo, R=pm,ba. Deixe só o A ocupado.
    const onlyA: Staffing = { ceo: 'agent-ceo' }
    const res = buildPhaseRoster(RACI, 'requirements', onlyA)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toMatch(/Responsável/)
  })
})
