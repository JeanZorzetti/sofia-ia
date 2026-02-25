import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/integrations/totvs/configure — salva credenciais Totvs
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { apiUrl, username, password } = body

  if (!apiUrl || !username || !password) {
    return NextResponse.json(
      { error: 'apiUrl, username e password são obrigatórios' },
      { status: 400 }
    )
  }

  try {
    // Testar conexão antes de salvar
    const testResponse = await fetch(
      `${apiUrl}/FWMODEL/CUSTOMERS?$top=1&$format=json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    ).catch(() => null)

    // Upsert da integração
    const existing = await prisma.integration.findFirst({
      where: { type: 'totvs' },
    })

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          config: { apiUrl, username, password },
          status: 'active',
        },
      })
    } else {
      await prisma.integration.create({
        data: {
          name: 'Totvs Protheus',
          type: 'totvs',
          config: { apiUrl, username, password },
          status: 'active',
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração Totvs salva com sucesso',
      connectionTest: testResponse?.ok ? 'ok' : 'not_verified',
    })
  } catch (error) {
    console.error('[totvs configure]', error)
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
