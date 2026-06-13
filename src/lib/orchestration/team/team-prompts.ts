// src/lib/orchestration/team/team-prompts.ts
// Coordination prompt builders (conceptually ported from Agent Teams AI).
// Each returns the `content` of the `user` message for chatWithAgent;
// the member's own systemPrompt provides its persona.

import type { MemberCtx, TaskRow, MessageRow } from './team-types'

const DIRECTIVE_CONTRACT = `
Responda SOMENTE com diretivas, uma por linha:
@TASK [worker:NomeDoAgente] Título curto da tarefa
  (linhas indentadas = corpo/critério de aceite)
@MESSAGE [para:NomeDoAgente] mensagem curta para um membro
@DONE Texto final consolidado (use só quando TODAS as tarefas estiverem concluídas)

Regras:
- Atribua cada @TASK a um Worker pelo nome do roster abaixo.
- Não duplique tarefas que já existem no board.
- Se o board já está todo concluído, responda apenas com @DONE e o resumo final.`.trim()

function rosterBlock(members: MemberCtx[]): string {
  return members
    .map(m => `- ${m.agentName} — ${m.role}`)
    .join('\n')
}

export function buildBoardSnapshot(tasks: TaskRow[], messages: MessageRow[]): string {
  if (tasks.length === 0) return 'Board vazio (nenhuma tarefa criada ainda).'
  const cols: TaskRow['status'][] = ['todo', 'doing', 'review', 'done', 'rejected']
  const parts: string[] = []
  for (const col of cols) {
    const items = tasks.filter(t => t.status === col)
    if (items.length === 0) continue
    parts.push(`[${col.toUpperCase()}]`)
    for (const t of items) {
      const note = t.reviewNote ? ` (feedback: ${t.reviewNote})` : ''
      parts.push(`  - ${t.title}${note}`)
    }
  }
  const recent = messages.slice(-5)
  if (recent.length > 0) {
    parts.push('\nMensagens recentes:')
    for (const m of recent) parts.push(`  • ${m.summary ?? m.content.slice(0, 120)}`)
  }
  return parts.join('\n')
}

export function buildLeadContext(
  mission: string,
  tasks: TaskRow[],
  messages: MessageRow[],
  members: MemberCtx[],
): string {
  return [
    'Você é o LEAD de um time de agentes. Coordene o trabalho para cumprir a missão.',
    '',
    `## Missão\n${mission}`,
    '',
    `## Roster\n${rosterBlock(members)}`,
    '',
    `## Estado atual do board\n${buildBoardSnapshot(tasks, messages)}`,
    '',
    `## Protocolo de resposta\n${DIRECTIVE_CONTRACT}`,
  ].join('\n')
}

export function buildTaskPrompt(task: TaskRow, feedback: string | null): string {
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
  return parts.join('\n')
}

export function buildReviewPrompt(task: TaskRow): string {
  return [
    'Você é o REVIEWER do time. Avalie criticamente o trabalho do Worker.',
    '',
    `## Tarefa\n${task.title}`,
    task.body ? `\n${task.body}` : '',
    '',
    `## Resultado entregue pelo Worker\n${task.result ?? '(vazio)'}`,
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
