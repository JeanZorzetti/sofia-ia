import { prisma } from '@/lib/prisma'

export interface McpServerTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const SOFIA_MCP_TOOLS: McpServerTool[] = [
  {
    name: 'list_agents',
    description: 'Lista todos os agentes de IA disponíveis na Polaris IA',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'call_agent',
    description: 'Envia uma mensagem para um agente de IA da Polaris IA e retorna a resposta',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'ID do agente' },
        message: { type: 'string', description: 'Mensagem para o agente' },
      },
      required: ['agentId', 'message'],
    },
  },
  {
    name: 'search_knowledge',
    description: 'Busca em uma base de conhecimento da Polaris IA por similaridade semântica',
    inputSchema: {
      type: 'object',
      properties: {
        knowledgeBaseId: { type: 'string', description: 'ID da base de conhecimento' },
        query: { type: 'string', description: 'Texto de busca' },
      },
      required: ['knowledgeBaseId', 'query'],
    },
  },
  {
    name: 'publish_threads',
    description: 'Publica um post no Threads (Meta) para o usuário autenticado',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Texto do post (máx. 500 chars)' },
        imageUrl: { type: 'string', description: 'URL de imagem opcional' },
      },
      required: ['text'],
    },
  },
]

export async function executeSofiaMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const text = (result: string) => ({ content: [{ type: 'text', text: result }] })

  switch (toolName) {
    case 'list_agents': {
      const agents = await prisma.agent.findMany({
        where: { createdBy: userId, status: 'active' },
        select: { id: true, name: true, description: true },
      })
      return text(JSON.stringify(agents, null, 2))
    }

    case 'call_agent': {
      const { agentId, message } = args as { agentId: string; message: string }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${appUrl}/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      return text(data.response || data.message || JSON.stringify(data))
    }

    case 'search_knowledge': {
      const { knowledgeBaseId, query } = args as { knowledgeBaseId: string; query: string }
      const docs = await prisma.knowledgeDocument.findMany({
        where: { knowledgeBaseId, status: 'completed' },
        select: { title: true, content: true },
        take: 3,
      })
      const results = docs.map(d => `**${d.title}**\n${d.content.slice(0, 500)}`).join('\n\n---\n\n')
      return text(results || 'Nenhum documento encontrado.')
    }

    case 'publish_threads': {
      const account = await prisma.threadsAccount.findUnique({ where: { userId } })
      if (!account) return text('Erro: conta Threads não conectada.')

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${appUrl}/api/threads/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ text: args.text, imageUrl: args.imageUrl }),
      })
      const data = await res.json()
      return text(data.success ? `Post publicado! ID: ${data.data?.postId}` : `Erro: ${data.error}`)
    }

    default:
      return text(`Tool desconhecida: ${toolName}`)
  }
}
