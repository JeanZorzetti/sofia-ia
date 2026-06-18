// src/lib/orchestration/team/code-agent.ts
// Wraps a plain LLM ChatFn into a CODE agent: the member proposes shell commands
// (@RUN), we execute them in a sandbox, feed the output back, and loop until @DONE
// (or maxSteps). The coordinator (runTeam) is unchanged — it just calls this ChatFn.
//
// Pure except for the injected `sandbox` + `baseChat`, so it is fully unit-testable
// with a fake sandbox and a scripted chat function.

import type { ChatFn, ChatMessageInput, ChatResult, CommandRun } from './team-types'
import type { TeamStore } from './team-store'
import type { Sandbox } from '../../sandbox/types'
import { parseCodeActions } from './code-protocol'
import { providerOf } from '../../ai/model-availability'
import { runClaudeInSandbox } from './sandbox-cli-agent'
import { withClaudeTokenFailover, hasClaudeTokenPool, ClaudeRateLimitError } from '../../ai/claude-token-pool'

const CODE_PROTOCOL_PROMPT = `
Você está num SANDBOX Linux isolado e efêmero, com shell. Para EXECUTAR algo, responda com diretivas (uma por linha):
@RUN <comando shell>        — executa de fato no sandbox (pode repetir na mesma resposta)
@DONE <resumo final>        — use SÓ quando a tarefa estiver concluída

Regras:
- Apenas linhas @RUN executam; texto comum é ignorado pela máquina.
- Após cada lote de @RUN você receberá stdout/stderr/exit code de cada comando e poderá continuar.
- Não invente saídas: rode comandos para verificar. Finalize com @DONE e um resumo do que foi feito.
`.trim()

// Appended when the run works on a cloned git repository (Sub-projeto C — C1):
// the agent edits files in the current directory; delivery (commit/push/PR) is
// handled automatically by the system, so the agent must NOT touch git remotes.
const REPO_CONTEXT_PROMPT = `
IMPORTANTE — você está dentro de um REPOSITÓRIO git já clonado no diretório atual (a branch de trabalho já existe).
- Edite os arquivos do repositório para cumprir a missão (crie/altere arquivos via shell).
- NÃO rode \`git push\`, \`git remote\`, \`git clone\` nem configure credenciais — o commit, o push e o Pull Request são feitos AUTOMATICAMENTE pelo sistema depois que você finalizar.
- \`git status\`/\`git diff\` locais são permitidos para conferir suas mudanças.
`.trim()

// Preamble for a CLI worker (Claude CLI) running NATIVELY inside the sandbox (Option B):
// it uses its OWN tools to edit files (no @RUN protocol), so the rules are about the
// repo + the automatic delivery, not the directive syntax.
const CLI_REPO_PREAMBLE = `
Você está dentro de um REPOSITÓRIO git já clonado no diretório atual (a branch de trabalho já existe). Use suas ferramentas para editar os arquivos e cumprir a tarefa.
- NÃO rode \`git push\`, \`git remote\`, \`git clone\` nem configure credenciais — o commit, o push e o Pull Request são feitos AUTOMATICAMENTE pelo sistema depois que você terminar.
- \`git status\`/\`git diff\` locais são permitidos para conferir suas mudanças.
`.trim()

export interface CodeChatFnOptions {
  /** Max LLM↔sandbox round-trips per member turn. */
  maxSteps?: number
  /** Per-command timeout, in ms. */
  perCommandTimeoutMs?: number
  /** Truncate each stream when feeding output back to the model (chars). */
  maxOutputChars?: number
  /** Working directory for every command — the cloned repo dir on code-runs (C1).
   *  Undefined keeps the sandbox default cwd (C0 behavior). */
  workdir?: string
  /** Live streaming (C2.1): when provided (with options.taskId per call), the agent
   *  persists partial artifacts after each command so the terminal updates mid-task.
   *  Undefined keeps the batch-only behavior (artifacts written by the coordinator). */
  store?: TeamStore
  /** Option B: subscription token (CLAUDE_CODE_OAUTH_TOKEN). When set, WORKER turns
   *  whose member model is claude-* run the Claude CLI NATIVELY inside the sandbox
   *  (it edits the repo directly) instead of the @RUN proxy — which the autonomous
   *  CLI ignores. Absent → claude-* workers fall back to the (broken) @RUN path. */
  claudeToken?: string
}

const DEFAULTS: Omit<Required<CodeChatFnOptions>, 'workdir' | 'store' | 'claudeToken'> = {
  maxSteps: 8,
  perCommandTimeoutMs: 120_000,
  maxOutputChars: 4_000,
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n…[+${s.length - max} chars truncados]`
}

function formatObservation(c: CommandRun, maxChars: number): string {
  const parts = [`$ ${c.cmd}`, `[exit ${c.exitCode}] (${c.ms}ms)`]
  if (c.stdout.trim()) parts.push(`stdout:\n${truncate(c.stdout, maxChars)}`)
  if (c.stderr.trim()) parts.push(`stderr:\n${truncate(c.stderr, maxChars)}`)
  return parts.join('\n')
}

/** Prepend the exec protocol to the first user message (robust regardless of how
 *  the base ChatFn treats a separate `system` message). On code-runs bound to a
 *  repo, also append the repo-context rules (don't touch git remotes). */
function injectProtocol(messages: ChatMessageInput[], withRepoContext: boolean): ChatMessageInput[] {
  const working = messages.map(m => ({ ...m }))
  const preamble = withRepoContext
    ? `${CODE_PROTOCOL_PROMPT}\n\n${REPO_CONTEXT_PROMPT}`
    : CODE_PROTOCOL_PROMPT
  const firstUser = working.find(m => m.role === 'user')
  if (firstUser) {
    firstUser.content = `${preamble}\n\n---\n\n${firstUser.content}`
  } else {
    working.unshift({ role: 'user', content: preamble })
  }
  return working
}

/**
 * Build a ChatFn that runs an agentic shell loop inside `sandbox`, delegating each
 * LLM turn to `baseChat`. Returns the member's final message plus the executed
 * commands as `artifacts` (persisted/streamed by the coordinator + SSE).
 */
export function createCodeChatFn(
  sandbox: Sandbox,
  baseChat: ChatFn,
  options: CodeChatFnOptions = {},
): ChatFn {
  const { maxSteps, perCommandTimeoutMs, maxOutputChars } = { ...DEFAULTS, ...options }
  const { workdir, store, claudeToken } = options

  return async (agentId, messages, leadContext, chatOptions) => {
    // ── Option B: native Claude CLI inside the sandbox ──
    // A WORKER execution turn (taskId present) whose member runs the Claude CLI: run
    // it natively in the sandbox (it edits the repo with its own tools) instead of the
    // @RUN text proxy, which the autonomous CLI ignores (it would edit the worker FS).
    // Lead/reviewer/consolidation turns have no taskId → unaffected (stay text-only).
    const cliModel = chatOptions?.model
    if ((hasClaudeTokenPool() || claudeToken) && chatOptions?.taskId && cliModel && providerOf(cliModel) === 'claude-cli') {
      const firstUser = messages.find(m => m.role === 'user')
      const taskText = firstUser?.content ?? messages.map(m => m.content).join('\n\n')
      const prompt = workdir ? `${CLI_REPO_PREAMBLE}\n\n---\n\n${taskText}` : taskText
      // Token-pool failover: a rate-limited account throws ClaudeRateLimitError → retry
      // the SAME task with the next account. Pool empty → single attempt with claudeToken.
      const result = await withClaudeTokenFailover(
        (token) => runClaudeInSandbox(sandbox, { workdir, model: cliModel, prompt, token: token ?? '' }),
        { isLimited: (e) => e instanceof ClaudeRateLimitError, fallbackToken: claudeToken },
      )
      // C2.1 live stream: persist the reconstructed command log so the terminal shows it.
      if (store && result.artifacts) {
        try { await store.updateTask(chatOptions.taskId, { artifacts: { commands: result.artifacts.commands } }) } catch { /* live-stream only */ }
      }
      return result
    }

    const working = injectProtocol(messages, Boolean(workdir))
    const commands: CommandRun[] = []
    let totalTokens = 0
    let lastModel = chatOptions?.model ?? ''
    let finalMessage = ''

    // Code-runs always want plain text (@RUN/@DONE) — never the provider's own
    // filesystem tools / code-block writing (those would touch the worker FS, not
    // the sandbox). Force rawText regardless of the member's model/provider.
    const codeChatOptions = { ...chatOptions, rawText: true }

    for (let step = 0; step < maxSteps; step++) {
      const out = await baseChat(agentId, working, leadContext, codeChatOptions)
      totalTokens += out.usage?.total_tokens ?? 0
      lastModel = out.model || lastModel

      const actions = parseCodeActions(out.message)
      const runs = actions.filter(a => a.type === 'run')
      const doneAction = actions.find(a => a.type === 'done')

      const observations: string[] = []
      for (const r of runs) {
        const res = await sandbox.exec(r.command!, { timeoutMs: perCommandTimeoutMs, cwd: workdir })
        const entry: CommandRun = {
          cmd: r.command!, stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode, ms: res.ms,
        }
        commands.push(entry)
        observations.push(formatObservation(entry, maxOutputChars))
        // C2.1: stream the terminal live — persist partial artifacts after each command
        // so the SSE poll (signature over artifacts size) ships it within ~1s. Best-effort:
        // a persist failure must never break the run (the coordinator writes the final batch).
        if (store && chatOptions?.taskId) {
          try { await store.updateTask(chatOptions.taskId, { artifacts: { commands: [...commands] } }) } catch { /* live-stream only */ }
        }
      }

      // Finished: explicit @DONE, or a turn with no commands (the agent just answered).
      if (doneAction) { finalMessage = (doneAction.text || out.message).trim(); break }
      if (runs.length === 0) { finalMessage = out.message.trim(); break }

      // Feed the command output back and continue.
      working.push({ role: 'assistant', content: out.message })
      working.push({ role: 'user', content: `Saída dos comandos:\n\n${observations.join('\n\n')}` })

      // maxSteps hit while still running — keep the best message we have.
      if (step === maxSteps - 1) finalMessage = out.message.trim()
    }

    return {
      message: finalMessage,
      model: lastModel,
      usage: { total_tokens: totalTokens },
      artifacts: { commands },
    }
  }
}
