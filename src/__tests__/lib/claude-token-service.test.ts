/**
 * 011-byos — pure helpers of the token service (Phase 2, T005). No DB/network:
 * normalization, format gate, and the persisted display mask.
 */
import { normalizeClaudeToken, isValidClaudeTokenFormat, maskClaudeToken } from '@/lib/settings/claude-token-service'

describe('normalizeClaudeToken', () => {
  it('trims surrounding whitespace and newlines', () => {
    expect(normalizeClaudeToken('  sk-ant-oat01-abc\n')).toBe('sk-ant-oat01-abc')
    expect(normalizeClaudeToken('\n\tsk-ant-oat01-xyz  ')).toBe('sk-ant-oat01-xyz')
  })
  it('leaves internal characters intact (internal ws is caught by format, not stripped)', () => {
    expect(normalizeClaudeToken('sk-ant-oat01-a b')).toBe('sk-ant-oat01-a b')
  })
})

describe('isValidClaudeTokenFormat', () => {
  it('accepts a well-formed oat token', () => {
    expect(isValidClaudeTokenFormat('sk-ant-oat01-' + 'x'.repeat(30))).toBe(true)
  })
  it('rejects a wrong prefix (e.g. an API key)', () => {
    expect(isValidClaudeTokenFormat('sk-ant-api03-' + 'x'.repeat(30))).toBe(false)
  })
  it('rejects internal whitespace', () => {
    expect(isValidClaudeTokenFormat('sk-ant-oat01-ab cd' + 'x'.repeat(20))).toBe(false)
  })
  it('rejects an implausibly short token', () => {
    expect(isValidClaudeTokenFormat('sk-ant-oat')).toBe(false)
  })
})

describe('maskClaudeToken', () => {
  it('shows first 10 + "..." + last 4', () => {
    expect(maskClaudeToken('sk-ant-oat01-abcdefgh4Kx')).toBe('sk-ant-oat...h4Kx')
  })
  it('never contains the middle of the token', () => {
    const token = 'sk-ant-oat01-SECRETMIDDLE-tail'
    expect(maskClaudeToken(token)).not.toContain('SECRETMIDDLE')
  })
})
