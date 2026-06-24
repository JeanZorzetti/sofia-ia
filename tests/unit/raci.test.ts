// 005-agentic-companies T018 — unit de validateRaci (regra de ouro). jest roda no CI.
import { validateRaci, type RaciMatrix } from '@/lib/companies/raci'
import { SDLC_PHASE_KEYS } from '@/lib/companies/sdlc'
import { getNicheBlueprint } from '@/lib/companies/company-blueprint'

const ROLE_KEYS = getNicheBlueprint('software_house')!.roles.map(r => r.key)

/** Constrói uma RACI mínima e válida: 1 A por fase no primeiro cargo. */
function validMatrix(): RaciMatrix {
  const m: RaciMatrix = {}
  for (const phase of SDLC_PHASE_KEYS) m[phase] = { [ROLE_KEYS[0]]: 'A', [ROLE_KEYS[1]]: 'R' }
  return m
}

describe('validateRaci — regra de ouro (1 A/fase)', () => {
  it('aprova a RACI semente do blueprint', () => {
    const seed = getNicheBlueprint('software_house')!.raci as RaciMatrix
    expect(validateRaci(seed, ROLE_KEYS)).toBeNull()
  })

  it('aprova uma matriz mínima válida', () => {
    expect(validateRaci(validMatrix(), ROLE_KEYS)).toBeNull()
  })

  it('rejeita fase com 0 Accountable', () => {
    const m = validMatrix()
    m.requirements = { [ROLE_KEYS[1]]: 'R' } // sem A
    expect(validateRaci(m, ROLE_KEYS)).toMatch(/Accountable/)
  })

  it('rejeita fase com 2 Accountable (Armadilha do A)', () => {
    const m = validMatrix()
    m.testing = { [ROLE_KEYS[0]]: 'A', [ROLE_KEYS[1]]: 'A' }
    expect(validateRaci(m, ROLE_KEYS)).toMatch(/Accountable/)
  })

  it('rejeita valor fora de {R,A,C,I}', () => {
    const m = validMatrix()
    m.design = { [ROLE_KEYS[0]]: 'A', [ROLE_KEYS[1]]: 'X' as never }
    expect(validateRaci(m, ROLE_KEYS)).toMatch(/inválido/)
  })

  it('rejeita cargo desconhecido', () => {
    const m = validMatrix()
    m.design = { [ROLE_KEYS[0]]: 'A', naoexiste: 'R' }
    expect(validateRaci(m, ROLE_KEYS)).toMatch(/desconhecido/)
  })

  it('rejeita fase ausente (0 A implícito)', () => {
    const m = validMatrix()
    delete m.maintenance
    expect(validateRaci(m, ROLE_KEYS)).toMatch(/Manutenção/)
  })
})
