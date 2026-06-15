// Pure scheduling logic for SP3 (Scheduling/cron → Teams). No DB imports — tsx-testable.
// Consolidates the getNextRunAt logic previously DUPLICATED in
// src/app/api/cron/run-scheduled/route.ts and
// src/app/api/dashboard/scheduled-executions/route.ts (both legacy, untouched here).

export type SchedulePreset =
  | { frequency: 'daily'; hour: number; minute: number }
  | { frequency: 'weekly'; hour: number; minute: number; dayOfWeek: number } // 0=Sun..6=Sat
  | { frequency: 'monthly'; hour: number; minute: number; dayOfMonth: number } // 1..31

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.max(lo, Math.min(hi, Math.trunc(n)))
}

/** Number of days in the given month (monthIndex: 0=Jan..11=Dec). */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/**
 * Build a 5-field cron expression "min hour dayOfMonth month dayOfWeek" from a friendly
 * preset. daily → "m h * * *"; weekly → "m h * * dow"; monthly → "m h dom * *".
 */
export function cronFromPreset(p: SchedulePreset): string {
  const m = clamp(p.minute, 0, 59)
  const h = clamp(p.hour, 0, 23)
  if (p.frequency === 'weekly') {
    return `${m} ${h} * * ${clamp(p.dayOfWeek, 0, 6)}`
  }
  if (p.frequency === 'monthly') {
    return `${m} ${h} ${clamp(p.dayOfMonth, 1, 31)} * *`
  }
  return `${m} ${h} * * *`
}

/**
 * Next run time for a simple 5-field cron ("min hour dayOfMonth month dayOfWeek").
 * Covers the subset our presets generate (daily / weekly-by-dow / monthly-by-dom).
 * For monthly, a dayOfMonth past the month's length is clamped to the last day
 * (so "day 31" means "last day of month", never an overflow into the next month).
 * Always returns a Date strictly after `from`. Malformed expressions fall back to
 * the next round hour.
 */
export function getNextRunAt(cronExpr: string, from: Date = new Date()): Date {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) {
    const next = new Date(from)
    next.setHours(next.getHours() + 1, 0, 0, 0)
    return next
  }

  const [min, hour, dayOfMonth, , dayOfWeek] = parts
  const next = new Date(from)
  const targetMin = min === '*' ? 0 : parseInt(min, 10)
  const targetHour = hour === '*' ? from.getHours() : parseInt(hour, 10)
  next.setHours(targetHour, targetMin, 0, 0)

  if (dayOfWeek !== '*') {
    const targetDay = parseInt(dayOfWeek, 10) % 7
    const currentDay = from.getDay()
    let daysUntil = (targetDay - currentDay + 7) % 7
    if (daysUntil === 0 && next <= from) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
  } else if (dayOfMonth !== '*') {
    const targetDom = parseInt(dayOfMonth, 10)
    next.setDate(Math.min(targetDom, daysInMonth(next.getFullYear(), next.getMonth())))
    if (next <= from) {
      next.setMonth(next.getMonth() + 1, 1)
      next.setDate(Math.min(targetDom, daysInMonth(next.getFullYear(), next.getMonth())))
    }
  } else if (next <= from) {
    next.setDate(next.getDate() + 1)
  }

  return next
}

/** A schedule is due when its nextRunAt is at or before now. */
export function isDue(nextRunAt: Date, now: Date = new Date()): boolean {
  return nextRunAt.getTime() <= now.getTime()
}
