import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Get current user from request
    const user = await getAuthFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sign new token with updated expiration
    const newToken = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Set new auth cookie
    await setAuthCookie(newToken);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        token: newToken,
        expires_in: '24h'
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
