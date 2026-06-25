// 009-usecase-squads T006 — unit: predicado isSquadWhere + validateSquadComposition
// + schemas Zod (createSquadSchema, runSquadSchema). Jest roda no CI (não local).
import { isSquadWhere, validateSquadComposition } from '@/lib/companies/squad-store'
import { createSquadSchema, runSquadSchema } from '@/lib/validation'

describe('isSquadWhere', () => {
  it('gera where com companyId e status active', () => {
    const w = isSquadWhere('company-abc')
    expect(w).toEqual({ companyId: 'company-abc', status: 'active' })
  })
})

describe('validateSquadComposition', () => {
  const lead = { agentId: 'a1', role: 'lead' as const }
  const worker = { agentId: 'a2', role: 'worker' as const }
  const reviewer = { agentId: 'a3', role: 'reviewer' as const }

  it('valid: 1 lead + 1 worker', () => {
    expect(validateSquadComposition([lead, worker])).toEqual({ ok: true })
  })

  it('valid: 1 lead + worker + reviewer', () => {
    expect(validateSquadComposition([lead, worker, reviewer])).toEqual({ ok: true })
  })

  it('erro: sem lead', () => {
    const res = validateSquadComposition([worker, reviewer])
    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toMatch(/1 lead/)
  })

  it('erro: dois leads', () => {
    const res = validateSquadComposition([lead, { agentId: 'a4', role: 'lead' as const }, worker])
    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toMatch(/1 lead/)
  })

  it('erro: sem worker', () => {
    const res = validateSquadComposition([lead, reviewer])
    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toMatch(/worker/)
  })
})

describe('createSquadSchema', () => {
  const validBody = {
    name: 'Feature Squad',
    useCase: 'Implementar feature ponta-a-ponta',
    members: [
      { agentId: '00000000-0000-0000-0000-000000000001', role: 'lead' },
      { agentId: '00000000-0000-0000-0000-000000000002', role: 'worker' },
    ],
  }

  it('parseia body válido', () => {
    const r = createSquadSchema.safeParse(validBody)
    expect(r.success).toBe(true)
  })

  it('rejeita role inválida', () => {
    const r = createSquadSchema.safeParse({
      ...validBody,
      members: [{ agentId: '00000000-0000-0000-0000-000000000001', role: 'boss' }],
    })
    expect(r.success).toBe(false)
  })

  it('rejeita name vazio', () => {
    const r = createSquadSchema.safeParse({ ...validBody, name: '' })
    expect(r.success).toBe(false)
  })

  it('rejeita agentId não-UUID', () => {
    const r = createSquadSchema.safeParse({
      ...validBody,
      members: [{ agentId: 'not-a-uuid', role: 'lead' }],
    })
    expect(r.success).toBe(false)
  })
})

describe('runSquadSchema', () => {
  it('parseia missão válida', () => {
    expect(runSquadSchema.safeParse({ mission: 'Fazer algo importante' }).success).toBe(true)
  })

  it('rejeita missão vazia', () => {
    expect(runSquadSchema.safeParse({ mission: '' }).success).toBe(false)
  })

  it('rejeita ausência de mission', () => {
    expect(runSquadSchema.safeParse({}).success).toBe(false)
  })
})
