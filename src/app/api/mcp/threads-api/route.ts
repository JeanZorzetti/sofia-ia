/**
 * Threads API — MCP Server endpoint
 *
 * Expõe as capacidades da conta Threads conectada como tools MCP.
 * Autenticação via API Key (Bearer sk-...) que resolve para um userId,
 * que por sua vez busca a conta Threads associada no banco.
 *
 * Tools disponíveis:
 *  - threads_validate_format       → valida posts (500 chars/post, max 10 posts)
 *  - threads_publish_post          → publica post via Threads Graph API
 *  - threads_get_profile           → retorna dados do perfil conectado
 *  - threads_get_recent_posts      → lista posts recentes com ID e timestamp
 *  - threads_get_post_insights     → métricas de um post (views, likes, replies...)
 *  - threads_get_profile_insights  → métricas do perfil em um período
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
  {
    name: 'threads_get_recent_posts',
    description:
      'Lista os posts mais recentes da conta Threads conectada com ID, texto, data e permalink. Use para obter IDs de posts antes de buscar seus insights.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Quantidade de posts a retornar (padrão: 10, máx: 25)',
        },
      },
      required: [],
    },
  },
  {
    name: 'threads_get_post_insights',
    description:
      'Retorna métricas detalhadas de um post específico: views, likes, replies, reposts, quotes e taxa de engajamento. Requer threads_manage_insights scope.',
    inputSchema: {
      type: 'object',
      properties: {
        post_id: {
          type: 'string',
          description: 'ID do post Threads (obtido via threads_get_recent_posts)',
        },
      },
      required: ['post_id'],
    },
  },
  {
    name: 'threads_get_profile_insights',
    description:
      'Retorna métricas agregadas do perfil em um período: views, likes, replies, reposts, quotes e taxa de engajamento geral. Requer threads_manage_insights scope.',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'string',
          description: 'Data de início no formato ISO 8601 (ex: 2026-02-24). Padrão: 7 dias atrás',
        },
        until: {
          type: 'string',
          description: 'Data de fim no formato ISO 8601 (ex: 2026-03-03). Padrão: hoje',
        },
      },
      required: [],
    },
  },
  {
    name: 'threads_check_scheduled_posts',
    description:
      'Retorna os posts agendados pendentes que estão prontos para publicação (scheduledAt <= agora). Use para verificar a fila antes de publicar.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Máximo de posts a retornar (padrão: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'threads_mark_post_published',
    description:
      'Marca um post agendado como publicado após a publicação bem-sucedida. Atualiza o status no banco de dados.',
    inputSchema: {
      type: 'object',
      properties: {
        scheduled_post_id: {
          type: 'string',
          description: 'ID do ThreadsScheduledPost (UUID)',
        },
        threads_post_id: {
          type: 'string',
          description: 'ID do post retornado pela Threads API após publicação',
        },
      },
      required: ['scheduled_post_id', 'threads_post_id'],
    },
  },
  {
    name: 'threads_get_replies',
    description:
      'Lista replies (comentários) de um post específico do Threads. Retorna texto, username e timestamp de cada reply. Requer threads_read_replies scope.',
    inputSchema: {
      type: 'object',
      properties: {
        post_id: {
          type: 'string',
          description: 'ID do post Threads (obtido via threads_get_recent_posts)',
        },
        limit: {
          type: 'number',
          description: 'Quantidade de replies a retornar (padrão: 20, máx: 50)',
        },
      },
      required: ['post_id'],
    },
  },
  {
    name: 'threads_reply_to_post',
    description:
      'Publica uma reply (resposta) a um post ou comentário no Threads. Use para responder perguntas, leads quentes e engajamento da audiência. Requer threads_manage_replies scope.',
    inputSchema: {
      type: 'object',
      properties: {
        post_id: {
          type: 'string',
          description: 'ID do post ou reply ao qual responder',
        },
        text: {
          type: 'string',
          description: 'Texto da resposta (máx 500 caracteres)',
        },
      },
      required: ['post_id', 'text'],
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

  // ── threads_get_recent_posts ─────────────────────────────────────────────
  if (name === 'threads_get_recent_posts') {
    const limit = typeof args.limit === 'number' ? args.limit : 10
    const posts = await service.getRecentPosts(limit)
    if (!posts.length) return ok('Nenhum post encontrado.')
    const formatted = posts
      .map((p, i) => {
        const date = p.timestamp?.slice(0, 10) ?? '?'
        const snippet = p.text ? (p.text.length > 120 ? p.text.slice(0, 120) + '...' : p.text) : '(sem texto)'
        return `${i + 1}. [${date}] ${snippet}\n   ID: ${p.id}${p.permalink ? `\n   Link: ${p.permalink}` : ''}`
      })
      .join('\n\n')
    return ok(`📋 Últimos ${posts.length} posts:\n\n${formatted}`)
  }

  // ── threads_get_post_insights ────────────────────────────────────────────
  if (name === 'threads_get_post_insights') {
    const postId = args.post_id as string
    if (!postId?.trim()) return fail('post_id é obrigatório')
    try {
      const insights = await service.getPostInsights(postId)
      const totalEng = insights.likes + insights.replies + insights.reposts + insights.quotes
      const engRate = insights.views > 0 ? ((totalEng / insights.views) * 100).toFixed(2) : '0.00'
      return ok(
        `📊 Insights do Post ${postId}\n\n` +
        `👁️  Views:       ${insights.views}\n` +
        `❤️  Likes:       ${insights.likes}\n` +
        `💬  Replies:     ${insights.replies}\n` +
        `🔁  Reposts:     ${insights.reposts}\n` +
        `💬  Quotes:      ${insights.quotes}\n` +
        `📈  Engajamento: ${engRate}% (${totalEng} interações / ${insights.views} views)`
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('authorized') || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('scope') || msg.toLowerCase().includes('oauth')) {
        return fail('Permissão insuficiente para insights. Reconecte o Threads em /dashboard/integrations para liberar o escopo threads_manage_insights.')
      }
      return fail(msg)
    }
  }

  // ── threads_get_profile_insights ─────────────────────────────────────────
  if (name === 'threads_get_profile_insights') {
    const since = args.since as string | undefined
    const until = args.until as string | undefined
    try {
      const insights = await service.getProfileInsights(since, until)
      const totalEng = insights.totalLikes + insights.totalReplies + insights.totalReposts + insights.totalQuotes
      const engRate = insights.totalViews > 0 ? ((totalEng / insights.totalViews) * 100).toFixed(2) : '0.00'
      return ok(
        `📊 Insights do Perfil (${insights.since} → ${insights.until})\n\n` +
        `👁️  Views totais:     ${insights.totalViews}\n` +
        `❤️  Likes totais:     ${insights.totalLikes}\n` +
        `💬  Replies totais:   ${insights.totalReplies}\n` +
        `🔁  Reposts totais:   ${insights.totalReposts}\n` +
        `💬  Quotes totais:    ${insights.totalQuotes}\n` +
        `📈  Taxa de engajamento: ${engRate}% (${totalEng} interações / ${insights.totalViews} views)`
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('authorized') || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('scope') || msg.toLowerCase().includes('oauth')) {
        return fail('Permissão insuficiente para insights. Reconecte o Threads em /dashboard/integrations para liberar o escopo threads_manage_insights.')
      }
      return fail(msg)
    }
  }

  // ── threads_check_scheduled_posts ────────────────────────────────────────
  if (name === 'threads_check_scheduled_posts') {
    const limit = typeof args.limit === 'number' ? Math.min(args.limit, 50) : 10
    const now = new Date()
    const pending = await prisma.threadsScheduledPost.findMany({
      where: {
        userId,
        status: 'pending',
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    })

    if (!pending.length) {
      return ok('✅ Nenhum post agendado pronto para publicação no momento.')
    }

    const formatted = pending
      .map((p, i) => {
        const when = p.scheduledAt.toISOString().slice(0, 16).replace('T', ' ')
        const snippet = p.text.length > 100 ? p.text.slice(0, 100) + '...' : p.text
        const meta = p.metadata && typeof p.metadata === 'object' ? JSON.stringify(p.metadata) : '{}'
        return `${i + 1}. [Agendado: ${when}]\n   ID: ${p.id}\n   Texto: ${snippet}\n   Metadata: ${meta}`
      })
      .join('\n\n')

    return ok(`📋 ${pending.length} post(s) prontos para publicação:\n\n${formatted}`)
  }

  // ── threads_mark_post_published ──────────────────────────────────────────
  if (name === 'threads_mark_post_published') {
    const scheduledPostId = args.scheduled_post_id as string
    const threadsPostId = args.threads_post_id as string

    if (!scheduledPostId?.trim()) return fail('scheduled_post_id é obrigatório')
    if (!threadsPostId?.trim()) return fail('threads_post_id é obrigatório')

    const post = await prisma.threadsScheduledPost.findUnique({
      where: { id: scheduledPostId },
    })

    if (!post) return fail(`Post agendado não encontrado: ${scheduledPostId}`)
    if (post.userId !== userId) return fail('Acesso negado — post pertence a outro usuário')
    if (post.status === 'published') return ok(`Post ${scheduledPostId} já estava marcado como publicado.`)

    await prisma.threadsScheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: 'published',
        postId: threadsPostId,
        publishedAt: new Date(),
      },
    })

    return ok(`✅ Post marcado como publicado!\nID agendado: ${scheduledPostId}\nPost ID Threads: ${threadsPostId}`)
  }

  // ── threads_get_replies ───────────────────────────────────────────────────
  if (name === 'threads_get_replies') {
    const postId = args.post_id as string
    if (!postId?.trim()) return fail('post_id é obrigatório')
    const limit = typeof args.limit === 'number' ? args.limit : 20
    try {
      const replies = await service.getReplies(postId, limit)
      if (!replies.length) return ok(`💬 Nenhuma reply encontrada no post ${postId}.`)
      const formatted = replies
        .map((r, i) => {
          const date = r.timestamp?.slice(0, 16).replace('T', ' ') ?? '?'
          const user = r.username ? `@${r.username}` : 'anônimo'
          const text = r.text ? (r.text.length > 200 ? r.text.slice(0, 200) + '...' : r.text) : '(sem texto)'
          const hasMore = r.has_replies ? ' [tem sub-replies]' : ''
          return `${i + 1}. [${date}] ${user}${hasMore}\n   "${text}"\n   ID: ${r.id}`
        })
        .join('\n\n')
      return ok(`💬 ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'} no post ${postId}:\n\n${formatted}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('authorized') || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('scope')) {
        return fail('Permissão insuficiente para replies. Reconecte o Threads em /dashboard/integrations para liberar o escopo threads_read_replies.')
      }
      return fail(msg)
    }
  }

  // ── threads_reply_to_post ─────────────────────────────────────────────────
  if (name === 'threads_reply_to_post') {
    const postId = args.post_id as string
    const text = args.text as string
    if (!postId?.trim()) return fail('post_id é obrigatório')
    if (!text?.trim()) return fail('text é obrigatório')
    if (text.length > 500) return fail(`Texto excede 500 chars (${text.length})`)
    try {
      const result = await service.replyToPost(postId, text)
      if (!result.success) return fail(result.error || 'Falha ao publicar reply')
      return ok(`✅ Reply publicada com sucesso!\nReply ID: ${result.replyId}\nEm resposta ao post: ${postId}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('authorized') || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('scope')) {
        return fail('Permissão insuficiente para responder. Reconecte o Threads em /dashboard/integrations para liberar o escopo threads_manage_replies.')
      }
      return fail(msg)
    }
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
