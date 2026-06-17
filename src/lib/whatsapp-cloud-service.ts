/**
 * whatsapp-cloud-service.ts
 *
 * Serviço da WhatsApp Business Cloud API oficial (Meta) — MULTI-TENANT.
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Cada número conectado vive em `WhatsAppAccount` (credenciais por tenant). O webhook
 * da Meta entrega `metadata.phone_number_id`; `resolveAccount` carrega a conta certa e
 * descriptografa o access token (AES-256-GCM, src/lib/crypto.ts). Todas as chamadas à
 * Graph API são parametrizadas pela conta — não há mais leitura de número único do env.
 *
 * Paridade de features portada do antigo Evolution service:
 *   - buffer de debounce (agrupa mensagens rápidas em 1 resposta) — src/lib/message-buffer.ts
 *   - transcrição de áudio (Groq Whisper) e descrição de imagem (OpenAI Vision)
 *   - treinamento via WhatsApp (prefixo "TreinoIA1212:")
 *   - keywords de pausa/reativação da IA
 *   - pós-formatação da resposta (src/lib/ai/whatsapp-formatter.ts)
 */

import { prisma } from '@/lib/prisma'
import { getGroqClient } from '@/lib/ai/groq'
import { decrypt } from '@/lib/crypto'
import { pushToBuffer, type BufferedMessage } from '@/lib/message-buffer'
import { formatWhatsAppResponse, isReactivationKeyword, isPauseKeyword } from '@/lib/ai/whatsapp-formatter'
import { processDocumentVectorization } from '@/lib/ai/knowledge-context'

// ── Config ──────────────────────────────────────────────────────────────────

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`
const TRAINING_PREFIX = 'TreinoIA1212:'

/** Conta WABA resolvida (token já descriptografado, pronto para uso). */
export interface WabaAccount {
  id: string
  userId: string
  agentId: string | null
  wabaId: string
  phoneNumberId: string
  accessToken: string
}

function authHeaders(account: WabaAccount): HeadersInit {
  return {
    Authorization: `Bearer ${account.accessToken}`,
    'Content-Type': 'application/json',
  }
}

// ── Resolução de conta (roteamento por phone_number_id) ───────────────────────

/**
 * Carrega a conta WABA dona de um phone_number_id e descriptografa o token.
 * Retorna null se não houver conta registrada para o número.
 */
export async function resolveAccount(phoneNumberId: string): Promise<WabaAccount | null> {
  const row = await prisma.whatsAppAccount.findUnique({ where: { phoneNumberId } })
  if (!row) {
    console.warn(`[WA Cloud] Nenhuma WhatsAppAccount para phone_number_id=${phoneNumberId}`)
    return null
  }

  let accessToken: string
  try {
    accessToken = decrypt(row.accessToken)
  } catch (err) {
    console.error(`[WA Cloud] Falha ao descriptografar token da conta ${row.id}:`, err)
    return null
  }

  return {
    id: row.id,
    userId: row.userId,
    agentId: row.agentId,
    wabaId: row.wabaId,
    phoneNumberId: row.phoneNumberId,
    accessToken,
  }
}

// ── Send Message ─────────────────────────────────────────────────────────────

/**
 * Envia mensagem de texto via WhatsApp Cloud API.
 * @param to  Número no formato internacional sem + (ex: 5562999998888)
 */
export async function sendWhatsAppMessage(
  account: WabaAccount,
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/${account.phoneNumberId}/messages`, {
      method: 'POST',
      headers: authHeaders(account),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[WA Cloud] Erro ao enviar:', res.status, JSON.stringify(err))
      return { success: false, error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    const messageId = data.messages?.[0]?.id
    console.log(`[WA Cloud] Mensagem enviada para ${to}:`, messageId)
    return { success: true, messageId }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[WA Cloud] Falha ao enviar mensagem:', msg)
    return { success: false, error: msg }
  }
}

// ── Mark Message as Read ─────────────────────────────────────────────────────

export async function markMessageRead(account: WabaAccount, messageId: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/${account.phoneNumberId}/messages`, {
      method: 'POST',
      headers: authHeaders(account),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  } catch {
    // Non-critical, ignore
  }
}

// ── Download Media ────────────────────────────────────────────────────────────

/**
 * Baixa uma mídia (áudio/imagem) pelo media_id retornado pelo webhook.
 * 1. GET /{media_id}  → obtém a URL temporária
 * 2. GET {url}        → baixa o buffer
 */
async function downloadWhatsAppMedia(
  account: WabaAccount,
  mediaId: string
): Promise<{ buffer: Buffer; mimetype: string } | null> {
  try {
    const metaRes = await fetch(`${BASE_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    })
    if (!metaRes.ok) {
      console.error(`[WA Cloud] Falha ao obter URL da mídia ${mediaId}: ${metaRes.status}`)
      return null
    }
    const { url, mime_type } = await metaRes.json()

    const mediaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    })
    if (!mediaRes.ok) {
      console.error(`[WA Cloud] Falha ao baixar mídia: ${mediaRes.status}`)
      return null
    }

    const arrayBuffer = await mediaRes.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), mimetype: mime_type || 'application/octet-stream' }
  } catch (error) {
    console.error('[WA Cloud] Erro ao baixar mídia:', error)
    return null
  }
}

// ── Transcribe Audio (Groq Whisper) ─────────────────────────────────────────

async function transcribeAudio(buffer: Buffer, mimetype: string): Promise<string | null> {
  try {
    const ext = mimetype.includes('ogg') ? 'ogg' : mimetype.includes('mp4') ? 'mp4' : 'mp3'
    const audioFile = new File([buffer as unknown as BlobPart], `audio.${ext}`, { type: mimetype })

    console.log(`[Whisper] Transcrevendo ${buffer.length} bytes (${ext})...`)

    const transcription = await getGroqClient().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      language: 'pt',
      response_format: 'text',
    })

    const text =
      typeof transcription === 'string'
        ? transcription
        : (transcription as { text?: string }).text || ''
    console.log(`[Whisper] Transcrito: "${text.slice(0, 100)}"`)
    return text
  } catch (error) {
    console.error('[Whisper] Erro na transcrição:', error)
    return null
  }
}

// ── Describe Image (OpenAI Vision) ────────────────────────────────────────────

async function describeImage(
  account: WabaAccount,
  mediaId: string,
  caption?: string
): Promise<string | null> {
  try {
    const media = await downloadWhatsAppMedia(account, mediaId)
    if (!media) return caption ? `[Imagem com legenda: "${caption}"]` : null

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return caption ? `[Imagem com legenda: "${caption}"]` : null
    }

    const base64 = media.buffer.toString('base64')
    const prompt = caption
      ? `Descreva esta imagem brevemente. A legenda do usuário é: "${caption}"`
      : 'Descreva esta imagem brevemente em português. Seja direto e objetivo.'

    const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:${media.mimetype};base64,${base64}`, detail: 'low' },
              },
            ],
          },
        ],
      }),
    })

    if (!visionRes.ok) return caption || null
    const visionData = (await visionRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const description = visionData.choices?.[0]?.message?.content || null
    return description ? `[Imagem: ${description}]` : null
  } catch (error) {
    console.error('[Vision] Erro ao descrever imagem:', error)
    return null
  }
}

// ── Process Webhook ───────────────────────────────────────────────────────────

/**
 * Processa o payload oficial da Meta Cloud API. Roteia cada `change` pela conta
 * dona do `metadata.phone_number_id`.
 */
export async function processCloudWebhook(body: unknown): Promise<void> {
  const payload = body as Record<string, unknown>

  if (payload.object !== 'whatsapp_business_account') {
    console.log('[WA Cloud] Evento ignorado (não é whatsapp_business_account):', payload.object)
    return
  }

  const entries = (payload.entry as Array<Record<string, unknown>>) || []

  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) || []

    for (const change of changes) {
      if (change.field !== 'messages') continue

      const value = change.value as Record<string, unknown>
      const metadata = (value.metadata as Record<string, unknown>) || {}
      const phoneNumberId = metadata.phone_number_id as string | undefined
      if (!phoneNumberId) {
        console.warn('[WA Cloud] change sem phone_number_id, ignorando')
        continue
      }

      const account = await resolveAccount(phoneNumberId)
      if (!account) continue // sem conta registrada → ignora

      const messages = (value.messages as Array<Record<string, unknown>>) || []
      const contacts = (value.contacts as Array<Record<string, unknown>>) || []

      for (const message of messages) {
        await handleIncomingMessage(account, message, contacts)
      }
    }
  }
}

// ── Handle Individual Message (extração + keywords + buffer) ──────────────────

async function handleIncomingMessage(
  account: WabaAccount,
  message: Record<string, unknown>,
  contacts: Array<Record<string, unknown>>
): Promise<void> {
  const messageId = message.id as string
  const from = message.from as string // número do remetente (ex: 5562999998888)
  const messageType = message.type as string

  if (!from || !messageId) return

  // Marcar como lida (feedback visual no WhatsApp do cliente)
  markMessageRead(account, messageId).catch(() => {})

  const contact = contacts.find((c) => (c.wa_id as string) === from)
  const contactName = ((contact?.profile as Record<string, unknown>)?.name as string) || from

  // ── Extrair conteúdo conforme o tipo ──────────────────────────────────────
  let text = ''
  let bufferedType: BufferedMessage['messageType'] = 'text'

  if (messageType === 'text') {
    text = ((message.text as Record<string, unknown>)?.body as string) || ''
  } else if (messageType === 'audio' || messageType === 'voice') {
    bufferedType = 'audio'
    const audioObj = message.audio as Record<string, unknown> | undefined
    const mediaId = audioObj?.id as string | undefined
    console.log(`[WA Cloud] Áudio de ${from} (media_id: ${mediaId})`)
    if (mediaId) {
      const media = await downloadWhatsAppMedia(account, mediaId)
      if (media) {
        const transcribed = await transcribeAudio(media.buffer, media.mimetype)
        text = transcribed || '[Áudio recebido. Por favor, escreva sua mensagem em texto.]'
      }
    }
  } else if (messageType === 'image') {
    bufferedType = 'image'
    const imageObj = message.image as Record<string, unknown> | undefined
    const mediaId = imageObj?.id as string | undefined
    const caption = imageObj?.caption as string | undefined
    console.log(`[WA Cloud] Imagem de ${from} (media_id: ${mediaId})`)
    if (mediaId) {
      const described = await describeImage(account, mediaId, caption)
      text = described || '[Imagem recebida mas não foi possível analisar.]'
    }
  } else {
    console.log(`[WA Cloud] Tipo de mensagem não suportado: ${messageType}`)
    return
  }

  if (!text) return

  console.log(`[WA Cloud] Mensagem de ${from} (${contactName}): "${text.slice(0, 80)}"`)

  // ── Keywords de controle (antes do buffer) ────────────────────────────────
  if (isReactivationKeyword(text)) {
    await handleReactivation(account, from)
    return
  }
  if (isPauseKeyword(text)) {
    await handlePause(from)
    return
  }

  // ── Treinamento via WhatsApp ───────────────────────────────────────────────
  if (text.startsWith(TRAINING_PREFIX)) {
    const trainingContent = text.slice(TRAINING_PREFIX.length).trim()
    if (trainingContent) await handleTrainingMessage(account, from, trainingContent)
    return
  }

  // ── Empurrar para o buffer de debounce (10s) ──────────────────────────────
  const bufferedMsg: BufferedMessage = {
    text,
    messageId,
    messageType: bufferedType,
    timestamp: Date.now(),
  }

  await pushToBuffer(from, bufferedMsg, (bufferedMessages) =>
    processBufferedMessages(account, from, contactName, bufferedMessages)
  )
}

// ── Processar mensagens acumuladas pelo buffer ────────────────────────────────

async function processBufferedMessages(
  account: WabaAccount,
  from: string,
  contactName: string,
  bufferedMessages: BufferedMessage[]
): Promise<void> {
  const combinedText = bufferedMessages.map((m) => m.text).join('\n')

  try {
    // 1. Lead
    let lead = await prisma.lead.findUnique({ where: { telefone: from } })
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          nome: contactName,
          telefone: from,
          status: 'novo',
          fonte: 'whatsapp',
          score: 0,
          metadata: { whatsappContactId: from, provider: 'meta-cloud-api', displayName: contactName },
        },
      })
      console.log('✅ Novo lead criado:', lead.id, from)
    } else if (lead.nome === from && contactName !== from) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { nome: contactName, ultimaInteracao: new Date() },
      })
    } else {
      await prisma.lead.update({ where: { id: lead.id }, data: { ultimaInteracao: new Date() } })
    }

    // 2. Conversa ativa
    let conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, channel: 'whatsapp', status: 'active' },
    })
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          whatsappChatId: from,
          channel: 'whatsapp',
          status: 'active',
          handledBy: 'ai',
          startedAt: new Date(),
          lastMessageAt: new Date(),
          lastInboundAt: new Date(),
          messageCount: 0,
        },
      })
      console.log('✅ Nova conversa criada:', conversation.id)
    }

    // 3. Salvar mensagens do cliente (dedup por whatsappMessageId)
    for (const msg of bufferedMessages) {
      await safeCreateMessage({
        conversationId: conversation.id,
        leadId: lead.id,
        whatsappMessageId: msg.messageId,
        sender: 'user',
        messageType: msg.messageType,
        content: msg.text,
      })
    }

    // 4. Atualizar conversa (lastInboundAt = janela de 24h)
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: { increment: bufferedMessages.length },
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
      },
    })

    // 5. Modo humano → não responde com IA
    if (conversation.handledBy === 'human') {
      console.log('⚠️ Conversa em modo humano, IA não responderá')
      return
    }

    // 6. Resolver agente: linkado à conta, ou fallback p/ qualquer agente whatsapp ativo
    let agent = account.agentId
      ? await prisma.agent.findFirst({
          where: { id: account.agentId, status: 'active' },
          include: { channels: true },
        })
      : null
    if (!agent) {
      agent = await prisma.agent.findFirst({
        where: { status: 'active', channels: { some: { channel: 'whatsapp', isActive: true } } },
        include: { channels: true },
      })
    }
    if (!agent) {
      console.log('⚠️ Nenhum agente ativo encontrado para whatsapp')
      return
    }
    console.log(`[WA Cloud] Agente: ${agent.name}`)

    // 7. Histórico
    const previousMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: 'asc' },
      take: 12,
    })
    const messageHistory = previousMessages.map((msg) => ({
      role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    }))

    // 8. Gerar resposta — single-agent OU Team em modo conversa (Fase 3 Teams)
    const leadContext = { leadName: lead.nome, leadPhone: lead.telefone, leadStatus: lead.status }

    let teamId: string | null = conversation.teamId ?? null
    if (!teamId) {
      const waChannel = agent.channels?.find((c) => c.channel === 'whatsapp')
      const cfg = (waChannel?.config ?? {}) as Record<string, unknown>
      if (cfg.mode === 'team' && typeof cfg.teamId === 'string') teamId = cfg.teamId
    }

    let aiResponse: { message: string; model: string; usage?: unknown; confidence: number }

    if (teamId) {
      const { answerConversationWithTeam } = await import('@/lib/ai/team-conversation')
      const teamResp = await answerConversationWithTeam(teamId, messageHistory, leadContext)
      if (teamResp) {
        aiResponse = teamResp
        if (teamResp.delegatedTo?.length) {
          console.log(
            `[WA Cloud] Team ${teamId}: líder ${teamResp.respondedBy?.name} delegou a ${teamResp.delegatedTo
              .map((d) => d.name)
              .join(', ')}`
          )
        }
        if (conversation.teamId !== teamId) {
          await prisma.conversation
            .update({ where: { id: conversation.id }, data: { teamId } })
            .catch(() => {})
        }
      } else {
        const { chatWithAgent } = await import('@/lib/groq')
        aiResponse = await chatWithAgent(agent.id, messageHistory, leadContext)
      }
    } else {
      const { chatWithAgent } = await import('@/lib/groq')
      aiResponse = await chatWithAgent(agent.id, messageHistory, leadContext)
    }

    if (!aiResponse.message) return

    // 9. Pós-formatar (char limit + emojis + naturalidade) e enviar
    const formatted = formatWhatsAppResponse(aiResponse.message, { userMessage: combinedText })
    const sendResult = await sendWhatsAppMessage(account, from, formatted)
    if (!sendResult.success) {
      console.error('[WA Cloud] Falha ao enviar resposta:', sendResult.error)
    }

    // 10. Salvar resposta da IA
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        whatsappMessageId: sendResult.messageId,
        sender: 'assistant',
        messageType: 'text',
        content: formatted,
        isAiGenerated: true,
        aiModel: aiResponse.model || agent.model,
        aiConfidence: aiResponse.confidence,
        sentAt: new Date(),
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { messageCount: { increment: 1 }, lastMessageAt: new Date() },
    })

    console.log('✅ Resposta da IA enviada via WhatsApp Cloud API')
  } catch (error) {
    console.error('[WA Cloud] Erro ao processar mensagens:', error)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function safeCreateMessage(data: {
  conversationId: string
  leadId: string
  whatsappMessageId?: string
  sender: string
  messageType: string
  content: string
}) {
  try {
    await prisma.message.create({ data: { ...data, isAiGenerated: false, sentAt: new Date() } })
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e?.code === 'P2002') {
      console.log(`[WA Cloud] Msg ${data.whatsappMessageId} já existe, ignorando`)
    } else {
      throw err
    }
  }
}

async function handleReactivation(account: WabaAccount, from: string) {
  console.log(`[WA Cloud] Reativando IA para ${from}`)
  const lead = await prisma.lead.findUnique({ where: { telefone: from } })
  if (!lead) return
  const conversation = await prisma.conversation.findFirst({
    where: { leadId: lead.id, channel: 'whatsapp', status: 'active' },
  })
  if (conversation) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { handledBy: 'ai' } })
    await sendWhatsAppMessage(account, from, 'IA reativada! 🤖 Olá, como posso te ajudar?')
    console.log('✅ IA reativada para', from)
  }
}

async function handlePause(from: string) {
  console.log(`[WA Cloud] Pausando IA para ${from}`)
  const lead = await prisma.lead.findUnique({ where: { telefone: from } })
  if (!lead) return
  const conversation = await prisma.conversation.findFirst({
    where: { leadId: lead.id, channel: 'whatsapp', status: 'active' },
  })
  if (conversation) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { handledBy: 'human' } })
    console.log('✅ IA pausada para', from)
  }
}

// ── Treinamento via WhatsApp ──────────────────────────────────────────────────

async function handleTrainingMessage(account: WabaAccount, from: string, content: string) {
  console.log(`[TREINO] Mensagem de treinamento de ${from}: "${content.slice(0, 80)}..."`)
  try {
    // Agente linkado à conta (com KB) ou fallback p/ qualquer agente whatsapp ativo
    const agent = account.agentId
      ? await prisma.agent.findFirst({
          where: { id: account.agentId, status: 'active' },
          select: { id: true, name: true, knowledgeBaseId: true },
        })
      : (await prisma.agent.findFirst({
          where: { status: 'active', channels: { some: { channel: 'whatsapp', isActive: true } } },
          select: { id: true, name: true, knowledgeBaseId: true },
        }))

    if (!agent?.knowledgeBaseId) {
      console.log('[TREINO] Agente sem Knowledge Base configurada')
      await sendWhatsAppMessage(account, from, '⚠️ Nenhuma base de conhecimento configurada para este agente.')
      return
    }

    const title = `WhatsApp Training - ${new Date().toISOString().slice(0, 10)}`
    const doc = await prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId: agent.knowledgeBaseId,
        title,
        content,
        sourceUrl: `whatsapp://${from}/${Date.now()}`,
        fileType: 'txt',
        chunks: [],
        status: 'processing',
      },
    })

    processDocumentVectorization(doc.id, content)
      .then(() => console.log(`[TREINO] Documento ${doc.id} vectorizado`))
      .catch((err) => console.error(`[TREINO] Erro na vectorização:`, err))

    await sendWhatsAppMessage(
      account,
      from,
      `✅ Conteúdo adicionado à base de conhecimento!\n\nDocumento: "${title}"\n${content.length} caracteres serão processados em breve.`
    )
    console.log(`[TREINO] Documento criado: ${doc.id} para KB ${agent.knowledgeBaseId}`)
  } catch (error) {
    console.error('[TREINO] Erro:', error)
    await sendWhatsAppMessage(account, from, '❌ Erro ao salvar conteúdo de treinamento. Tente novamente.')
  }
}
