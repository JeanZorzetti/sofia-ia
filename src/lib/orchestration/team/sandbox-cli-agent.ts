// src/lib/orchestration/team/sandbox-cli-agent.ts
// Runs the Claude Code CLI INSIDE the E2B sandbox (Sub-projeto C — Option B).
//
// Why: the Claude CLI is an autonomous agent — given a task it edits files with its
// own tools instead of emitting `@RUN` directives. Running it on the worker host
// made it edit the worker's FS (/app), so the cloned repo in the sandbox stayed
// empty and nothing was delivered. Running it IN the sandbox, at the repo dir, lets
// its native file edits land in /home/user/repo → commitAndPush picks them up, and
// it closes the isolation hole (no agentic shell on the worker).
//
// Used for WORKER execution turns whose member model is claude-* (see code-agent.ts).
// Pure except for the injected `sandbox`, so it's unit-testable with a fake sandbox.

import type { Sandbox } from '../../sandbox/types'
import type { ChatResult, CommandRun } from './team-types'
import { resolveClaudeCliModel } from '../../ai/claude-models'
import { ClaudeRateLimitError, isClaudeRateLimit } from '../../ai/claude-token-pool'

const PROMPT_PATH = '/tmp/polaris_task.txt'
const SYS_PATH = '/tmp/polaris_sys.txt'
const MAX_OUTPUT_CHARS = 4_000
const MAX_COMMANDS = 200

export interface RunClaudeInSandboxInput {
  /** Repo dir inside the sandbox; absent → sandbox default cwd (C0 no-repo). */
  workdir?: string
  /** Polaris model id (claude-*). */
  model: string
  /** Task prompt (already includes the repo-context preamble). */
  prompt: string
  /** Member system prompt. */
  systemPrompt?: string
  /** CLAUDE_CODE_OAUTH_TOKEN — subscription auth inside the sandbox. */
  token: string
  /** Hard timeout for the agentic session, in ms. */
  timeoutMs?: number
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n…[+${s.length - max} chars truncados]`
}

/** tool_result.content is either a string or an array of { type:'text', text }. */
function extractToolResultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(b => (b && typeof b === 'object' && (b as any).type === 'text' ? (b as any).text ?? '' : ''))
      .join('')
  }
  return ''
}

export interface ParsedStream {
  message: string
  totalTokens: number
  commands: CommandRun[]
}

/**
 * Parse the Claude CLI `--output-format stream-json --verbose` output (JSONL).
 * Extracts the final result text + token usage, and reconstructs a coarse command
 * log (Bash commands / file writes) for the live terminal panel. Tolerant: bad
 * lines are skipped; if there's no `result` event, falls back to assistant text.
 */
export function parseStreamJson(stdout: string): ParsedStream {
  const commands: CommandRun[] = []
  const toolUses = new Map<string, string>() // tool_use_id → label
  const assistantText: string[] = []
  let message = ''
  let totalTokens = 0

  for (const line of stdout.split('\n')) {
    const t = line.trim()
    if (!t) continue
    let ev: any
    try { ev = JSON.parse(t) } catch { continue }

    if (ev.type === 'assistant' && ev.message?.content) {
      for (const block of ev.message.content) {
        if (block?.type === 'text' && typeof block.text === 'string') {
          assistantText.push(block.text)
        } else if (block?.type === 'tool_use') {
          const label =
            block.name === 'Bash' ? (block.input?.command ?? 'bash')
            : block.name === 'Write' || block.name === 'Edit' ? `# ${String(block.name).toLowerCase()} ${block.input?.file_path ?? ''}`.trim()
            : `# ${block.name ?? 'tool'}`
          if (block.id) toolUses.set(block.id, label)
        }
      }
    } else if (ev.type === 'user' && ev.message?.content) {
      for (const block of ev.message.content) {
        if (block?.type === 'tool_result' && block.tool_use_id && commands.length < MAX_COMMANDS) {
          commands.push({
            cmd: toolUses.get(block.tool_use_id) ?? 'tool',
            stdout: truncate(extractToolResultText(block.content), MAX_OUTPUT_CHARS),
            stderr: '',
            exitCode: block.is_error ? 1 : 0,
            ms: 0,
          })
        }
      }
    } else if (ev.type === 'result') {
      if (typeof ev.result === 'string') message = ev.result
      const u = ev.usage || {}
      totalTokens = (u.input_tokens ?? 0) + (u.output_tokens ?? 0)
    }
  }

  if (!message) message = assistantText.join('\n').trim()
  return { message, totalTokens, commands }
}

/**
 * Build + run the claude command inside the sandbox and return a ChatResult shaped
 * like the code-agent's (message + artifacts.commands for the terminal/diff UI).
 */
export async function runClaudeInSandbox(sandbox: Sandbox, input: RunClaudeInSandboxInput): Promise<ChatResult> {
  const { workdir, model, prompt, systemPrompt, token, timeoutMs = 15 * 60_000 } = input

  await sandbox.writeFile(PROMPT_PATH, prompt)
  if (systemPrompt) await sandbox.writeFile(SYS_PATH, systemPrompt)

  const cliModel = resolveClaudeCliModel(model)
  // Self-bootstrap: install the CLI if the sandbox template doesn't already ship it.
  // A custom E2B template with claude pre-installed makes this a fast no-op; without
  // one it installs on first use (needs node in the base template).
  const ensure = '{ command -v claude >/dev/null 2>&1 || npm i -g @anthropic-ai/claude-code >/dev/null 2>&1 ; }'
  const flags = [
    'claude --print --dangerously-skip-permissions',
    '--output-format stream-json --verbose',
  ]
  if (systemPrompt) flags.push(`--system-prompt-file ${SYS_PATH}`)
  if (cliModel) flags.push(`--model ${cliModel}`)
  const cmd = `${ensure} && cat ${PROMPT_PATH} | ${flags.join(' ')}`

  // Auth + sandbox flags via the env channel (token never in the command string/log).
  const env: Record<string, string> = {
    CLAUDE_CODE_OAUTH_TOKEN: token,
    IS_SANDBOX: '1', // allow --dangerously-skip-permissions if the sandbox runs as root
    CLAUDE_CONFIG_DIR: '/tmp/.claude',
  }

  const res = await sandbox.exec(cmd, { cwd: workdir, timeoutMs, env })

  // Rate-limit on THIS account → throw a typed signal so the caller's token-pool
  // failover retries with the next account. Other (non-limit) failures keep the
  // existing message-return path below, so their semantics are unchanged.
  if (res.exitCode !== 0 && (isClaudeRateLimit(res.stderr) || isClaudeRateLimit(res.stdout))) {
    throw new ClaudeRateLimitError(res.stderr?.slice(0, 500) || `Claude CLI rate limit (exit ${res.exitCode})`)
  }

  const parsed = parseStreamJson(res.stdout)

  // The CLI may also emit the limit banner as its RESULT text with exit 0
  // (e.g. "You've hit your session limit · resets 5pm (UTC)"). Treat that as a
  // rate-limit too so the failover rotates accounts instead of "delivering" it.
  if (isClaudeRateLimit(parsed.message)) {
    throw new ClaudeRateLimitError(parsed.message.slice(0, 500))
  }

  const message =
    parsed.message ||
    (res.exitCode !== 0
      ? `Claude CLI no sandbox falhou [exit ${res.exitCode}]: ${res.stderr.slice(0, 500)}`
      : '')

  return {
    message,
    model,
    usage: { total_tokens: parsed.totalTokens },
    artifacts: { commands: parsed.commands },
  }
}
