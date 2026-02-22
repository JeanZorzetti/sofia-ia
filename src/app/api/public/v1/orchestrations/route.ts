/**
 * Public API — Orchestrations
 * GET  /api/public/v1/orchestrations  — list user's orchestrations
 * POST /api/public/v1/orchestrations  — execute an orchestration
 *
 * Auth: Authorization: Bearer {api_key}
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ─── Auth via API Key ──────────────────────────────────────
async function resolveApiKeyUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const key = authHeader.slice(7).trim()
  if (!key) return null

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key, status: 'active' },
    })
    if (!apiKey) return null

    // Update last used timestamp (non-blocking)
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {})

    return { userId: apiKey.userId, apiKeyId: apiKey.id }
  } catch {
    return null
  }
}

// ─── GET /api/public/v1/orchestrations ────────────────────
export async function GET(req: NextRequest) {
  const auth = await resolveApiKeyUser(req)
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Valid API key required. Use Authorization: Bearer {api_key}' },
      { status: 401 }
    )
  }

  try {
    const orchestrations = await prisma.agentOrchestration.findMany({
      where: { createdBy: auth.userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        strategy: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        agents: true,
      },
    })

    return NextResponse.json({
      data: orchestrations,
      meta: {
        total: orchestrations.length,
        apiVersion: 'v1',
      },
    })
  } catch (err) {
    console.error('[Public API] GET orchestrations error:', err)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// ─── POST /api/public/v1/orchestrations ───────────────────
export async function POST(req: NextRequest) {
  const auth = await resolveApiKeyUser(req)
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Valid API key required. Use Authorization: Bearer {api_key}' },
      { status: 401 }
    )
  }

  let body: { orchestrationId: string; input: string | Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { orchestrationId, input } = body

  if (!orchestrationId || !input) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'orchestrationId and input are required' },
      { status: 400 }
    )
  }

  // Verify orchestration belongs to this user
  let orchestration
  try {
    orchestration = await prisma.agentOrchestration.findFirst({
      where: { id: orchestrationId, createdBy: auth.userId, status: 'active' },
    })
  } catch (err) {
    console.error('[Public API] DB error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  if (!orchestration) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Orchestration not found or not accessible' },
      { status: 404 }
    )
  }

  // Create an execution record
  try {
    const inputData = typeof input === 'string' ? { prompt: input } : input
    const execution = await prisma.orchestrationExecution.create({
      data: {
        orchestrationId,
        status: 'pending',
        input: inputData as Record<string, string>,
        agentResults: [],
      },
    })

    return NextResponse.json(
      {
        data: {
          executionId: execution.id,
          orchestrationId,
          status: 'pending',
          message:
            'Execution created. Use the dashboard or poll this execution ID to check status.',
          startedAt: execution.startedAt,
        },
        meta: { apiVersion: 'v1' },
      },
      { status: 202 }
    )
  } catch (err) {
    console.error('[Public API] Create execution error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
