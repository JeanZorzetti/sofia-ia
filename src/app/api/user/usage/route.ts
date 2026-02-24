import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getUsageSummary } from '@/lib/plan-limits'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const usage = await getUsageSummary(auth.id)
    return NextResponse.json(usage)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
