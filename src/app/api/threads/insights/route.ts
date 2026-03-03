/**
 * /api/threads/insights
 *
 * GET — retorna dados de performance do Threads para o dashboard de analytics.
 * Agrega: perfil, insights do perfil (7/30 dias) e posts recentes com insights.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ThreadsService } from '@/lib/integrations/threads'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const account = await prisma.threadsAccount.findUnique({ where: { userId: auth.id } })
    if (!account) {
      return NextResponse.json({ error: 'Conta Threads não conectada' }, { status: 404 })
    }
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: 'Token expirado. Reconecte em /dashboard/integrations.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') ?? '7', 10)

    const service = new ThreadsService(account.accessToken, account.threadsUserId)

    // Executar em paralelo para velocidade
    const [profile, posts7d, posts30d] = await Promise.allSettled([
      service.getProfile(),
      service.getProfileInsights(),                             // 7d padrão
      days === 30 ? service.getProfileInsights(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      ) : null,
    ])

    const recentPosts = await service.getRecentPosts(10)

    // Buscar insights dos top 5 posts (em paralelo, ignorar erros individuais)
    const postInsights = await Promise.allSettled(
      recentPosts.slice(0, 5).map(async (p) => {
        const insights = await service.getPostInsights(p.id)
        return { ...p, insights }
      })
    )

    const postsWithInsights = postInsights
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<typeof postInsights[0] extends PromiseFulfilledResult<infer V> ? V : never>).value)

    return NextResponse.json({
      success: true,
      data: {
        profile: profile.status === 'fulfilled' ? profile.value : null,
        insights7d: posts7d.status === 'fulfilled' ? posts7d.value : null,
        insights30d: posts30d.status === 'fulfilled' ? posts30d.value : null,
        recentPosts,
        postsWithInsights,
        connectedAt: account.createdAt,
        username: account.username,
      },
    })
  } catch (error) {
    console.error('Error fetching Threads insights:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados do Threads' }, { status: 500 })
  }
}
