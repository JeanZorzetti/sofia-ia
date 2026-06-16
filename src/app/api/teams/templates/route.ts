// src/app/api/teams/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { TEAM_TEMPLATES, summarizeTemplate } from '@/lib/orchestration/team/team-templates'

export const dynamic = 'force-dynamic'

/** GET /api/teams/templates → summaries (no system prompts) for the picker. */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ success: true, data: TEAM_TEMPLATES.map(summarizeTemplate) })
}
