import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { notionQueryDatabase } from '@/lib/integrations/notion'

// POST /api/integrations/notion/test
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { databaseId } = body

  if (!databaseId) {
    return NextResponse.json({ error: 'databaseId é obrigatório' }, { status: 400 })
  }

  try {
    const result = await notionQueryDatabase(auth.id, databaseId)
    return NextResponse.json({
      success: true,
      totalResults: result.results.length,
      hasMore: result.hasMore,
      preview: result.results.slice(0, 3),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
