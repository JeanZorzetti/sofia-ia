// Pure-logic verification for SP3 scheduling. Run: npx tsx scripts/sp3-verify.ts
// Imports are RELATIVE so tsx can load the module without path aliases.
import assert from 'node:assert'
import { cronFromPreset, getNextRunAt, isDue } from '../src/lib/orchestration/team/schedule'

// cronFromPreset — friendly preset → 5-field cron "m h dom * dow"
assert.equal(cronFromPreset({ frequency: 'daily', hour: 8, minute: 0 }), '0 8 * * *')
assert.equal(cronFromPreset({ frequency: 'weekly', hour: 8, minute: 30, dayOfWeek: 1 }), '30 8 * * 1')
assert.equal(cronFromPreset({ frequency: 'weekly', hour: 9, minute: 0, dayOfWeek: 0 }), '0 9 * * 0') // Sunday boundary
assert.equal(cronFromPreset({ frequency: 'monthly', hour: 9, minute: 0, dayOfMonth: 15 }), '0 9 15 * *')
// clamp out-of-range values
assert.equal(cronFromPreset({ frequency: 'daily', hour: 99, minute: -5 }), '0 23 * * *')

// getNextRunAt — daily, time already passed today → tomorrow
{
  const next = getNextRunAt('0 8 * * *', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getDate(), 16)
  assert.equal(next.getHours(), 8)
  assert.equal(next.getMinutes(), 0)
}
// getNextRunAt — daily, time still ahead today → today
{
  const next = getNextRunAt('0 8 * * *', new Date('2026-06-15T06:00:00'))
  assert.equal(next.getDate(), 15)
  assert.equal(next.getHours(), 8)
}
// weekly — 2026-06-15 is Monday(1); target Wed(3) → +2 days = the 17th
{
  const next = getNextRunAt('0 8 * * 3', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getDay(), 3)
  assert.equal(next.getDate(), 17)
}
// weekly — target day == today (Mon) but time passed → +7 = the 22nd
{
  const next = getNextRunAt('0 8 * * 1', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getDay(), 1)
  assert.equal(next.getDate(), 22)
}
// monthly — day-of-month already passed → next month
{
  const next = getNextRunAt('0 8 10 * *', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getMonth(), 6) // July (0-indexed)
  assert.equal(next.getDate(), 10)
}
// monthly — day still ahead this month → same month
{
  const next = getNextRunAt('0 8 20 * *', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getMonth(), 5) // June
  assert.equal(next.getDate(), 20)
}
// monthly — day 31 in a 30-day month → clamped to last day, NOT overflow into next month
{
  const next = getNextRunAt('0 8 31 * *', new Date('2026-06-15T10:00:00'))
  assert.equal(next.getMonth(), 5) // still June
  assert.equal(next.getDate(), 30) // clamped to June 30
}
// malformed expression → next round hour
{
  const next = getNextRunAt('garbage', new Date('2026-06-15T10:30:00'))
  assert.equal(next.getHours(), 11)
  assert.equal(next.getMinutes(), 0)
}
// isDue
assert.equal(isDue(new Date('2026-06-15T09:00:00'), new Date('2026-06-15T10:00:00')), true)
assert.equal(isDue(new Date('2026-06-15T11:00:00'), new Date('2026-06-15T10:00:00')), false)

console.log('✅ SP3 schedule.ts checks passed')
