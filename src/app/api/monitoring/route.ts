import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { monitoring } from '@/lib/monitoring'

/**
 * GET /api/monitoring - Health check and system status
 */
export async function GET(request: NextRequest) {
  try {
    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {}
    }

    // Database check
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.services.database = {
        status: 'healthy',
        latency: 0
      }
    } catch (error) {
      checks.services.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      checks.status = 'degraded'
    }

    // Monitoring system check
    const monitoringHealth = monitoring.healthCheck()
    checks.services.monitoring = {
      status: monitoringHealth.status,
      sentry: monitoringHealth.sentry,
      database: monitoringHealth.database
    }

    // Memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage()
      checks.services.memory = {
        status: 'healthy',
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
      }
    }

    // Environment info
    checks.environment = {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || 'unknown'
    }

    return NextResponse.json({
      success: true,
      data: checks
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: error.message || 'Health check failed'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/monitoring - Log client-side errors
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, message, context } = body

    // Log the error/message
    if (level === 'error') {
      const error = new Error(message)
      monitoring.captureException(error, context)
    } else {
      monitoring.captureMessage(message, level, context)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
