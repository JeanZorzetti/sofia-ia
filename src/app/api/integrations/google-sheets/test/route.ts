import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { sheetsRead } from '@/lib/integrations/google-sheets'

// POST /api/integrations/google-sheets/test
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { spreadsheetId, range } = body

  if (!spreadsheetId || !range) {
    return NextResponse.json({ error: 'spreadsheetId e range são obrigatórios' }, { status: 400 })
  }

  try {
    const result = await sheetsRead(auth.id, spreadsheetId, range)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
