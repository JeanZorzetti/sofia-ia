import { prisma } from '@/lib/prisma'

/**
 * Definições de tools de memória compatíveis com o formato OpenAI function calling.
 */
export const memoryToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'save_memory',
      description: 'Salva um fato importante sobre o usuário na memória persistente. Use para guardar preferências, nome, contexto relevante que deve ser lembrado em conversas futuras.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Chave identificadora do fato (ex: "nome_usuario", "idioma_preferido", "setor_empresa"). Use snake_case.',
          },
          value: {
            type: 'string',
            description: 'Valor do fato a ser salvo.',
          },
        },
        required: ['key', 'value'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'recall_memory',
      description: 'Recupera fatos salvos na memória do usuário. Se key for fornecida, retorna apenas esse fato. Sem key, retorna todos os fatos salvos.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Chave específica para buscar (opcional). Se omitida, retorna toda a memória.',
          },
        },
        required: [],
      },
    },
  },
]

/**
 * Executa as tools de memória.
 */
export async function executeMemoryTool(
  name: string,
  args: { key?: string; value?: string },
  context: { agentId: string; userId: string }
): Promise<string> {
  try {
    if (name === 'save_memory') {
      if (!args.key || args.value === undefined) {
        return 'Erro: key e value são obrigatórios para save_memory.'
      }

      await prisma.agentMemory.upsert({
        where: {
          agentId_userId_key: {
            agentId: context.agentId,
            userId: context.userId,
            key: args.key,
          },
        },
        update: { value: String(args.value) },
        create: {
          agentId: context.agentId,
          userId: context.userId,
          key: args.key,
          value: String(args.value),
        },
      })

      return `Memória salva: "${args.key}" = "${args.value}"`
    }

    if (name === 'recall_memory') {
      if (args.key) {
        const memory = await prisma.agentMemory.findUnique({
          where: {
            agentId_userId_key: {
              agentId: context.agentId,
              userId: context.userId,
              key: args.key,
            },
          },
        })

        if (!memory) return `Nenhum fato encontrado para a chave "${args.key}".`
        return `${args.key}: ${memory.value}`
      } else {
        const memories = await prisma.agentMemory.findMany({
          where: { agentId: context.agentId, userId: context.userId },
          orderBy: { updatedAt: 'desc' },
        })

        if (memories.length === 0) return 'Nenhum fato salvo na memória ainda.'
        return memories.map((m) => `${m.key}: ${m.value}`).join('\n')
      }
    }

    return `Tool desconhecida: ${name}`
  } catch (error: any) {
    console.error(`[memory-tool] Error executing ${name}:`, error)
    return `Erro ao executar ${name}: ${error.message}`
  }
}

/**
 * Busca e formata o bloco de memória para injeção no system prompt.
 */
export async function buildMemorySystemPromptBlock(agentId: string, userId: string): Promise<string> {
  try {
    const memories = await prisma.agentMemory.findMany({
      where: { agentId, userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })

    if (memories.length === 0) return ''

    const lines = memories.map((m) => `- ${m.key}: ${m.value}`).join('\n')
    return `[Memória do usuário]\n${lines}\n[/Memória]\n\n`
  } catch {
    return ''
  }
}
