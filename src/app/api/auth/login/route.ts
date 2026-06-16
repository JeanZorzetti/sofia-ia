import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, setAuthCookie } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { parseJson, loginSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Apply rate limiting
    const rateLimitResult = rateLimit(`auth_${ip}`, RATE_LIMITS.auth.max, RATE_LIMITS.auth.window);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          resetAt: rateLimitResult.resetAt
        },
        { status: 429 }
      );
    }

    // Parse + validate request body (zod)
    const parsed = await parseJson(req, loginSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 }
      );
    }
    const { username, password } = parsed.data;

    // Authenticate user
    const result = await authenticateUser(username, password);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Set auth cookie
    await setAuthCookie(result.token);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role
        },
        expires_in: '24h'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
