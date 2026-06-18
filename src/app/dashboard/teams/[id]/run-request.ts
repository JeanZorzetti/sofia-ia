// src/app/dashboard/teams/[id]/run-request.ts
// Teams V2 — fatia S3.2 (Tema git delivery): PURE builder for the run POST body, extracted
// out of TeamRunView.tsx (a 'use client' component) so scripts/v2s7-verify.ts can assert it
// via tsx without dragging React in — same pattern as roster-mapping.ts (S1.3) and
// member-stats.ts (S2.1). No React, no DB, no side effects: only a type import.
//
// The body is ALWAYS { mission, mode }. `gitMode` is appended ONLY for code-runs
// (decision S3.2 #2): chat-runs stay byte-identical to the pre-S3.2 payload ({ mission,
// mode }). The server already treats an absent gitMode as 'pr' (planGitDelivery, S3.1), and
// gitMode is inert in chat-run and in code-run C0 (no repo bound), so omitting it there
// changes nothing server-side while keeping the legacy chat path untouched (invariant #4).
import type { GitMode } from '@/lib/git/git-delivery-plan'

export type RunMode = 'chat' | 'code'

/** The slice of composer state that determines the POST body. */
export interface RunComposerState {
  mission: string
  mode: RunMode
  gitMode: GitMode
}

/** Body for POST /api/teams/[id]/run. `gitMode` optional: present only for code-runs. */
export interface RunRequestBody {
  mission: string
  mode: RunMode
  gitMode?: GitMode
}

/** Build the run POST body from the composer state.
 *  - Always { mission, mode }.
 *  - `gitMode` ONLY when mode === 'code'; chat-run omits the key entirely → byte-identical
 *    to the legacy payload. */
export function buildRunRequest({ mission, mode, gitMode }: RunComposerState): RunRequestBody {
  return {
    mission,
    mode,
    ...(mode === 'code' ? { gitMode } : {}),
  }
}
