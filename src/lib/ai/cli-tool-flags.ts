// src/lib/ai/cli-tool-flags.ts
// Teams V2.1 — fatia S1.3 (Tema A'): translate a member's CapabilityPolicy into Claude
// Code CLI flags. UNLIKE the Groq/Ollama/OpenRouter paths (where the Polaris builds the
// function-calling loop itself), the Claude CLI is an autonomous agent that runs tools
// natively — so the policy becomes COMMAND-LINE FLAGS, not a loop. Kept PURE (no DB, no
// env, no I/O) like model-capabilities.ts so scripts/v21s3-verify.ts can assert it
// directly (jest is blocked by OneDrive errno -4094).
//
// Flag names verified against the installed `claude --help`:
//   --allowedTools / --disallowedTools <tools...>   (comma- or space-separated)
//   --permission-mode <mode>                        (plan | default | acceptEdits | bypassPermissions)
//   --mcp-config <configs...> + --strict-mcp-config
//   --dangerously-skip-permissions
//
// Two contexts, two security postures (THE caveat of this slice):
//   • chat-run         — the CLI runs on the worker/HOST FS (no sandbox). Write/Bash there
//                        would mutate /app → isolation hole. A policy ALWAYS forces
//                        read-only + `--permission-mode plan`, even with `tools:true`.
//   • code-run-sandbox — the CLI runs INSIDE the E2B sandbox at the cloned repo dir; its
//                        file edits ARE the deliverable and stay isolated. Writes are
//                        preserved (skip-permissions stays on); the only gap closed here
//                        is honoring `mcpAllowlist` via --mcp-config.
//
// REGRESSION (invariant #4): a member WITHOUT a policy yields `{}` here, and the renderer
// reproduces today's exact command (both contexts keep --dangerously-skip-permissions).
import type { CapabilityPolicy } from '@/lib/orchestration/team/team-types'

/** Where the Claude CLI is spawned (decides the security posture — see file header). */
export type CliRunContext = 'chat-run' | 'code-run-sandbox'

/** Native Claude Code tool names. Read-only tools are safe on the host FS; the write/exec
 *  set mutates it. Names match the CLI's --allowedTools/--disallowedTools vocabulary. */
export const READ_ONLY_CLI_TOOLS = ['Read', 'Glob', 'Grep', 'LS'] as const
export const WRITE_CLI_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash'] as const

/** An MCP server resolved into a `--mcp-config` entry. The caller loads `AgentMcpServer`
 *  + `McpServer` rows and shapes `config` (HTTP/SSE transport) via `toCliMcpDescriptor`,
 *  keeping THIS module pure (no Prisma). `amsId` matches the ids in `mcpAllowlist`. */
export interface CliMcpServerDescriptor {
  /** `AgentMcpServer.id` — the join-row id stored in `CapabilityPolicy.mcpAllowlist`. */
  amsId: string
  /** Server key under `mcpServers` in the --mcp-config JSON (also `mcp__<name>` allow id). */
  name: string
  /** Transport config, e.g. `{ type:'http', url, headers }`. */
  config: Record<string, unknown>
}

/** The flags resolved from a policy; the caller renders them onto the `claude` command.
 *  All optional — an empty object means "change nothing" (legacy command, regression). */
export interface CliToolFlags {
  /** `--allowedTools` allowlist (read-only natives + `mcp__<server>` for allowed servers). */
  allowedTools?: string[]
  /** `--disallowedTools` denylist (the write/exec set; defense in depth on the host). */
  disallowedTools?: string[]
  /** `--permission-mode` (we use `plan` = read-only, no edits/exec). */
  permissionMode?: 'plan' | 'default' | 'acceptEdits' | 'bypassPermissions'
  /** `--mcp-config` payload — ONLY the policy-allowed servers. */
  mcpConfig?: { mcpServers: Record<string, Record<string, unknown>> }
  /** `--dangerously-skip-permissions` — true ONLY in the E2B sandbox (isolated writes);
   *  NEVER on the host. Absent here → the renderer's legacy default (skip ON) applies. */
  skipPermissions?: boolean
}

/** Shape an `McpServer` row into a CLI descriptor. Pure (no DB). HTTP/SSE servers are the
 *  only transports the schema stores (`url` + `transport` + `headers`), and both are
 *  reachable from inside the E2B sandbox. The server key is slugified so it is safe both
 *  as the `mcpServers` JSON key and inside the `mcp__<name>` allow id. */
export function toCliMcpDescriptor(input: {
  amsId: string
  name: string
  url: string
  transport?: string | null
  headers?: Record<string, unknown> | null
}): CliMcpServerDescriptor {
  const key = (input.name || input.amsId).replace(/[^a-zA-Z0-9_-]/g, '_')
  const config: Record<string, unknown> = {
    type: input.transport === 'sse' ? 'sse' : 'http',
    url: input.url,
  }
  if (input.headers && Object.keys(input.headers).length > 0) config.headers = input.headers
  return { amsId: input.amsId, name: key, config }
}

/** Filter caller-resolved MCP descriptors by the policy allowlist. Same 3-way semantics as
 *  `selectApiTools` (model-capabilities.ts): absent → all; present → subset; empty → none. */
function selectMcpServers(
  capabilities: CapabilityPolicy,
  mcpServers: CliMcpServerDescriptor[],
): CliMcpServerDescriptor[] {
  const allow = capabilities.mcpAllowlist
  return allow ? mcpServers.filter(s => allow.includes(s.amsId)) : mcpServers
}

/**
 * Translate a member's CapabilityPolicy into Claude CLI flags for the given run context.
 * See the file header for the security rationale per context. Returns `{}` for a member
 * without a policy (regression: the renderer then emits today's exact legacy command).
 */
export function buildCliToolFlags(input: {
  capabilities?: CapabilityPolicy | null
  context: CliRunContext
  mcpServers?: CliMcpServerDescriptor[]
}): CliToolFlags {
  const { capabilities, context, mcpServers = [] } = input
  // Regression guard (invariant #4): no policy → no flag changes at all.
  if (!capabilities) return {}

  const chosen = selectMcpServers(capabilities, mcpServers)
  const mcpConfig = chosen.length
    ? { mcpServers: Object.fromEntries(chosen.map(s => [s.name, s.config])) }
    : undefined
  // Allow the chosen MCP servers' tools through the allowlist (`mcp__<server>` = all tools
  // of that server). Without this, a strict --allowedTools would block them.
  const mcpAllowIds = chosen.map(s => `mcp__${s.name}`)

  // A read-only posture: native read-only tools + allowed MCP, every write/exec blocked,
  // and plan mode as a mode-level backstop. Shared by chat-run and the sandbox opt-out.
  const readOnlyPosture = (): CliToolFlags => ({
    allowedTools: [...READ_ONLY_CLI_TOOLS, ...mcpAllowIds],
    disallowedTools: [...WRITE_CLI_TOOLS],
    permissionMode: 'plan',
    skipPermissions: false,
    ...(mcpConfig ? { mcpConfig } : {}),
  })

  if (context === 'chat-run') {
    // Host FS: never enable write/exec tools, even with `tools:true`.
    return readOnlyPosture()
  }

  // code-run-sandbox: writes are the deliverable and isolated → keep them (skip ON), only
  // honor mcpAllowlist. An EXPLICIT `filesystem:false` is the one opt-out to read-only.
  if (capabilities.filesystem === false) return readOnlyPosture()
  const flags: CliToolFlags = { skipPermissions: true }
  if (mcpConfig) flags.mcpConfig = mcpConfig
  return flags
}

/**
 * Render resolved flags into `claude` CLI argument tokens (excluding the base
 * `claude --print …`, the model and the system-prompt-file, which the callers own).
 *
 * Legacy default: `skipPermissions ?? true` → an empty `flags` (no policy) renders exactly
 * `['--dangerously-skip-permissions']`, byte-identical to today's command (regression).
 *
 * `mcpConfigPath` must already be shell-ready (quoted by the caller if it can contain
 * spaces). When `flags.mcpConfig` is set but no path is provided, the --mcp-config flag is
 * skipped (the caller chose not to materialize it).
 */
export function renderClaudeCliFlags(
  flags: CliToolFlags,
  opts: { mcpConfigPath?: string } = {},
): string[] {
  const args: string[] = []
  const skip = flags.skipPermissions ?? true // legacy default: skip permissions ON
  if (skip) args.push('--dangerously-skip-permissions')
  if (flags.permissionMode) args.push('--permission-mode', flags.permissionMode)
  if (flags.allowedTools?.length) args.push('--allowedTools', flags.allowedTools.join(','))
  if (flags.disallowedTools?.length) args.push('--disallowedTools', flags.disallowedTools.join(','))
  if (flags.mcpConfig && opts.mcpConfigPath) {
    args.push('--mcp-config', opts.mcpConfigPath, '--strict-mcp-config')
  }
  return args
}
