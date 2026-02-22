/**
 * Public API — Agents
 * GET /api/public/v1/agents  — list user's active agents
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

// ─── GET /api/public/v1/agents ────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await resolveApiKeyUser(req)
  if (!auth) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Valid API key required. Use Authorization: Bearer {api_key}',
      },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  try {
    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where: { createdBy: auth.userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          model: true,
          temperature: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.agent.count({
        where: { createdBy: auth.userId, status: 'active' },
      }),
    ])

    return NextResponse.json({
      data: agents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        apiVersion: 'v1',
      },
    })
  } catch (err) {
    console.error('[Public API] GET agents error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
