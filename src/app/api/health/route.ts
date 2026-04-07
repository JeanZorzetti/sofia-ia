import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  let dbStatus = 'unknown'
  let userCount = -1
  let dbHost = 'unknown'

  try {
    // Check what DB we're connected to
    const url = process.env.DATABASE_URL || ''
    const match = url.match(/@([^/]+)\/(\w+)/)
    dbHost = match ? `${match[1]}/${match[2]}` : 'parse-failed'

    // Test actual query
    userCount = await prisma.user.count()
    dbStatus = 'ok'
  } catch (e: unknown) {
    dbStatus = `error: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    db: { status: dbStatus, userCount, host: dbHost },
  });
}
