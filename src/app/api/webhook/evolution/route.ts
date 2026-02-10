import { NextRequest, NextResponse } from 'next/server';
import { processWebhook } from '@/lib/evolution-service';

// Temporary debug: store last 5 webhook payloads in memory
const debugPayloads: { timestamp: string; event: string; instance: string; keys: string[] }[] = [];

export async function POST(request: NextRequest) {
  try {
    // Parse webhook body
    const body = await request.json();

    // Debug: store payload summary (remove after debugging)
    debugPayloads.unshift({
      timestamp: new Date().toISOString(),
      event: body.event || 'NO_EVENT',
      instance: body.instance || 'NO_INSTANCE',
      keys: Object.keys(body),
    });
    if (debugPayloads.length > 5) debugPayloads.pop();
    console.log('[WEBHOOK] Received:', body.event, '| Instance:', body.instance, '| Keys:', Object.keys(body).join(','));

    // Process webhook asynchronously (don't block response)
    processWebhook(body).catch((error) => {
      console.error('[WEBHOOK] Error processing:', error);
    });

    // Return 200 immediately
    return NextResponse.json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    console.error('[WEBHOOK] Error receiving:', error);

    // Still return 200 to avoid Evolution API retries
    return NextResponse.json({
      success: true,
      message: 'Webhook received'
    });
  }
}

export async function GET(request: NextRequest) {
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}/api/webhook/evolution`;

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    webhook_url: webhookUrl,
    recent_webhooks: debugPayloads,
  });
}
