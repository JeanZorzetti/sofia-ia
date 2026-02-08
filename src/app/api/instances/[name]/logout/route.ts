import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { logoutInstance } from '@/lib/evolution-service'

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

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Instance name is required' },
        { status: 400 }
      )
    }

    const result = await logoutInstance(name)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to logout instance' },
      { status: 500 }
    )
  }
}
