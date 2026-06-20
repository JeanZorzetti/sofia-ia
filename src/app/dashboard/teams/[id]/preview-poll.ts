// Pure polling predicate for PreviewPanel — extracted so it's regression-testable via tsx
// (scripts/preview-verify.ts) without dragging React in.
//
// Root-cause guard: the worker boots the dev server only AFTER the run completes, so
// previewStatus stays null for a few seconds first. The panel must keep polling through
// the null → 'starting' → 'live' window and stop ONLY on a terminal preview state — or on
// a null preview whose run already FAILED (no preview will ever start). A 'completed' run
// with a still-null preview keeps polling: its preview is imminent.

export interface PreviewPollInput {
  runStatus: string | null
  previewStatus: string | null
}

/** Terminal preview states → stop polling. */
export const PREVIEW_TERMINAL = new Set(['failed', 'stopped', 'expired'])
/** Run states where a null preview is final (preview never starts). */
export const RUN_FAILED = new Set(['failed', 'cancelled', 'rate_limited'])

export function shouldKeepPolling(s: PreviewPollInput): boolean {
  const ps = s.previewStatus ?? ''
  if (PREVIEW_TERMINAL.has(ps)) return false
  if (ps === '' && RUN_FAILED.has(s.runStatus ?? '')) return false
  return true
}
