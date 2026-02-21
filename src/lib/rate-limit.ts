interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 60s
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 60000)
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  entry.count++
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

// Pre-configured limits matching the original project
export const RATE_LIMITS = {
  general: { max: 1000, window: 15 * 60 * 1000 },
  auth: { max: 5, window: 15 * 60 * 1000 },
  instanceCreation: { max: 10, window: 10 * 60 * 1000 },
  qrCode: { max: 20, window: 5 * 60 * 1000 },
  messages: { max: 30, window: 60 * 1000 },
  aiChat: { max: 60, window: 60 * 1000 },           // 60 AI requests/min per user
  ideChat: { max: 120, window: 60 * 1000 },          // 120 IDE requests/min (devs iterate fast)
  orchestration: { max: 20, window: 60 * 1000 },     // 20 orchestration runs/min
} as const
