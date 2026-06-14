// src/app/api/models/test/route.ts
// On-demand live availability check for a single model (the "testar" button).
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { providerOf, type AvailabilityStatus } from '@/lib/ai/model-availability'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const modelId = (body?.modelId as string | undefined)?.trim()
    if (!modelId) return NextResponse.json({ success: false, error: 'modelId é obrigatório' }, { status: 400 })

    const family = providerOf(modelId)
    const started = Date.now()
    let status: AvailabilityStatus = 'unknown'
    let reason = ''

    try {
      if (family === 'groq') {
        const { getGroqClient } = await import('@/lib/ai/groq')
        await getGroqClient().chat.completions.create({
          model: modelId, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1,
        })
        status = 'available'; reason = 'Respondeu ao ping'
      } else if (family === 'openrouter') {
        const { getOpenRouterClient } = await import('@/lib/ai/openrouter')
        await getOpenRouterClient().chat.completions.create({
          model: modelId, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1,
        })
        status = 'available'; reason = 'Respondeu ao ping'
      } else {
        // CLI-backed providers depend on the binary on the host — don't spawn it
        // here (would risk hanging the request); report as unverifiable by API.
        status = 'unknown'
        reason = 'Provider via CLI — depende do host, não testável por API'
      }
    } catch (err) {
      status = 'unavailable'
      reason = err instanceof Error ? err.message.slice(0, 200) : 'Falha na chamada'
    }

    return NextResponse.json({ success: true, data: { modelId, status, reason, latencyMs: Date.now() - started } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha ao testar modelo'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
