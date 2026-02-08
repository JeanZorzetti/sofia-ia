import { NextRequest, NextResponse } from 'next/server';
import { processWebhook } from '@/lib/evolution-service';

export async function POST(request: NextRequest) {
  try {
    // Parse webhook body
    const body = await request.json();

    // Process webhook asynchronously (don't block response)
    processWebhook(body).catch((error) => {
      console.error('Error processing webhook:', error);
    });

    // Return 200 immediately
    return NextResponse.json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    console.error('Error receiving webhook:', error);

    // Still return 200 to avoid Evolution API retries
    return NextResponse.json({
      success: true,
      message: 'Webhook received'
    });
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}/api/webhook/evolution`;

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    webhook_url: webhookUrl
  });
}
