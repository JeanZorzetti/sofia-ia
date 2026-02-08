import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getQRCode } from '@/lib/evolution-service'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function GET(
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

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitResult = rateLimit(`qr_${ip}`, RATE_LIMITS.qrCode.max, RATE_LIMITS.qrCode.window)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const { name } = await params
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true'

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Instance name is required' },
        { status: 400 }
      )
    }

    const result = await getQRCode(name, refresh)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get QR code' },
      { status: 500 }
    )
  }
}
