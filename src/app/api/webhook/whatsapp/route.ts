import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { processCloudWebhook } from '@/lib/whatsapp-cloud-service'

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'prolife-webhook-2026'
const APP_SECRET = process.env.META_APP_SECRET || ''

/**
 * Valida a assinatura X-Hub-Signature-256 do corpo cru contra o META_APP_SECRET.
 * Se o segredo não estiver configurado, não bloqueia (loga aviso) — para não
 * derrubar o webhook durante a migração. Quando configurado, assinatura inválida
 * é rejeitada.
 */
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET) {
    console.warn('[WA Webhook] META_APP_SECRET ausente — pulando verificação de assinatura')
    return true
  }
  if (!signatureHeader?.startsWith('sha256=')) return false

  const expected = 'sha256=' + createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')
  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * GET — Verificação de webhook pela Meta (obrigatório antes de receber mensagens)
 *
 * A Meta bate neste endpoint com:
 *   ?hub.mode=subscribe
 *   &hub.verify_token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN>
 *   &hub.challenge=<algum_número>
 *
 * Resposta correta: retornar hub.challenge em plain text com status 200.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)

    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('[WA Webhook] GET verify — mode:', mode, '| token_match:', token === VERIFY_TOKEN)

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[WA Webhook] ✅ Webhook verificado com sucesso pela Meta')
        return new NextResponse(challenge, { status: 200 })
    }

    console.warn('[WA Webhook] ❌ Token de verificação inválido')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * POST — Recebe eventos da Meta (mensagens, status, etc.)
 *
 * Responde 200 imediatamente e processa em background.
 * A Meta considera o endpoint inativo se não receber 200 em menos de 20s.
 */
export async function POST(request: NextRequest) {
    // Ler o corpo CRU primeiro: a assinatura HMAC é calculada sobre os bytes exatos.
    const rawBody = await request.text()

    if (!verifySignature(rawBody, request.headers.get('x-hub-signature-256'))) {
        console.warn('[WA Webhook] ❌ Assinatura X-Hub-Signature-256 inválida')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let body: unknown
    try {
        body = JSON.parse(rawBody)
    } catch {
        // Corpo inválido — ainda retorna 200 para evitar retries da Meta
        return NextResponse.json({ success: true })
    }

    const payload = body as Record<string, unknown>

    console.log(
        '[WA Webhook] POST recebido — object:',
        payload.object,
        '| entries:',
        Array.isArray(payload.entry) ? payload.entry.length : 0
    )

    // Processar assincronamente (não bloqueia o 200)
    processCloudWebhook(body).catch((error) => {
        console.error('[WA Webhook] Erro ao processar webhook:', error)
    })

    // Retornar 200 imediatamente (obrigatório < 20s)
    return NextResponse.json({ success: true })
}
