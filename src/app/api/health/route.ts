import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/evolution-service';

export async function GET() {
  try {
    // Get Evolution API health status
    const evolutionHealth = await healthCheck();

    // Return health status
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Sofia IA',
      version: '3.0.0',
      evolution_api: evolutionHealth
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'Sofia IA',
        version: '3.0.0',
        evolution_api: {
          success: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 503 }
    );
  }
}
