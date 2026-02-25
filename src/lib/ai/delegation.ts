/**
 * Agent-to-Agent delegation protocol.
 * Permite que um agente delegue tarefas para outro agente,
 * com proteção anti-loop (máximo 3 níveis de profundidade).
 */

import { prisma } from '@/lib/prisma'

/**
 * Delega uma mensagem de um agente para outro agente.
 * Reutiliza chatWithAgent internamente para executar o agente alvo.
 *
 * @param fromAgentId - ID do agente que está delegando
 * @param toAgentId   - ID do agente que vai receber a delegação
 * @param message     - Mensagem/tarefa a ser delegada
 * @param userId      - ID do usuário (para memória e contexto)
 * @param depth       - Nível atual de aninhamento (máx 3)
 */
export async function delegateToAgent(
  fromAgentId: string,
  toAgentId: string,
  message: string,
  userId: string,
  depth: number = 0
): Promise<string> {
  if (depth >= 3) {
    return 'Erro: limite de delegação atingido (máximo 3 níveis de aninhamento)'
  }

  // Buscar agente alvo
  const toAgent = await prisma.agent.findUnique({
    where: { id: toAgentId },
    select: { id: true, name: true, status: true },
  })

  if (!toAgent) {
    return `Erro: agente com ID "${toAgentId}" não encontrado`
  }

  if (toAgent.status !== 'active') {
    return `Erro: agente "${toAgent.name}" está inativo e não pode receber delegações`
  }

  // Registrar delegação no banco com status pending
  const delegation = await prisma.agentDelegation.create({
    data: {
      fromAgentId,
      toAgentId,
      message,
      status: 'pending',
      depth,
    },
  })

  try {
    // Importar chatWithAgent dinamicamente para evitar circular imports
    const { chatWithAgent } = await import('@/lib/ai/groq')

    const response = await chatWithAgent(
      toAgentId,
      [{ role: 'user', content: message }],
      { userId, delegationDepth: depth + 1 }
    )

    const responseText = response.message || 'O agente não retornou resposta'

    // Atualizar delegação como completed
    await prisma.agentDelegation.update({
      where: { id: delegation.id },
      data: {
        response: responseText,
        status: 'completed',
      },
    })

    return responseText
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    // Atualizar delegação como failed
    await prisma.agentDelegation.update({
      where: { id: delegation.id },
      data: {
        response: `Erro: ${errorMessage}`,
        status: 'failed',
      },
    })

    return `Erro ao executar agente "${toAgent.name}": ${errorMessage}`
  }
}

/**
 * Retorna a definição da tool delegate_to_agent para injeção no contexto dos agentes.
 */
export function getDelegationToolDefinition() {
  return {
    name: 'delegate_to_agent',
    description:
      'Delega uma tarefa ou pergunta para outro agente especialista. Use quando precisar de expertise específica que outro agente possui.',
    parameters: {
      type: 'object',
      properties: {
        toAgentId: {
          type: 'string',
          description: 'ID do agente para o qual delegar a tarefa',
        },
        message: {
          type: 'string',
          description: 'A tarefa ou pergunta a ser delegada ao agente',
        },
      },
      required: ['toAgentId', 'message'],
    },
  }
}
