// src/lib/orchestration/team/code-agent.ts
// Wraps a plain LLM ChatFn into a CODE agent: the member proposes shell commands
// (@RUN), we execute them in a sandbox, feed the output back, and loop until @DONE
// (or maxSteps). The coordinator (runTeam) is unchanged — it just calls this ChatFn.
//
// Pure except for the injected `sandbox` + `baseChat`, so it is fully unit-testable
// with a fake sandbox and a scripted chat function.

import type { ChatFn, ChatMessageInput, ChatResult, CommandRun } from './team-types'
import type { Sandbox } from '../../sandbox/types'
import { parseCodeActions } from './code-protocol'

const CODE_PROTOCOL_PROMPT = `
Você está num SANDBOX Linux isolado e efêmero, com shell. Para EXECUTAR algo, responda com diretivas (uma por linha):
@RUN <comando shell>        — executa de fato no sandbox (pode repetir na mesma resposta)
@DONE <resumo final>        — use SÓ quando a tarefa estiver concluída

Regras:
- Apenas linhas @RUN executam; texto comum é ignorado pela máquina.
- Após cada lote de @RUN você receberá stdout/stderr/exit code de cada comando e poderá continuar.
- Não invente saídas: rode comandos para verificar. Finalize com @DONE e um resumo do que foi feito.
`.trim()

export interface CodeChatFnOptions {
  /** Max LLM↔sandbox round-trips per member turn. */
  maxSteps?: number
  /** Per-command timeout, in ms. */
  perCommandTimeoutMs?: number
  /** Truncate each stream when feeding output back to the model (chars). */
  maxOutputChars?: number
}

const DEFAULTS: Required<CodeChatFnOptions> = {
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
 *  the base ChatFn treats a separate `system` message). */
function injectProtocol(messages: ChatMessageInput[]): ChatMessageInput[] {
  const working = messages.map(m => ({ ...m }))
  const firstUser = working.find(m => m.role === 'user')
  if (firstUser) {
    firstUser.content = `${CODE_PROTOCOL_PROMPT}\n\n---\n\n${firstUser.content}`
  } else {
    working.unshift({ role: 'user', content: CODE_PROTOCOL_PROMPT })
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

  return async (agentId, messages, leadContext, chatOptions) => {
    const working = injectProtocol(messages)
    const commands: CommandRun[] = []
    let totalTokens = 0
    let lastModel = chatOptions?.model ?? ''
    let finalMessage = ''

    for (let step = 0; step < maxSteps; step++) {
      const out = await baseChat(agentId, working, leadContext, chatOptions)
      totalTokens += out.usage?.total_tokens ?? 0
      lastModel = out.model || lastModel

      const actions = parseCodeActions(out.message)
      const runs = actions.filter(a => a.type === 'run')
      const doneAction = actions.find(a => a.type === 'done')

      const observations: string[] = []
      for (const r of runs) {
        const res = await sandbox.exec(r.command!, { timeoutMs: perCommandTimeoutMs })
        const entry: CommandRun = {
          cmd: r.command!, stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode, ms: res.ms,
        }
        commands.push(entry)
        observations.push(formatObservation(entry, maxOutputChars))
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
