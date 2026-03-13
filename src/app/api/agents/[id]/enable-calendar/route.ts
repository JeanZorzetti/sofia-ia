/**
 * POST /api/agents/[id]/enable-calendar
 * Habilita Google Calendar no agente e salva o calendarUserId do usuário logado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { getOAuthConnection } from '@/lib/integrations/oauth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  // Verificar se o usuário tem Google Calendar conectado
  const conn = await getOAuthConnection(auth.id, 'google-calendar')
  if (!conn) {
    return NextResponse.json(
      { error: 'Conecte o Google Calendar primeiro em Integrações → Google Calendar' },
      { status: 400 }
    )
  }

  const agent = await prisma.agent.findUnique({ where: { id }, select: { id: true, config: true } })
  if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })

  const currentConfig = (agent.config || {}) as Record<string, unknown>

  await prisma.agent.update({
    where: { id },
    data: {
      config: {
        ...currentConfig,
        calendarEnabled: true,
        calendarUserId: auth.id,
      },
    },
  })

  return NextResponse.json({ success: true })
}
