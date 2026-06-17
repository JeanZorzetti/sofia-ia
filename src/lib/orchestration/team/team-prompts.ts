// src/lib/orchestration/team/team-prompts.ts
// Coordination prompt builders (conceptually ported from Agent Teams AI).
// Each returns the `content` of the `user` message for chatWithAgent;
// the member's own systemPrompt provides its persona.

import type { MemberCtx, TaskRow, MessageRow } from './team-types'
import type { ChangedFile } from '../../git/repo-lifecycle'

const DIRECTIVE_CONTRACT = `
Responda SOMENTE com diretivas, uma por linha:
@TASK [worker:NomeDoAgente] [after:#2] Título curto da tarefa
  (linhas indentadas = corpo/critério de aceite)
@MESSAGE [para:NomeDoAgente] mensagem curta para um membro
@DONE Texto final consolidado (use só quando TODAS as tarefas estiverem concluídas)

Regras:
- Atribua cada @TASK a um Worker pelo nome do roster abaixo.
- [after:#n] é OPCIONAL: declara que a tarefa só pode começar depois que a tarefa
  #n do board estiver concluída (use os #ids mostrados no board). Para múltiplas
  dependências: [after:#1,#3]. Omita quando não houver dependência.
- Não duplique tarefas que já existem no board.
- Se o board já está todo concluído, responda apenas com @DONE e o resumo final.`.trim()

function rosterBlock(members: MemberCtx[]): string {
  return members
    .map(m => `- ${m.agentName} — ${m.role}`)
    .join('\n')
}

export function buildBoardSnapshot(tasks: TaskRow[], messages: MessageRow[]): string {
  if (tasks.length === 0) return 'Board vazio (nenhuma tarefa criada ainda).'
  // `blocked`/`clarify` are graph-mode only (linear never sets them → empty col →
  // no change to the linear snapshot).
  const cols: TaskRow['status'][] = ['todo', 'doing', 'review', 'done', 'rejected', 'blocked', 'clarify']
  const parts: string[] = []
  for (const col of cols) {
    const items = tasks.filter(t => t.status === col)
    if (items.length === 0) continue
    parts.push(`[${col.toUpperCase()}]`)
    for (const t of items) {
      const note = t.reviewNote ? ` (feedback: ${t.reviewNote})` : ''
      // G6: surface the Worker's pending question on a `clarify` task so the Lead
      // can answer it — the last message logged under the task, falling back to body.
      let doubt = ''
      if (col === 'clarify') {
        const last = [...messages].reverse().find(m => m.taskId === t.id)
        const q = last?.content || last?.summary || t.body || ''
        if (q) doubt = ` (dúvida: ${q})`
      }
      // Stable display id `#n` = position+1, so the Lead can reference a task in
      // `[after:#n]` (G1) or `@CLARIFY [#n]` (G6). Position is immutable → stable id.
      parts.push(`  - #${t.position + 1} ${t.title}${note}${doubt}`)
    }
  }
  const recent = messages.slice(-5)
  if (recent.length > 0) {
    parts.push('\nMensagens recentes:')
    for (const m of recent) parts.push(`  • ${m.summary ?? m.content.slice(0, 120)}`)
  }
  return parts.join('\n')
}

// G6: the clarify directive is appended to the contract ONLY when a `clarify` task
// is actually pending. Keeps the contract byte-identical for linear runs (which
// never produce `clarify`) and for graph runs with no open doubt — strictly additive.
const CLARIFY_DIRECTIVE = `@CLARIFY [#n] resposta — responda a uma dúvida pendente de um Worker (use o #id da tarefa em [CLARIFY]); ela volta a ser executada com a sua resposta.`

export function buildLeadContext(
  mission: string,
  tasks: TaskRow[],
  messages: MessageRow[],
  members: MemberCtx[],
): string {
  const contract = tasks.some(t => t.status === 'clarify')
    ? `${DIRECTIVE_CONTRACT}\n${CLARIFY_DIRECTIVE}`
    : DIRECTIVE_CONTRACT
  return [
    'Você é o LEAD de um time de agentes. Coordene o trabalho para cumprir a missão.',
    '',
    `## Missão\n${mission}`,
    '',
    `## Roster\n${rosterBlock(members)}`,
    '',
    `## Estado atual do board\n${buildBoardSnapshot(tasks, messages)}`,
    '',
    `## Protocolo de resposta\n${contract}`,
  ].join('\n')
}

export function buildTaskPrompt(
  task: TaskRow,
  feedback: string | null,
  // G6: `allowClarify` is OPT-IN — ONLY `runTeamGraph` passes it. The linear
  // coordinator (`runTeam`) calls this with TWO args, so its output stays
  // byte-identical and its Worker is never told to emit `@CLARIFY` (which it
  // wouldn't parse → would leak into `result`). Protects the linear path.
  opts?: { allowClarify?: boolean },
): string {
  const parts = [
    'Você é um WORKER do time. Execute EXCLUSIVAMENTE a tarefa abaixo e entregue o resultado completo.',
    '',
    `## Tarefa\n${task.title}`,
  ]
  if (task.body) parts.push(`\n${task.body}`)
  if (feedback) {
    parts.push(`\n## ⚠️ Correção solicitada pelo Reviewer\n${feedback}\n\nRefaça corrigindo os pontos acima.`)
  }
  parts.push('\nAo terminar, responda apenas com o resultado da tarefa.')
  if (opts?.allowClarify) {
    parts.push('\nSe faltar informação ESSENCIAL e você não puder assumir com segurança, responda com `@CLARIFY <pergunta objetiva>` em vez de adivinhar.')
  }
  return parts.join('\n')
}

/**
 * Render the captured per-file diff (C3) for the reviewer prompt. Each file shows
 * its status + the capped unified patch; binary/over-budget files are flagged
 * instead of dumping content. Returns '' when there's nothing to show, so the
 * caller can fall back to the text-only review (chat-runs / C0 / empty diff).
 */
export function renderDiffForReview(files: ChangedFile[]): string {
  if (!files || files.length === 0) return ''
  const parts: string[] = []
  for (const f of files) {
    if (f.binary) {
      parts.push(`### ${f.status} ${f.path}\n(arquivo binário — sem patch textual)`)
    } else if (f.patch) {
      const note = f.truncated ? ' (truncado — patch maior que o limite)' : ''
      parts.push(`### ${f.status} ${f.path}${note}\n\`\`\`diff\n${f.patch}\n\`\`\``)
    } else {
      const note = f.truncated ? ' (omitido — diff total acima do limite)' : ''
      parts.push(`### ${f.status} ${f.path}${note}`)
    }
  }
  return parts.join('\n\n')
}

export function buildReviewPrompt(task: TaskRow, diff?: ChangedFile[]): string {
  const rendered = renderDiffForReview(diff ?? [])
  // The diff block is purely ADDITIVE: with no diff the output is byte-identical
  // to the pre-C3 prompt (chat-runs / C0 unchanged).
  const diffSection = rendered
    ? [
        `\n## Diff das mudanças (código real)\n${rendered}`,
        '',
        'Avalie o DIFF acima além do texto: confira se as mudanças cumprem a tarefa e não introduzem erros.',
      ]
    : []
  return [
    'Você é o REVIEWER do time. Avalie criticamente o trabalho do Worker.',
    '',
    `## Tarefa\n${task.title}`,
    task.body ? `\n${task.body}` : '',
    '',
    `## Resultado entregue pelo Worker\n${task.result ?? '(vazio)'}`,
    ...diffSection,
    '',
    'Responda SOMENTE com uma diretiva:',
    '@APPROVE  — se o resultado cumpre a tarefa',
    '@REJECT motivo objetivo  — se precisa ser refeito',
  ].join('\n')
}

export function buildConsolidationPrompt(tasks: TaskRow[]): string {
  const done = tasks
    .filter(t => t.status === 'done')
    .map(t => `### ${t.title}\n${t.result ?? ''}`)
    .join('\n\n')
  const failed = tasks.filter(t => t.status === 'rejected').map(t => `- ${t.title}`).join('\n')
  return [
    'Você é o LEAD. Consolide os resultados do time numa entrega final coesa para o usuário.',
    '',
    `## Resultados aprovados\n${done || '(nenhum)'}`,
    failed ? `\n## Tarefas não concluídas\n${failed}` : '',
    '',
    'Escreva a entrega final consolidada (texto livre, sem diretivas).',
  ].join('\n')
}
