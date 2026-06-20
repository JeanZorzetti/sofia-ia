// src/lib/sandbox/heartbeat.ts
// Keep an E2B sandbox alive for the full duration of a long code-run.
//
// The sandbox is created with a FIXED lifetime (SANDBOX_TIMEOUT_MS). Without renewal,
// any run that outlasts it gets the sandbox killed mid-flight — the next exec then fails
// with "Sandbox is probably not running anymore", and the teardown (git add/commit/push)
// can't deliver. This heartbeat renews `sandbox.setTimeout(ttlMs)` on a fixed interval,
// so the sandbox stays alive as long as the worker keeps ticking. `ttlMs` is the hard
// cost ceiling: if the worker dies, ticks stop and the sandbox self-destructs ttlMs later.
import type { Sandbox } from './types'

export interface SandboxHeartbeat {
  /** Stop renewing (idempotent). The sandbox then expires ttlMs after the last tick. */
  stop: () => void
}

/** Timer port — injectable so the behavior is unit-testable without real timers. */
export interface HeartbeatScheduler {
  setInterval: (fn: () => void, ms: number) => unknown
  clearInterval: (handle: unknown) => void
}

const HEARTBEAT_MIN_INTERVAL_MS = 30_000

/**
 * Renew the sandbox lifetime to `ttlMs` from now on every tick (default interval = ttl/3,
 * floored at 30s). Renewal errors are swallowed (reported via `onError`) so a transient
 * failure never crashes the worker tick. The interval is `unref`'d so it never keeps the
 * process alive on its own.
 */
export function startSandboxHeartbeat(
  sandbox: Pick<Sandbox, 'setTimeout'>,
  opts: { ttlMs: number; intervalMs?: number; onError?: (e: unknown) => void },
  scheduler: HeartbeatScheduler = globalThis as unknown as HeartbeatScheduler,
): SandboxHeartbeat {
  const interval = Math.max(HEARTBEAT_MIN_INTERVAL_MS, Math.floor(opts.intervalMs ?? opts.ttlMs / 3))
  const handle = scheduler.setInterval(() => {
    void (async () => {
      try {
        await sandbox.setTimeout(opts.ttlMs)
      } catch (e) {
        opts.onError?.(e)
      }
    })()
  }, interval)
  // Never keep the worker process alive just for the heartbeat.
  ;(handle as { unref?: () => void })?.unref?.()

  let stopped = false
  return {
    stop: () => {
      if (stopped) return
      stopped = true
      scheduler.clearInterval(handle)
    },
  }
}
