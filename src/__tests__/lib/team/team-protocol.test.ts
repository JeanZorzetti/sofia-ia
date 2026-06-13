// src/__tests__/lib/team/team-protocol.test.ts
import { parseLeadActions, parseReviewVerdict } from '@/lib/orchestration/team/team-protocol'

describe('parseLeadActions', () => {
  it('parses a @TASK with a named worker and indented body', () => {
    const out = [
      '@TASK [worker:Ana] Implementar validação',
      '  Critério: cobre e-mail inválido',
      '  e campos obrigatórios',
    ].join('\n')
    const actions = parseLeadActions(out)
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      type: 'task',
      title: 'Implementar validação',
      assignTo: { kind: 'name', value: 'Ana' },
    })
    expect(actions[0].body).toContain('Critério: cobre e-mail inválido')
    expect(actions[0].body).toContain('campos obrigatórios')
  })

  it('parses @TASK [role:worker] as a role target', () => {
    const actions = parseLeadActions('@TASK [role:worker] Escrever testes')
    expect(actions[0].assignTo).toEqual({ kind: 'role', value: 'worker' })
    expect(actions[0].title).toBe('Escrever testes')
  })

  it('parses @MESSAGE with [para:Nome]', () => {
    const actions = parseLeadActions('@MESSAGE [para:Ana] Priorize e-mail inválido.')
    expect(actions).toEqual([
      { type: 'message', to: 'Ana', summary: 'Priorize e-mail inválido.' },
    ])
  })

  it('parses @DONE capturing following lines as text', () => {
    const out = '@DONE Resumo final:\nlinha 1\nlinha 2'
    const actions = parseLeadActions(out)
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('done')
    expect(actions[0].text).toBe('Resumo final:\nlinha 1\nlinha 2')
  })

  it('parses multiple tasks then a message', () => {
    const out = [
      '@TASK [worker:Ana] T1',
      '  corpo 1',
      '@TASK [worker:Bob] T2',
      '@MESSAGE [para:Ana] oi',
    ].join('\n')
    const actions = parseLeadActions(out)
    expect(actions.map(a => a.type)).toEqual(['task', 'task', 'message'])
    expect(actions[0].body).toBe('corpo 1')
    expect(actions[1].title).toBe('T2')
  })

  it('tolerates noise lines before the first directive', () => {
    const out = 'Vou organizar o trabalho.\n@TASK [worker:Ana] Fazer X'
    const actions = parseLeadActions(out)
    expect(actions).toHaveLength(1)
    expect(actions[0].title).toBe('Fazer X')
  })

  it('returns [] when there is no directive', () => {
    expect(parseLeadActions('apenas texto livre, sem diretivas')).toEqual([])
  })
})

describe('parseReviewVerdict', () => {
  it('detects @APPROVE', () => {
    expect(parseReviewVerdict('Tudo certo.\n@APPROVE')).toEqual({ approved: true })
  })
  it('detects @REJECT with reason', () => {
    expect(parseReviewVerdict('@REJECT falta cobrir TLD ausente')).toEqual({
      approved: false, reason: 'falta cobrir TLD ausente',
    })
  })
  it('reject wins when both appear', () => {
    expect(parseReviewVerdict('@APPROVE\n@REJECT na verdade não').approved).toBe(false)
  })
  it('defaults to approved when no directive (lenient, retryCap bounds loops)', () => {
    expect(parseReviewVerdict('parece ok pra mim')).toEqual({ approved: true })
  })
})
