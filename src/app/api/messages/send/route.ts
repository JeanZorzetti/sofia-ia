import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { sendMessage } from '@/lib/evolution-service';

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitKey = `msg_${user.id}`;
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const { instanceName, number, text } = body;

    // Validation
    if (!instanceName || typeof instanceName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'instanceName is required and must be a string' },
        { status: 400 }
      );
    }

    if (!number || typeof number !== 'string') {
      return NextResponse.json(
        { success: false, error: 'number is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate number (10-15 digits)
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      return NextResponse.json(
        { success: false, error: 'number must contain 10-15 digits' },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'text is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate text length (1-4000 chars)
    if (text.length < 1 || text.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'text must be between 1 and 4000 characters' },
        { status: 400 }
      );
    }

    // Send message
    const result = await sendMessage(instanceName, number, text);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
