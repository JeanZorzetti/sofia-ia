// src/lib/orchestration/team/team-config-ui.ts
//
// G4.1 — pure config-shaping for the team create/edit form (no React/DOM), so
// the merge logic is unit-verifiable (scripts/g4_1-verify.ts) without the page.
//
// `Team.config` is a free-form JSON blob shared by several features (repo binding
// C1, topology G0, maxParallel G3, plus engine keys like maxTurns/retryCap). The
// form only owns a few keys; `buildTeamConfig` layers the form's values onto an
// existing config, PRESERVING every other key and DROPPING empty/default ones so
// the blob stays clean (linear is the default → topology is omitted, not stored).

export type Topology = 'linear' | 'graph'

export interface TeamConfigForm {
  repoUrl?: string
  defaultBranch?: string
  topology?: Topology
  /** Raw text from the number input; parsed here (empty/invalid → dropped). */
  maxParallel?: string
}

/**
 * Merge the create/edit form's config fields onto `base`, preserving unrelated
 * keys. Empty/default values are removed so the persisted config stays minimal.
 * Mirrors the shallow merge the PATCH /api/teams/[id] route does server-side.
 */
export function buildTeamConfig(base: Record<string, unknown>, form: TeamConfigForm): Record<string, unknown> {
  const cfg = { ...base }

  // Repo binding (Sub-projeto C — C1): only persist non-empty values.
  const repo = (form.repoUrl ?? '').trim()
  const branch = (form.defaultBranch ?? '').trim()
  if (repo) cfg.repoUrl = repo; else delete cfg.repoUrl
  if (branch) cfg.defaultBranch = branch; else delete cfg.defaultBranch

  // Topology (G0): linear is the default → omit the key entirely; only store
  // 'graph' as the explicit opt-in (keeps every existing linear team untouched).
  if (form.topology === 'graph') cfg.topology = 'graph'
  else delete cfg.topology

  // maxParallel (G3): only meaningful in graph mode; positive integer or dropped
  // (dropped = default = team width). Drop in linear mode regardless.
  const n = parseInt((form.maxParallel ?? '').trim(), 10)
  if (form.topology === 'graph' && Number.isFinite(n) && n >= 1) cfg.maxParallel = n
  else delete cfg.maxParallel

  return cfg
}

/** Read the topology back from a persisted config (anything ≠ 'graph' is linear). */
export function topologyOf(config: unknown): Topology {
  return config && typeof config === 'object' && (config as Record<string, unknown>).topology === 'graph'
    ? 'graph'
    : 'linear'
}

/** Read maxParallel back as the form's string value ('' when unset/invalid). */
export function maxParallelOf(config: unknown): string {
  const v = config && typeof config === 'object' ? (config as Record<string, unknown>).maxParallel : undefined
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : ''
}
