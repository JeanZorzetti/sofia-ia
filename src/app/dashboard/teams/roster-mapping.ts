// src/app/dashboard/teams/roster-mapping.ts
// Teams V2 — fatia S1.3 (Tema A): PURE roster <-> API payload mapping, extracted out of
// RosterEditor.tsx (a 'use client' component) so scripts/v2s3-verify.ts can assert it via
// tsx without dragging React in — same pattern as model-capabilities.ts (S1.2). No React,
// no DB, no side effects: only a type import.
import type { CapabilityPolicy } from '@/lib/orchestration/team/team-types'

export type Role = 'lead' | 'worker' | 'reviewer'

/** A roster row as the editor holds it in state. `caps` mirrors `TeamMember.capabilities`
 *  1:1 (decision S1.3 #1: nested object, not flat UI fields), so `rosterToMembers` and the
 *  edit-modal hydration are trivial. Absent `caps` = "inherit" = legacy behavior. */
export interface RosterRow {
  agentId: string
  role: Role
  model: string
  effort: string
  /** Per-member tool-capability policy (S1.1 shape). Absent → no policy written (legacy). */
  caps?: CapabilityPolicy
  /** S3.1: per-member custom workflow instruction. Absent/empty → no workflow written
   *  (legacy: only the Agent's own system prompt). */
  workflow?: string
}

/** Sentinel used by the model/effort pickers for "inherit from the agent". */
export const INHERIT = 'inherit'

/** One member as the create/update API expects it. `capabilities` is OPTIONAL: present only
 *  when the row carries a policy, so a legacy member serializes without the key at all. */
export interface RosterMemberPayload {
  agentId: string
  role: Role
  model: string | null
  effort: string | null
  position: number
  capabilities?: CapabilityPolicy
  /** S3.1: present only when the row carries a non-empty workflow; a legacy member
   *  serializes without the key (byte-identical to pre-S3.1). */
  workflow?: string
}

/** Build the members payload for POST/PATCH /api/teams.
 *  - `inherit` sentinel → null (model/effort), exactly as before.
 *  - `caps` present → `capabilities` key in the payload; absent → NO key (legacy preserved,
 *    so a member nobody touched serializes byte-identical to pre-S1.3). The runtime gate
 *    (S1.2) then sees null capabilities and falls back to the coder-model heuristic. */
export function rosterToMembers(rows: RosterRow[]): RosterMemberPayload[] {
  return rows.map((r, i) => ({
    agentId: r.agentId,
    role: r.role,
    model: r.model === INHERIT ? null : r.model,
    effort: r.effort === INHERIT ? null : r.effort,
    position: i,
    ...(r.caps ? { capabilities: r.caps } : {}),
    // S3.1: only emit `workflow` for a non-empty (trimmed) instruction; an untouched
    // member serializes without the key, so its prompt stays byte-identical (legacy).
    ...(r.workflow?.trim() ? { workflow: r.workflow.trim() } : {}),
  }))
}

// ── MCP multiselect source (GET /api/agents/[id]/mcp) ──
// That route returns AgentMcpServer rows (the join), each including its McpServer + tools.

/** The shape of one `connection` from GET /api/agents/[id]/mcp that the multiselect needs. */
export interface McpConnection {
  /** `AgentMcpServer.id` — the JOIN row id. THIS is what goes into `mcpAllowlist`. */
  id: string
  mcpServerId?: string
  enabled?: boolean
  mcpServer?: { id: string; name?: string | null; tools?: unknown[] | null }
}

/** A multiselect option for one MCP server configured on an agent. */
export interface McpOption {
  /** `AgentMcpServer.id` — persisted into `CapabilityPolicy.mcpAllowlist`. */
  amsId: string
  name: string
  toolCount: number
}

/** Map a connection row → multiselect option. Decision S1.2 #3 / S1.3 gotcha: the option's
 *  `amsId` is `connection.id` (AgentMcpServer.id), NOT `connection.mcpServer.id` — the
 *  allowlist filter in selectApiTools (S1.2) matches on the join-row id. The McpServer id
 *  only appears, sliced, inside the tool *name* and must never reach the allowlist. */
export function mcpConnectionToOption(c: McpConnection): McpOption {
  return {
    amsId: c.id,
    name: c.mcpServer?.name?.trim() || c.mcpServerId || c.id,
    toolCount: c.mcpServer?.tools?.length ?? 0,
  }
}
