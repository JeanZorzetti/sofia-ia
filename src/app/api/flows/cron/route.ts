// ─────────────────────────────────────────────────────────
// /api/flows/cron — Cron trigger endpoint
// ─────────────────────────────────────────────────────────
//
// This endpoint is called by a cron scheduler (Vercel Cron, Upstash,
// or any external scheduler) to execute flows with cron triggers.
//
// Security: Uses a CRON_SECRET header to prevent unauthorized access.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executeFlow } from '@/lib/flow-engine'

// Simple cron expression matcher for common patterns
function cronMatchesNow(expression: string): boolean {
    if (!expression) return false

    const now = new Date()
    const minute = now.getMinutes()
    const hour = now.getHours()
    const dayOfMonth = now.getDate()
    const month = now.getMonth() + 1
    const dayOfWeek = now.getDay() // 0=Sunday

    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) return false

    const [cronMin, cronHour, cronDom, cronMonth, cronDow] = parts

    return (
        matchField(cronMin, minute) &&
        matchField(cronHour, hour) &&
        matchField(cronDom, dayOfMonth) &&
        matchField(cronMonth, month) &&
        matchField(cronDow, dayOfWeek)
    )
}

function matchField(field: string, value: number): boolean {
    if (field === '*') return true

    // Handle */N (every N)
    if (field.startsWith('*/')) {
        const interval = parseInt(field.slice(2))
        return interval > 0 && value % interval === 0
    }

    // Handle comma-separated values
    if (field.includes(',')) {
        return field.split(',').some(v => parseInt(v) === value)
    }

    // Handle ranges (e.g. 1-5)
    if (field.includes('-')) {
        const [min, max] = field.split('-').map(Number)
        return value >= min && value <= max
    }

    // Exact match
    return parseInt(field) === value
}

// POST /api/flows/cron — Trigger cron-based flows
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const cronSecret = process.env.CRON_SECRET
        if (cronSecret) {
            const authHeader = request.headers.get('authorization')
            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
            }
        }

        // Find all active flows with cron trigger
        const cronFlows = await prisma.flow.findMany({
            where: {
                triggerType: 'cron',
                status: 'active',
                cronExpression: { not: null },
            },
            select: {
                id: true,
                name: true,
                cronExpression: true,
            },
        })

        if (cronFlows.length === 0) {
            return NextResponse.json({
                data: { triggered: 0, flows: [] },
                error: null,
            })
        }

        // Check which flows match the current time
        const matchingFlows = cronFlows.filter((f: typeof cronFlows[number]) =>
            f.cronExpression && cronMatchesNow(f.cronExpression)
        )

        // Fire-and-forget executions for matching flows
        const results: { flowId: string; name: string; status: string }[] = []

        for (const flow of matchingFlows) {
            try {
                // Don't await — fire and forget
                executeFlow(flow.id, { mode: 'cron' }).catch(err => {
                    console.error(`[Cron] Flow ${flow.id} (${flow.name}) failed:`, err.message)
                })
                results.push({ flowId: flow.id, name: flow.name, status: 'triggered' })
            } catch (err: any) {
                results.push({ flowId: flow.id, name: flow.name, status: `error: ${err.message}` })
            }
        }

        console.log(`[Cron] Triggered ${results.length}/${cronFlows.length} cron flows`)

        return NextResponse.json({
            data: {
                triggered: results.length,
                totalCronFlows: cronFlows.length,
                flows: results,
            },
            error: null,
        })
    } catch (error: any) {
        console.error('[Cron] Error:', error)
        return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }
}

// Also support GET for Vercel Cron (which uses GET by default)
export async function GET(request: NextRequest) {
    return POST(request)
}
