/**
 * Webhook receiver — Sirius CRM events.
 *
 * Receives events from the Sirius CRM webhook dispatcher
 * (contact.created, deal.stage_changed, deal.idle, whatsapp.message.in, note.created)
 * and routes them to the appropriate Sofia agents for processing.
 *
 * Auth: HMAC-SHA256 signature in `x-sirius-signature` header.
 * Event type: `x-sirius-event` header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { siriusTools } from '@/lib/tools/sirius-tools'

// ── Signature verification ───────────────────────────────────────────────────

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.SIRIUS_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Webhook:Sirius] SIRIUS_WEBHOOK_SECRET not set')
    return false
  }

  const expected = createHmac('sha256', secret).update(body).digest('hex')

  // Length check before timingSafeEqual to avoid the "buffers must be the same length" error
  if (signature.length !== expected.length) return false

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

// ── Event → Agent routing ────────────────────────────────────────────────────

const EVENT_ROUTING: Record<string, string[]> = {
  'contact.created':     ['ContactEnricher', 'LeadQualifier'],
  'whatsapp.message.in': ['LeadQualifier', 'DealStageAnalyzer'],
  'deal.created':        ['DealStageAnalyzer'],
  'deal.stage_changed':  ['DealStageAnalyzer'],
  'deal.idle':           ['FollowUpCoordinator'],
  'note.created':        ['DealStageAnalyzer'],
}

// ── Agent dispatcher ─────────────────────────────────────────────────────────

interface SiriusEvent {
  event: string
  organizationId: string
  payload: Record<string, unknown>
  timestamp: string
}

async function dispatchToAgent(
  agentName: string,
  eventData: SiriusEvent
): Promise<void> {
  try {
    // Find the agent by name (agents are created via seed script or dashboard)
    const agent = await prisma.agent.findFirst({
      where: {
        name: agentName,
        status: 'active',
      },
      select: { id: true, name: true },
    })

    if (!agent) {
      console.warn(`[Webhook:Sirius] Agent "${agentName}" not found or inactive — skipping`)
      return
    }

    // Build a context-rich prompt for the agent based on the event type
    const prompt = buildAgentPrompt(agentName, eventData)

    // Call the agent via internal API
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${appUrl}/api/agents/${agent.id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        context: {
          source: 'sirius_webhook',
          event: eventData.event,
          organizationId: eventData.organizationId,
          payload: eventData.payload,
        },
      }),
      signal: AbortSignal.timeout(60_000), // Agents may take time to think
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error(
        `[Webhook:Sirius] Agent "${agentName}" responded with ${response.status}: ${text.slice(0, 200)}`
      )
      return
    }

    console.log(`[Webhook:Sirius] Agent "${agentName}" processed event "${eventData.event}" successfully`)
  } catch (err) {
    console.error(`[Webhook:Sirius] Error dispatching to agent "${agentName}":`, err)
  }
}

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildAgentPrompt(agentName: string, event: SiriusEvent): string {
  const { payload } = event
  const entityId = (payload.id || payload.entityId || payload.dealId || payload.contactId || '') as string

  switch (event.event) {
    case 'contact.created':
      return `Novo contato criado no Sirius CRM.
Dados do contato: ${JSON.stringify(payload, null, 2)}

Suas tarefas:
${agentName === 'ContactEnricher'
  ? '1. Use sirius_get_contact_context para buscar o contexto completo.\n2. Analise os dados disponíveis e enriqueça o perfil.\n3. Registre suas descobertas com sirius_add_deal_note (se houver deal) ou sirius_log_action.'
  : '1. Use sirius_get_contact_context para buscar o contexto completo.\n2. Inicie qualificação BANT/SPIN com base nos dados disponíveis.\n3. Se houver deal, avalie o score e mova o estágio se apropriado.\n4. Registre sua análise com sirius_log_action.'
}`

    case 'whatsapp.message.in':
      return `Nova mensagem WhatsApp recebida no Sirius CRM.
Dados: ${JSON.stringify(payload, null, 2)}

Suas tarefas:
${agentName === 'LeadQualifier'
  ? '1. Analise o conteúdo da mensagem para sinais de interesse/intenção de compra.\n2. Use sirius_get_contact_context para contexto do contato.\n3. Avalie BANT (Budget, Authority, Need, Timeline) com base na conversa.\n4. Se score >= 75, considere mover o deal para "Qualified" com sirius_update_deal_stage.\n5. Se score < 75, sugira uma mensagem de nurture.\n6. Registre sua análise com sirius_log_action (confidence baseada na quantidade de dados disponíveis).'
  : '1. Analise a mensagem para detectar mudanças de intenção (interesse, objeção, urgência).\n2. Use sirius_get_deal_context para contexto completo do deal.\n3. Se detectar mudança significativa, mova o estágio com sirius_update_deal_stage.\n4. Registre sua análise com sirius_log_action.'
}`

    case 'deal.created':
      return `Novo deal criado no Sirius CRM.
Dados do deal: ${JSON.stringify(payload, null, 2)}

Suas tarefas:
1. Use sirius_get_deal_context para buscar o contexto completo (pipeline, contato, notas).
2. Analise o estágio atual e dados do contato.
3. Sugira próximos passos com base no perfil do lead.
4. Registre sua análise inicial com sirius_log_action.`

    case 'deal.stage_changed':
      return `Deal mudou de estágio no Sirius CRM.
Dados: ${JSON.stringify(payload, null, 2)}

Suas tarefas:
1. Use sirius_get_deal_context para contexto completo.
2. Avalie se a mudança de estágio é coerente com o histórico do deal.
3. Identifique ações necessárias no novo estágio (follow-up, reunião, proposta).
4. Registre sua análise com sirius_log_action.`

    case 'deal.idle':
      return `Deal está parado há mais de 7 dias no Sirius CRM.
Dados: ${JSON.stringify(payload, null, 2)}

Suas tarefas:
1. Use sirius_get_deal_context para entender o contexto e histórico completo.
2. Analise a última interação e identifique o motivo da inatividade.
3. Gere uma mensagem de follow-up personalizada e contextual.
4. Use sirius_send_whatsapp para enviar a mensagem (se WhatsApp disponível).
5. Registre com sirius_log_action (confidence baseada na qualidade do contexto).`

    case 'note.created':
      return `Nova nota criada em um deal no Sirius CRM.
Dados: ${JSON.stringify(payload, null, 2)}

Suas tarefas:
1. Use sirius_get_deal_context para contexto completo.
2. Analise a nota e o histórico de conversas para detectar intenção do prospect.
3. Se detectar mudança de sentimento ou intenção, considere mover o estágio.
4. Registre sua análise com sirius_log_action.`

    default:
      return `Evento "${event.event}" recebido do Sirius CRM.
Dados: ${JSON.stringify(payload, null, 2)}

Analise o evento e tome as ações apropriadas. Registre com sirius_log_action.`
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.text()

  // Verify HMAC signature
  const signature = request.headers.get('x-sirius-signature')
  if (!signature || !verifySignature(body, signature)) {
    console.warn('[Webhook:Sirius] Invalid or missing signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = request.headers.get('x-sirius-event')
  if (!event) {
    return NextResponse.json({ error: 'Missing x-sirius-event header' }, { status: 400 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const organizationId = (payload.organizationId || '') as string

  console.log(
    `[Webhook:Sirius] Received event="${event}" org="${organizationId}" keys=${Object.keys(payload).join(',')}`
  )

  // Route to agents — fire and forget (don't block the 200 response)
  const agentNames = EVENT_ROUTING[event] || []

  if (agentNames.length === 0) {
    console.warn(`[Webhook:Sirius] No agents mapped for event "${event}"`)
  } else {
    const eventData: SiriusEvent = {
      event,
      organizationId,
      payload: payload.payload as Record<string, unknown> || payload,
      timestamp: (payload.timestamp || new Date().toISOString()) as string,
    }

    // Dispatch to all mapped agents in parallel (non-blocking)
    Promise.allSettled(
      agentNames.map((name) => dispatchToAgent(name, eventData))
    ).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        console.error(
          `[Webhook:Sirius] ${failed.length}/${agentNames.length} agent dispatches failed for event "${event}"`
        )
      }
    })
  }

  // Return 200 immediately
  return NextResponse.json({
    success: true,
    event,
    agents: agentNames,
    message: `Event routed to ${agentNames.length} agent(s)`,
  })
}

// Health check / debug endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'sirius-webhook-receiver',
    events: Object.keys(EVENT_ROUTING),
    timestamp: new Date().toISOString(),
  })
}
