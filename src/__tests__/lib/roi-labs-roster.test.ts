/**
 * Unit tests for src/lib/companies/roi-labs-roster.ts (Feature 006).
 *
 * Pure data/logic — no DB, no network. Asserts the roster invariants
 * (INV-1..8 of contracts/roster-contract.md) so the seed never runs on a
 * malformed roster.
 */

import {
  ROI_LABS_ROSTER,
  buildSystemPrompt,
  validateRoster,
  blueprintRoleKeys,
  CEO_MODEL,
  DEFAULT_MODEL,
} from '@/lib/companies/roi-labs-roster'
import { BUILTIN_SKILLS } from '@/lib/skills/registry'

const builtinToolNames = BUILTIN_SKILLS
  .map(s => (s.toolDefinition as { name?: string } | undefined)?.name)
  .filter((n): n is string => Boolean(n))

describe('ROI Labs roster', () => {
  const keys = blueprintRoleKeys()

  it('blueprint exposes the 13 software_house roles', () => {
    expect(keys).toHaveLength(13)
  })

  it('passes validateRoster against blueprint keys + builtin skills (INV-1..8)', () => {
    const v = validateRoster(ROI_LABS_ROSTER, keys, builtinToolNames)
    expect(v.errors).toEqual([])
    expect(v.ok).toBe(true)
  })

  it('INV-1: has exactly 13 agent defs', () => {
    expect(ROI_LABS_ROSTER).toHaveLength(13)
  })

  it('INV-2: roleKeys match the blueprint set exactly', () => {
    expect(new Set(ROI_LABS_ROSTER.map(r => r.roleKey))).toEqual(new Set(keys))
  })

  it('INV-3/4: only the CEO uses Opus 4.8; the other 12 use Sonnet 4.6', () => {
    const opus = ROI_LABS_ROSTER.filter(r => r.model === CEO_MODEL)
    expect(opus.map(r => r.roleKey)).toEqual(['ceo'])
    expect(ROI_LABS_ROSTER.filter(r => r.model === DEFAULT_MODEL)).toHaveLength(12)
  })

  it('INV-5: no operational role delegates upward (to strategic/tactical)', () => {
    const layerOf = new Map(ROI_LABS_ROSTER.map(r => [r.roleKey, r.layer]))
    for (const r of ROI_LABS_ROSTER.filter(r => r.layer === 'operational')) {
      for (const t of r.delegatesTo) {
        expect(layerOf.get(t)).toBe('operational')
      }
    }
  })

  it('INV-6: memory is ON for strategic+tactical, OFF for operational', () => {
    for (const r of ROI_LABS_ROSTER) {
      expect(r.memoryEnabled).toBe(r.layer === 'strategic' || r.layer === 'tactical')
    }
  })

  it('INV-7: every skill exists in BUILTIN_SKILLS', () => {
    for (const r of ROI_LABS_ROSTER) {
      for (const s of r.skills) expect(builtinToolNames).toContain(s)
    }
  })

  it('INV-8: temperature is within [0,1]', () => {
    for (const r of ROI_LABS_ROSTER) {
      expect(r.temperature).toBeGreaterThanOrEqual(0)
      expect(r.temperature).toBeLessThanOrEqual(1)
    }
  })

  it('every system prompt is non-empty and declares hierarchy', () => {
    for (const r of ROI_LABS_ROSTER) {
      const prompt = buildSystemPrompt(r)
      expect(prompt.length).toBeGreaterThan(100)
      expect(prompt).toContain('Hierarquia e delegação')
      expect(prompt).toContain('delegate_to_agent')
    }
  })
})
