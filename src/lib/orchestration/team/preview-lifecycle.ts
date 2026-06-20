// Preview mode — lifecycle helpers that run in the WEB APP (stop/reap/lazy-expiry), not
// the worker. They reconnect (by id) to a sandbox the worker kept alive and kill/extend
// it. Split from preview-server.ts (pure detection + start) so that module stays a
// type-only import and can be asserted via tsx without dragging the e2b chain in.
import { getSandboxProvider } from '@/lib/sandbox'
import { PREVIEW_TTL_MS, PREVIEW_SANDBOX_MARGIN_MS } from './preview-server'

/** Reconnect + kill a kept-alive preview sandbox. No-op for a null id; swallows errors
 *  (a missing/already-dead sandbox must not break the calling route/cron). */
export async function killPreviewSandbox(sandboxId: string | null | undefined): Promise<void> {
  if (!sandboxId) return
  try {
    const sbx = await getSandboxProvider().connect(sandboxId)
    await sbx.close()
  } catch (e) {
    console.error('[preview] kill sandbox falhou:', (e as Error)?.message ?? e)
  }
}

/** Reconnect + extend a live preview sandbox by the full TTL (+ margin). Throws on
 *  failure so the "Estender" route can surface it (the sandbox may already be gone). */
export async function extendPreviewSandbox(sandboxId: string): Promise<void> {
  const sbx = await getSandboxProvider().connect(sandboxId)
  await sbx.setTimeout(PREVIEW_TTL_MS + PREVIEW_SANDBOX_MARGIN_MS)
}
