/**
 * Notion integration tools.
 * Ferramentas para criar páginas, buscar databases e atualizar páginas no Notion.
 */

import { getOAuthConnection } from './oauth'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

/**
 * Busca o token de acesso do Notion para um usuário.
 */
async function getNotionToken(userId: string): Promise<string> {
  const connection = await getOAuthConnection(userId, 'notion')
  if (!connection) {
    throw new Error(
      'Notion não conectado. Acesse /dashboard/integrations/notion para conectar.'
    )
  }
  return connection.accessToken
}

/**
 * Headers padrão para a API do Notion.
 */
function getNotionHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

/**
 * Tool: notion_create_page — cria uma nova página em um database do Notion.
 * @param userId ID do usuário
 * @param databaseId ID do database no Notion
 * @param properties Propriedades da página (título, texto, número, etc.)
 */
export async function notionCreatePage(
  userId: string,
  databaseId: string,
  properties: Record<string, unknown>
): Promise<{ id: string; url: string; createdTime: string }> {
  const accessToken = await getNotionToken(userId)

  const response = await fetch(`${NOTION_API_BASE}/pages`, {
    method: 'POST',
    headers: getNotionHeaders(accessToken),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Notion API error (create_page): ${response.status} ${err}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    url: data.url,
    createdTime: data.created_time,
  }
}

/**
 * Tool: notion_query_database — busca páginas em um database com filtro opcional.
 * @param userId ID do usuário
 * @param databaseId ID do database no Notion
 * @param filter Filtro opcional no formato da Notion API
 */
export async function notionQueryDatabase(
  userId: string,
  databaseId: string,
  filter?: Record<string, unknown>
): Promise<{ results: unknown[]; hasMore: boolean; nextCursor: string | null }> {
  const accessToken = await getNotionToken(userId)

  const body: Record<string, unknown> = {
    page_size: 20,
  }
  if (filter) {
    body.filter = filter
  }

  const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
    method: 'POST',
    headers: getNotionHeaders(accessToken),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Notion API error (query_database): ${response.status} ${err}`)
  }

  const data = await response.json()
  return {
    results: data.results || [],
    hasMore: data.has_more || false,
    nextCursor: data.next_cursor || null,
  }
}

/**
 * Tool: notion_update_page — atualiza propriedades de uma página existente.
 * @param userId ID do usuário
 * @param pageId ID da página no Notion
 * @param properties Propriedades a atualizar
 */
export async function notionUpdatePage(
  userId: string,
  pageId: string,
  properties: Record<string, unknown>
): Promise<{ id: string; url: string; lastEditedTime: string }> {
  const accessToken = await getNotionToken(userId)

  const response = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
    method: 'PATCH',
    headers: getNotionHeaders(accessToken),
    body: JSON.stringify({ properties }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Notion API error (update_page): ${response.status} ${err}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    url: data.url,
    lastEditedTime: data.last_edited_time,
  }
}

/**
 * Executa uma tool do Notion dado o nome e input.
 */
export async function runNotionTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  switch (toolName) {
    case 'notion_create_page':
      return notionCreatePage(
        userId,
        input.databaseId as string,
        input.properties as Record<string, unknown>
      )
    case 'notion_query_database':
      return notionQueryDatabase(
        userId,
        input.databaseId as string,
        input.filter as Record<string, unknown> | undefined
      )
    case 'notion_update_page':
      return notionUpdatePage(
        userId,
        input.pageId as string,
        input.properties as Record<string, unknown>
      )
    default:
      throw new Error(`Tool Notion desconhecida: ${toolName}`)
  }
}

/**
 * Definições de tools Notion para injeção em agentes.
 */
export const NOTION_TOOL_DEFINITIONS = [
  {
    name: 'notion_create_page',
    description:
      'Cria uma nova página em um database do Notion. Use para adicionar registros, tarefas ou documentos.',
    inputSchema: {
      type: 'object',
      properties: {
        databaseId: {
          type: 'string',
          description: 'ID do database no Notion (encontrado na URL)',
        },
        properties: {
          type: 'object',
          description:
            'Propriedades da página no formato da Notion API. Ex: { "Nome": { "title": [{ "text": { "content": "Minha página" } }] } }',
        },
      },
      required: ['databaseId', 'properties'],
    },
  },
  {
    name: 'notion_query_database',
    description:
      'Busca páginas em um database do Notion com filtro opcional. Retorna até 20 resultados.',
    inputSchema: {
      type: 'object',
      properties: {
        databaseId: {
          type: 'string',
          description: 'ID do database no Notion',
        },
        filter: {
          type: 'object',
          description:
            'Filtro opcional no formato da Notion API. Ex: { "property": "Status", "select": { "equals": "Ativo" } }',
        },
      },
      required: ['databaseId'],
    },
  },
  {
    name: 'notion_update_page',
    description: 'Atualiza propriedades de uma página existente no Notion.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'ID da página no Notion',
        },
        properties: {
          type: 'object',
          description: 'Propriedades a atualizar no formato da Notion API',
        },
      },
      required: ['pageId', 'properties'],
    },
  },
]
