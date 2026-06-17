// src/lib/orchestration/team/team-types.ts
// Shared types for the Polaris Teams coordination engine.

export type TeamRole = 'lead' | 'worker' | 'reviewer'
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'rejected' | 'blocked'
export type RunStatus =
  | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rate_limited'
export type MessageKind = 'message' | 'assignment' | 'review' | 'system'

/** A resolved roster member (joins TeamMember + Agent.name). */
export interface MemberCtx {
  id: string          // TeamMember.id
  agentId: string
  agentName: string
  role: TeamRole
  model: string | null
  effort: string | null
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
}

/** A directive parsed out of the Lead's output. */
export interface LeadAction {
  type: 'task' | 'message' | 'done'
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
}

export interface ReviewVerdict {
  approved: boolean
  reason?: string
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
}

/** Injectable execution primitive (real impl: chatWithAgent). */
export type ChatFn = (
  agentId: string,
  messages: ChatMessageInput[],
  leadContext?: Record<string, unknown>,
  options?: ChatOptions,
) => Promise<ChatResult>
