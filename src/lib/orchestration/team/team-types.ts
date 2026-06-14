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

/** Side-channel artifacts a code-agent turn produces (logs now; diff/PR in later slices). */
export interface CodeArtifacts {
  commands: CommandRun[]
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
}

/** Injectable execution primitive (real impl: chatWithAgent). */
export type ChatFn = (
  agentId: string,
  messages: ChatMessageInput[],
  leadContext?: Record<string, unknown>,
  options?: ChatOptions,
) => Promise<ChatResult>
