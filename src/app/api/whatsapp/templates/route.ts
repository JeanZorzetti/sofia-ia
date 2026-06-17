import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { resolveAccountByUser } from '@/lib/whatsapp-cloud-service'
import { listTemplates } from '@/lib/whatsapp-templates'

/**
 * GET /api/whatsapp/templates[?phoneNumberId=...]
 * Lista os templates HSM da WABA do usuário (nome, status, idioma, categoria).
 */
export async function GET(request: NextRequest) {
  const user = await getAuthFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const phoneNumberId = request.nextUrl.searchParams.get('phoneNumberId') || undefined
  const account = await resolveAccountByUser(user.id, phoneNumberId)
  if (!account) {
    return NextResponse.json({ success: true, data: [] })
  }

  const templates = await listTemplates(account)
  return NextResponse.json({ success: true, data: templates })
}
