/**
 * Threads API — MCP Server endpoint
 *
 * Expõe as capacidades da conta Threads conectada como tools MCP.
 * Autenticação via API Key (Bearer sk-...) que resolve para um userId,
 * que por sua vez busca a conta Threads associada no banco.
 *
 * Tools disponíveis:
 *  - threads_validate_format   → valida posts (500 chars/post, max 10 posts)
 *  - threads_publish_post      → publica post via Threads Graph API
 *  - threads_get_profile       → retorna dados do perfil conectado
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromApiKey } from '@/lib/api-key-auth'
import { prisma } from '@/lib/prisma'
import { ThreadsService } from '@/lib/integrations/threads'

// ─── Tool Definitions (MCP schema) ──────────────────────────────────────────

const THREADS_MCP_TOOLS = [
  {
    name: 'threads_validate_format',
    description:
      'Valida o formato de um thread antes de publicar. Verifica limite de 500 caracteres por post e máximo de 10 posts por thread. Retorna erros de validação e estatísticas.',
    inputSchema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          description: 'Array de strings, cada uma sendo um post do thread',
          items: { type: 'string' },
        },
      },
      required: ['posts'],
    },
  },
  {
    name: 'threads_publish_post',
    description:
      'Publica um post de texto simples na conta Threads conectada. Use apenas após validar o formato com threads_validate_format.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Texto do post (máx 500 caracteres)',
        },
        reply_control: {
          type: 'string',
          enum: ['everyone', 'accounts_you_follow', 'mentioned_only'],
          description: 'Quem pode responder ao post. Padrão: everyone',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'threads_get_profile',
    description: 'Retorna dados do perfil Threads conectado: username, nome, biografia e seguidores.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
]

// ─── Tool Executor ───────────────────────────────────────────────────────────

async function executeThreadsTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const ok = (text: string) => ({ content: [{ type: 'text', text }] })
  const fail = (msg: string) => ({ content: [{ type: 'text', text: `ERRO: ${msg}` }] })

  // ── threads_validate_format ─────────────────────────────────────────────
  if (name === 'threads_validate_format') {
    const posts = args.posts as string[]
    if (!Array.isArray(posts) || posts.length === 0) {
      return fail('posts deve ser um array não vazio')
    }

    const errors: string[] = []
    const stats: string[] = []

    if (posts.length > 10) {
      errors.push(`Thread tem ${posts.length} posts — máximo é 10`)
    }

    posts.forEach((post, i) => {
      const len = post.length
      stats.push(`Post ${i + 1}: ${len}/500 chars`)
      if (len > 500) {
        errors.push(`Post ${i + 1} excede 500 chars (${len} chars)`)
      }
      if (!post.trim()) {
        errors.push(`Post ${i + 1} está vazio`)
      }
    })

    if (errors.length > 0) {
      return ok(
        `❌ FORMATO INVÁLIDO\n\nErros:\n${errors.map((e) => `  • ${e}`).join('\n')}\n\nEstatísticas:\n${stats.map((s) => `  ${s}`).join('\n')}`
      )
    }

    return ok(
      `✅ FORMATO VÁLIDO\n\n${posts.length} post${posts.length > 1 ? 's' : ''} prontos para publicação\n\nEstatísticas:\n${stats.map((s) => `  ${s}`).join('\n')}`
    )
  }

  // ── threads_publish_post / threads_get_profile — requerem conta Threads ──
  const account = await prisma.threadsAccount.findUnique({ where: { userId } })

  if (!account) {
    return fail('Conta Threads não conectada. Acesse /dashboard/integrations para conectar.')
  }

  if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
    return fail('Token Threads expirado. Reconecte em /dashboard/integrations.')
  }

  const service = new ThreadsService(account.accessToken, account.threadsUserId)

  // ── threads_get_profile ─────────────────────────────────────────────────
  if (name === 'threads_get_profile') {
    const profile = await service.getProfile()
    if (!profile) return fail('Não foi possível buscar o perfil Threads')
    return ok(
      JSON.stringify({
        username: profile.username,
        name: profile.name,
        biography: profile.threads_biography,
        followers: profile.followers_count,
        id: profile.id,
      }, null, 2)
    )
  }

  // ── threads_publish_post ────────────────────────────────────────────────
  if (name === 'threads_publish_post') {
    const text = args.text as string
    if (!text?.trim()) return fail('text é obrigatório')
    if (text.length > 500) return fail(`Texto excede 500 chars (${text.length})`)

    const result = await service.publish({
      text,
      replyControl: (args.reply_control as 'everyone' | 'accounts_you_follow' | 'mentioned_only') ?? 'everyone',
    })

    if (!result.success) return fail(result.error || 'Falha ao publicar')

    return ok(`✅ Publicado com sucesso!\nPost ID: ${result.postId}`)
  }

  return { content: [{ type: 'text', text: `Tool desconhecida: ${name}` }] }
}

// ─── Route Handlers ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized. Use Authorization: Bearer <api-key>' }, id: null },
      { status: 401 }
    )
  }

  let body: { jsonrpc: string; method: string; params?: Record<string, unknown>; id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
      { status: 400 }
    )
  }

  const { method, params, id } = body
  const reply = (result: unknown) => NextResponse.json({ jsonrpc: '2.0', result, id })
  const error = (code: number, message: string) =>
    NextResponse.json({ jsonrpc: '2.0', error: { code, message }, id })

  switch (method) {
    case 'initialize':
      return reply({
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'sofia-threads-mcp', version: '1.0.0' },
      })

    case 'tools/list':
      return reply({ tools: THREADS_MCP_TOOLS })

    case 'tools/call': {
      const { name, arguments: args } = params as { name: string; arguments: Record<string, unknown> }
      if (!name) return error(-32602, 'Missing tool name')
      const result = await executeThreadsTool(name, args || {}, auth.userId)
      return reply(result)
    }

    default:
      return error(-32601, `Method not found: ${method}`)
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Sofia — Threads MCP Server',
    version: '1.0.0',
    protocol: '2024-11-05',
    tools: THREADS_MCP_TOOLS.map((t) => t.name),
  })
}
