import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/integrations/totvs/status
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const integration = await prisma.integration.findFirst({
    where: { type: 'totvs', status: 'active' },
  }).catch(() => null)

  if (!integration) {
    return NextResponse.json({ connected: false })
  }

  const cfg = (integration.config as Record<string, string>) || {}
  return NextResponse.json({
    connected: !!(cfg.apiUrl && cfg.username),
    apiUrl: cfg.apiUrl || null,
    username: cfg.username || null,
  })
}
