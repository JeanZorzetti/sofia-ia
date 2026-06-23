// src/lib/orchestration/team/team-types.ts
// Shared types for the Polaris Teams coordination engine.

import type { TaskHistoryEvent } from './task-history'
import type { MessageAttachment } from './team-attachments'

export type TeamRole = 'lead' | 'worker' | 'reviewer'
// `clarify` (G6, graph mode only): a Worker that lacks essential info asks the Lead
// (`@CLARIFY`) instead of guessing; the task parks here until the Lead answers.
// Migration-free — the column is `String @db.VarChar(20)`, so the value just fits.
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'rejected' | 'blocked' | 'clarify'
export type RunStatus =
  | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rate_limited'
// `user` (V2.2 S4): a steering message the human injects while a run is `running`.
// The Lead surfaces it in its next planning turn (buildLeadContext) — cooperative
// steering, never interrupts a call in flight. Migration-free: the column is
// `String @db.VarChar(20)`, so the value just fits.
export type MessageKind = 'message' | 'assignment' | 'review' | 'system' | 'user'

/** Per-member tool-capability policy (Teams V2 — Tema A, fatia S1.1).
 *  Persisted in `TeamMember.capabilities` (Json), shape inspired by agent-teams-ai's
 *  `TeamMemberMcpPolicy`. Lets a team scope *which* tools each member may actually
 *  execute, independent of what the underlying `Agent` "knows".
 *
 *  Every field is OPTIONAL: an absent/null policy means "legacy behavior" — the
 *  coder-model gate in `chatWithAgent` decides, exactly as before. S1.1 only PLUMBS
 *  this end-to-end (member → ChatOptions → chatWithAgent reads/logs it); the gate is
 *  re-wired to honor it in S1.2. */
export interface CapabilityPolicy {
  /** Master switch: enable provider-side tool execution (function calling) for this
   *  member even when the model isn't a coder model. Absent → legacy gate. */
  tools?: boolean
  /** Restrict MCP execution to these `AgentMcpServer` ids. Absent → no MCP filter. */
  mcpAllowlist?: string[]
  /** Enable tool-skills (function-calling skills). Absent → legacy gate. */
  toolSkills?: boolean
  /** Enable the read-only filesystem tools. Absent → legacy gate. */
  filesystem?: boolean
}

/** A resolved roster member (joins TeamMember + Agent.name). */
export interface MemberCtx {
  id: string          // TeamMember.id
  agentId: string
  agentName: string
  role: TeamRole
  model: string | null
  effort: string | null
  /** S1.1: per-member capability policy (`TeamMember.capabilities` Json). Null/absent
   *  → legacy behavior. The coordinator forwards this to `ChatOptions`; S1.2 enforces. */
  capabilities?: CapabilityPolicy | null
  /** V2.1 S3.1: per-member custom workflow instruction (`TeamMember.workflow`). Null/
   *  absent → only the Agent's own system prompt (legacy). The coordinator forwards this
   *  to `ChatOptions`; `chatWithAgent` concatenates it via `appendMemberWorkflow`. */
  workflow?: string | null
}

/** Board card as the coordinator sees it. */
export interface TaskRow {
  id: string
  title: string
  body: string | null
  status: TaskStatus
  assigneeId: string | null
  result: string | null
  reviewNote: string | null
  retryCount: number
  position: number
  /** G1 (graph mode): ids of tasks this one depends on. `runTeamGraph` gates
   *  execution on these being `done`. Always `[]` in linear mode (`runTeam`
   *  never reads it), so the field is backward-compatible. */
  dependsOn: string[]
  /** V2.1 S3.2 (graph mode): free cross-link ids (`related` column, NOT NULL DEFAULT
   *  '{}' → the Prisma store always provides it). DISPLAY/navigation only — the agenda/
   *  DAG never reads it (`depsSatisfied` gates on `dependsOn` alone). Optional so legacy
   *  in-memory stores/test literals stay valid (read it as `related ?? []`). The inverse
   *  `blocks` relation is DERIVED read-side (task-relations.ts) — no column, never here. */
  related?: string[]
  /** V2.1 S2.1: append-only lifecycle timeline (`history_events` Json). NULL/absent
   *  on legacy tasks. The coordinator never reads it — the store writes it from each
   *  transition and S2.2 renders it in TeamRunView. */
  historyEvents?: TaskHistoryEvent[] | null
}

/** Message as the coordinator sees it. */
export interface MessageRow {
  id: string
  fromMemberId: string | null
  toMemberId: string | null
  summary: string | null
  content: string
  kind: MessageKind
  taskId: string | null
  /** V2.2 S6: image attachments with their resolved local path (vision). Absent on
   *  every legacy message → the steering/feed render stays byte-identical. */
  attachments?: MessageAttachment[]
}

/** A directive parsed out of the Lead's output. */
export interface LeadAction {
  type: 'task' | 'message' | 'done' | 'clarify'
  title?: string
  body?: string
  assignTo?: { kind: 'name' | 'role'; value: string }
  to?: string        // message target (member name)
  summary?: string   // message text
  text?: string      // done body
  /** G1: `@TASK [after:#n]` dependencies, as board DISPLAY ids (`position+1`).
   *  The graph executor resolves these to real task ids at creation time.
   *  Absent when no `[after:]` is declared (linear mode ignores it). */
  dependsOn?: number[]
  /** S3.2: `@TASK [related:#n]` cross-links, as board DISPLAY ids (`position+1`).
   *  The graph executor resolves these to real task ids at creation time (same as
   *  `dependsOn`). Absent when no `[related:]` is declared. DISPLAY-only — never
   *  enters the agenda's execution gate. */
  related?: number[]
  /** G6: `@CLARIFY [#n] resposta` — the board DISPLAY id (`position+1`) of the
   *  `clarify` task the Lead is answering, and the answer text. Only present on
   *  `type: 'clarify'`. The graph executor resolves `#n`→real id and re-queues. */
  display?: number
  answer?: string
}

export interface ReviewVerdict {
  approved: boolean
  reason?: string
}

/** G2 (graph mode): the next action a task needs this turn, derived per-task by
 *  the agenda state-machine (`deriveTaskAction`). Mirrors agent-teams-ai's
 *  `agenda.js`. Additive — linear mode (`runTeam`) never reads it. */
export type TaskAction =
  | 'wait_dependency' // deps not all `done` → task is parked in `blocked`
  | 'assign_owner'    // no `assigneeId` → the Lead owns the assignment
  | 'review'          // status `review` → the Reviewer owns it
  | 'clarify'         // G6: status `clarify` → the Lead owns it (answer the doubt)
  | 'apply_changes'   // rejected-but-retry (`todo` + `reviewNote` + `retryCount>0`) → the owner re-runs
  | 'execute'         // ready to run (deps done, has owner) → the owner runs it
  | 'terminal'        // `done` / `rejected` → no further action

/** Who acts on a task this turn. `owner` = the task's `assigneeId` (a worker). */
export type TaskActionOwner = 'lead' | 'owner' | 'reviewer' | 'none'

/** One derived agenda entry: a task plus what to do with it and who acts.
 *  `buildAgenda` produces these; the graph loop routes each to its owner. */
export interface AgendaItem {
  task: TaskRow
  nextAction: TaskAction
  actionOwner: TaskActionOwner
}

/** One shell command executed inside a sandbox during a code-run (Sub-projeto C). */
export interface CommandRun {
  cmd: string
  stdout: string
  stderr: string
  exitCode: number
  ms: number
}

/** One changed file as seen by the reviewer (C3). Mirrors `ChangedFile` from
 *  git/repo-lifecycle, kept here so team-types stays free of git/sandbox imports. */
export interface ReviewDiffFile {
  path: string
  status: string
  patch?: string
  truncated?: boolean
  binary?: boolean
}

/** Side-channel artifacts a code-agent turn produces.
 *  - `commands`: shell commands run in the sandbox (C2/C2.1) — always present on
 *    a code-agent ChatResult.
 *  - `reviewDiff`: the per-file working-tree diff shown to the reviewer (C3),
 *    written separately at review time (see UpdateTaskInput, which accepts a
 *    Partial<CodeArtifacts> so a reviewDiff-only write doesn't require commands). */
export interface CodeArtifacts {
  commands: CommandRun[]
  reviewDiff?: ReviewDiffFile[]
}

export interface ChatResult {
  message: string
  model: string
  usage?: { total_tokens?: number } | null
  /** Present only for code-runs: what the member executed in the sandbox. */
  artifacts?: CodeArtifacts
}

export type ChatMessageInput = { role: 'user' | 'assistant' | 'system'; content: string }

/** Per-call execution overrides for a team member (model/effort). */
export interface ChatOptions {
  model?: string | null
  effort?: string | null
  /** Code-runs: force a plain-text completion (no provider-side filesystem tools /
   *  code-block writing). The code-agent executes everything in the sandbox via
   *  @RUN, so a provider running its own tools on the worker FS would be wrong. */
  rawText?: boolean
  /** Live streaming side-channel (Sub-projeto C — C2.1): identifies the task being
   *  executed so the code-agent can persist partial artifacts mid-loop. Passed via
   *  OPTIONS (not leadContext) so chatWithAgent — which only reads model/effort/
   *  rawText/useVectorSearch — ignores it and chat-runs stay unaffected. */
  taskId?: string
  runId?: string
  /** S2.2 (Teams V2 — Tema D2): identifies which TeamMember is making this call so
   *  withUsageTracking can attribute tokens to the correct member. Passthrough only —
   *  chatWithAgent ignores unknown option keys. */
  memberId?: string
  /** S1.1 (Teams V2 — Tema A): per-member capability policy. The coordinator forwards
   *  `member.capabilities` here; `chatWithAgent` reads it (S2 enforces the gate).
   *  Absent → legacy coder-model gate, behavior unchanged. */
  capabilities?: CapabilityPolicy | null
  /** V2.1 S3.1 (Tema F1): per-member custom workflow instruction. The coordinator
   *  forwards `member.workflow` here; `chatWithAgent` concatenates it onto the Agent's
   *  system prompt via `appendMemberWorkflow`. Absent/empty → prompt unchanged (legacy). */
  workflow?: string | null
  /** V2.2 S6 (item 5b): per-run directory where image attachments are materialized.
   *  Injected by the chat wrapper (start-team-run) when the run has attachments, so the
   *  Claude CLI gets `--add-dir <dir>` and a member can Read the image. Null → no flag
   *  (command byte-identical to legacy). */
  attachmentDir?: string | null
  /** 003 follow-up (co-located CLI): for a NON-worker turn (lead/reviewer/consolidation)
   *  whose repo is co-located on THIS host (vps-local → the run dir lives on the worker FS),
   *  run the member's Claude CLI local-spawn in THIS dir (read-only) instead of the worker's
   *  own `/app`. Set by the code-agent only when `sandbox.rootDir` is present; absent → the
   *  CLI keeps `process.cwd()` (legacy / E2B), byte-identical. */
  claudeCliCwd?: string | null
}

/** Injectable execution primitive (real impl: chatWithAgent). */
export type ChatFn = (
  agentId: string,
  messages: ChatMessageInput[],
  leadContext?: Record<string, unknown>,
  options?: ChatOptions,
) => Promise<ChatResult>
