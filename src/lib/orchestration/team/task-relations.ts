// src/lib/orchestration/team/task-relations.ts
// Pure read-side derivation of a task's DISPLAY relations (V2.1 S3.2 — Tema F2).
// No I/O, no React — safe to unit-test in isolation (scripts/v21s6-verify.ts).
//
// Two relations are derived for board navigation; NEITHER feeds the DAG/agenda
// (`depsSatisfied` gates only on `dependsOn`, unchanged):
//   • `blocks`  — the INVERSE of `dependsOn`: tasks that depend on THIS one. Pure
//     derivation, so it can never desync; that's why there is no `blocks` column.
//   • `related` — the symmetric closure of the persisted `related` cross-link set:
//     a task shows both the links it declared AND the ones pointing back at it, so
//     `A [related:B]` surfaces on both cards even though it's stored only on A.
//
// Dangling ids (a relation to a task no longer on the board) are dropped so the UI
// never renders a chip it can't navigate to.

export interface RelationInput {
  id: string
  /** G1 dependency ids (graph mode). Inverted here to produce `blocks`. */
  dependsOn: string[]
  /** S3.2 persisted cross-link ids (the `related` column). */
  related: string[]
}

export interface DerivedRelations {
  /** Tasks that depend on this one (inverse of dependsOn). */
  blocks: string[]
  /** Symmetric union of declared + back-pointing cross-links (this id excluded). */
  related: string[]
}

const EMPTY: DerivedRelations = { blocks: [], related: [] }

/** Derive per-task `{ blocks, related }` from the full board. Missing keys default
 *  to []; an empty board → empty map; a relation-free board → every entry `EMPTY`
 *  (so a legacy task renders with zero relation chips). */
export function deriveTaskRelations(tasks: RelationInput[]): Map<string, DerivedRelations> {
  const ids = new Set(tasks.map(t => t.id))
  const blocks = new Map<string, Set<string>>()
  const related = new Map<string, Set<string>>()
  for (const t of tasks) {
    blocks.set(t.id, new Set())
    related.set(t.id, new Set())
  }

  for (const t of tasks) {
    // blocks: for each dependency D of T, T blocks-progress-of nothing — rather, D
    // is blocked BY T's existence only when T depends on D, i.e. D.blocks ∋ T.
    for (const depId of t.dependsOn ?? []) {
      if (depId !== t.id && ids.has(depId)) blocks.get(depId)!.add(t.id)
    }
    // related: store the declared link on T, and mirror it onto the target so the
    // cross-link is navigable from both cards.
    for (const relId of t.related ?? []) {
      if (relId === t.id || !ids.has(relId)) continue
      related.get(t.id)!.add(relId)
      related.get(relId)!.add(t.id)
    }
  }

  const out = new Map<string, DerivedRelations>()
  for (const t of tasks) {
    out.set(t.id, {
      blocks: [...blocks.get(t.id)!],
      related: [...related.get(t.id)!],
    })
  }
  return out
}

/** Convenience for a single task (returns EMPTY when the id isn't on the board). */
export function relationsFor(map: Map<string, DerivedRelations>, id: string): DerivedRelations {
  return map.get(id) ?? EMPTY
}
