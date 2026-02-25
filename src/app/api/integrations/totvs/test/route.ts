import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { totvsGetCustomer } from '@/lib/integrations/totvs'

// POST /api/integrations/totvs/test
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { code } = body

  if (!code) {
    return NextResponse.json({ error: 'code é obrigatório' }, { status: 400 })
  }

  try {
    const result = await totvsGetCustomer(auth.id, code)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
