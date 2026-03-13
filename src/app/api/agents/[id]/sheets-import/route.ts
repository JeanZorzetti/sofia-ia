/**
 * POST /api/agents/[id]/sheets-import
 * Configura ou desabilita a importação de leads via Google Sheets para um agente.
 *
 * Body (habilitar):
 *   { spreadsheetId: string, sheetName?: string }
 *
 * Body (desabilitar):
 *   { enabled: false }
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
  const body = await request.json()
  const { spreadsheetId, sheetName, enabled } = body as {
    spreadsheetId?: string
    sheetName?: string
    enabled?: boolean
  }

  const agent = await prisma.agent.findUnique({ where: { id }, select: { id: true, config: true } })
  if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })

  const currentConfig = (agent.config || {}) as Record<string, unknown>

  // Desabilitar
  if (enabled === false) {
    await prisma.agent.update({
      where: { id },
      data: {
        config: {
          ...currentConfig,
          sheetsImportEnabled: false,
          sheetsImportSpreadsheetId: null,
          sheetsImportSheetName: null,
          sheetsImportUserId: null,
        },
      },
    })
    return NextResponse.json({ success: true, enabled: false })
  }

  // Verificar Google Sheets conectado
  const conn = await getOAuthConnection(auth.id, 'google-sheets')
  if (!conn) {
    return NextResponse.json(
      { error: 'Conecte o Google Sheets primeiro em Integrações → Google Sheets' },
      { status: 400 }
    )
  }

  if (!spreadsheetId) {
    return NextResponse.json({ error: 'spreadsheetId é obrigatório' }, { status: 400 })
  }

  await prisma.agent.update({
    where: { id },
    data: {
      config: {
        ...currentConfig,
        sheetsImportEnabled: true,
        sheetsImportSpreadsheetId: spreadsheetId,
        sheetsImportSheetName: sheetName || 'Sheet1',
        sheetsImportUserId: auth.id,
      },
    },
  })

  return NextResponse.json({ success: true, enabled: true })
}
