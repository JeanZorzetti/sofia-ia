// src/lib/git/git-delivery-plan.ts
// Teams V2 (S3.1): single source of truth for how a code-run delivers its work to
// git, derived purely from `TeamRun.gitMode`. The WORKER reads this and the repo
// lifecycle obeys it — there is NO git/sandbox/prisma here, so it is unit-testable
// in a pure tsx script (scripts/v2s6-verify.ts), no jest.
//
//   'pr' (default/legacy) → new working branch `polaris/run-<id>` + draft PR.
//   'direct'              → commit straight to the base branch, NO PR.
//
// Robustness: anything that is not exactly 'direct' (null/undefined/legacy rows,
// or a malformed value) collapses to the legacy 'pr' plan. So old runs without the
// column and any junk input behave identically to before S3.1 (invariant #4).

export type GitMode = 'pr' | 'direct'

export interface GitDeliveryPlan {
  /** Branch to work on + push. 'pr': a fresh run branch; 'direct': the base itself. */
  branch: string
  /** Whether to open a draft Pull Request after pushing. 'direct' → false. */
  openPr: boolean
}

/** Decide branch + open-PR from the run's gitMode. Pure. */
export function planGitDelivery(
  gitMode: string | null | undefined,
  opts: { runId: string; base: string },
): GitDeliveryPlan {
  if (gitMode === 'direct') {
    // Direct: stay on the base branch, push there, skip the PR. `base` is the
    // requested base here; the worker rebinds it to the EFFECTIVE base once the
    // repo is cloned (the repo's real default may differ).
    return { branch: opts.base, openPr: false }
  }
  // 'pr' (default/legacy) and any unrecognized value → byte-identical to pre-S3.1.
  return { branch: `polaris/run-${opts.runId}`, openPr: true }
}
