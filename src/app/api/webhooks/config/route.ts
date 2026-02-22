/**
 * Webhook Config API
 * GET  /api/webhooks/config  — list user's webhook configs
 * POST /api/webhooks/config  — create a new webhook config
 *
 * Auth: cookie/JWT (dashboard users)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_TYPES = ['slack', 'discord', 'email', 'generic']
const ALLOWED_EVENTS = [
  'orchestration_completed',
  'orchestration_failed',
  'agent_response',
  'execution_started',
]

// ─── GET /api/webhooks/config ─────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const configs = await prisma.webhookConfig.findMany({
      where: { userId: auth.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: configs })
  } catch (err) {
    console.error('[Webhooks Config] GET error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ─── POST /api/webhooks/config ────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    name?: string
    type?: string
    url?: string
    email?: string
    events?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, type, url, email, events } = body

  // Validation
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 }
    )
  }
  if (type === 'email' && !email?.includes('@')) {
    return NextResponse.json({ error: 'valid email is required for email type' }, { status: 400 })
  }
  if (['slack', 'discord', 'generic'].includes(type) && !url?.startsWith('http')) {
    return NextResponse.json(
      { error: 'valid url is required for slack/discord/generic types' },
      { status: 400 }
    )
  }
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'events array is required' }, { status: 400 })
  }
  const invalidEvents = events.filter((e) => !ALLOWED_EVENTS.includes(e))
  if (invalidEvents.length) {
    return NextResponse.json(
      { error: `Invalid events: ${invalidEvents.join(', ')}. Allowed: ${ALLOWED_EVENTS.join(', ')}` },
      { status: 400 }
    )
  }

  // Check limit (max 20 webhooks per user)
  try {
    const count = await prisma.webhookConfig.count({ where: { userId: auth.id } })
    if (count >= 20) {
      return NextResponse.json(
        { error: 'Webhook limit reached (20 max per account)' },
        { status: 429 }
      )
    }
  } catch (err) {
    console.error('[Webhooks Config] Count error:', err)
  }

  try {
    const config = await prisma.webhookConfig.create({
      data: {
        userId: auth.id,
        name: name.trim(),
        type,
        url: url || null,
        email: email || null,
        events,
        isActive: true,
      },
    })

    return NextResponse.json({ data: config }, { status: 201 })
  } catch (err) {
    console.error('[Webhooks Config] Create error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
