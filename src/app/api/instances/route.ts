import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { fetchInstances, createInstance } from '@/lib/evolution-service'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const user = await getAuthFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const result = await fetchInstances()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch instances' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitResult = rateLimit(`instance_create_${ip}`, RATE_LIMITS.instanceCreation.max, RATE_LIMITS.instanceCreation.window)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { instanceName, settings } = body

    if (!instanceName) {
      return NextResponse.json(
        { success: false, error: 'Instance name is required' },
        { status: 400 }
      )
    }

    const result = await createInstance(instanceName, settings)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create instance' },
      { status: 500 }
    )
  }
}
