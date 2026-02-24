import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/agents/[id]/memory
 * Lista entradas de memória de um agente para o usuário autenticado.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const memories = await prisma.agentMemory.findMany({
      where: { agentId: id, userId: auth.id },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: memories })
  } catch (error: any) {
    console.error('[agents/memory] GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/dashboard/agents/[id]/memory
 * Cria ou atualiza uma entrada de memória (upsert por key).
 * Body: { key: string, value: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'key e value são obrigatórios' }, { status: 400 })
    }

    const memory = await prisma.agentMemory.upsert({
      where: { agentId_userId_key: { agentId: id, userId: auth.id, key } },
      update: { value: String(value) },
      create: { agentId: id, userId: auth.id, key, value: String(value) },
    })

    return NextResponse.json({ success: true, data: memory }, { status: 201 })
  } catch (error: any) {
    console.error('[agents/memory] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/dashboard/agents/[id]/memory
 * Remove uma entrada específica por key, ou limpa toda a memória.
 * Query: ?key=xxx (opcional; se omitido, remove todas)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  try {
    if (key) {
      await prisma.agentMemory.deleteMany({
        where: { agentId: id, userId: auth.id, key },
      })
    } else {
      await prisma.agentMemory.deleteMany({
        where: { agentId: id, userId: auth.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[agents/memory] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
