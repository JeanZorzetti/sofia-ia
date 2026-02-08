import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { setPresence } from '@/lib/evolution-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const user = await getAuthFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { name } = await params
    const body = await request.json()
    const { presence } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Instance name is required' },
        { status: 400 }
      )
    }

    if (!presence) {
      return NextResponse.json(
        { success: false, error: 'Presence is required' },
        { status: 400 }
      )
    }

    const result = await setPresence(name, presence)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to set presence' },
      { status: 500 }
    )
  }
}
