import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ success: true, data: auth })
}
