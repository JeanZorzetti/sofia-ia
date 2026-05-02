import { prisma } from '@/lib/prisma'
import { getGroqClient } from '@/lib/ai/groq'
import { pushToBuffer, type BufferedMessage } from '@/lib/message-buffer'
import { formatWhatsAppResponse, isReactivationKeyword, isPauseKeyword } from '@/lib/ai/whatsapp-formatter'
import { processDocumentVectorization } from '@/lib/ai/knowledge-context'

const TRAINING_PREFIX = 'TreinoIA1212:'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://ia-evolution-api.tjmarr.easypanel.host'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/evolution`
  : 'http://localhost:3000/api/webhook/evolution'

const QR_CODE_EXPIRY = 45000 // 45 seconds

interface EvolutionResponse {
  success: boolean
  data?: unknown
  error?: string
  message?: string
  existing?: boolean
  details?: unknown
}

// In-memory caches (reset on cold start in serverless, acceptable for QR codes)
const qrCodeCache = new Map<string, { qrcode: string; timestamp: number; expires_at: number }>()
const instanceStatusCache = new Map<string, { status: string; last_update: string }>()

const headers: Record<string, string> = {
  apikey: EVOLUTION_API_KEY,
  'Content-Type': 'application/json',
}

async function evoFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${EVOLUTION_API_URL}${path}`
  return fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  })
}

// --- Instance Management ---

export async function createInstance(instanceName: string, _settings: Record<string, unknown> = {}): Promise<EvolutionResponse> {
  try {
    // Evolution API v2.3.0 only accepts minimal params for creation
    // Webhook and other settings must be configured separately after creation
    const body = {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    }

    const res = await evoFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      if (res.status === 409) {
        return { success: false, error: 'Instance already exists', existing: true }
      }
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: `HTTP ${res.status}`, details: errData }
    }

    const data = await res.json()
    updateInstanceStatus(instanceName, 'created')
    return { success: true, data, message: 'Instance created. QR code will be sent via webhook.' }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function fetchInstances(): Promise<EvolutionResponse & { data: unknown[] }> {
  try {
    const res = await evoFetch('/instance/fetchInstances')

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: `HTTP ${res.status}`, data: [], details: errData }
    }

    const instances = await res.json()
    const data = Array.isArray(instances) ? instances : []

    data.forEach((inst: Record<string, unknown>) => {
      const instObj = inst?.instance as Record<string, string> | undefined
      const name = instObj?.instanceName || (inst?.instanceName as string)
      const status = instObj?.status || (inst?.status as string)
      if (name && status) updateInstanceStatus(name, status)
    })

    return { success: true, data }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg, data: [] }
  }
}

export async function deleteInstance(instanceName: string): Promise<EvolutionResponse> {
  try {
    const res = await evoFetch(`/instance/delete/${instanceName}`, { method: 'DELETE' })
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }
    qrCodeCache.delete(instanceName)
    instanceStatusCache.delete(instanceName)
    return { success: true, message: `Instance ${instanceName} deleted.` }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function logoutInstance(instanceName: string): Promise<EvolutionResponse> {
  try {
    const res = await evoFetch(`/instance/logout/${instanceName}`, { method: 'DELETE' })
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }
    qrCodeCache.delete(instanceName)
    updateInstanceStatus(instanceName, 'disconnected')
    return { success: true, message: `Instance ${instanceName} disconnected.` }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function connectInstance(instanceName: string, number?: string): Promise<EvolutionResponse> {
  try {
    let path = `/instance/connect/${instanceName}`
    if (number) path += `?number=${number}`

    const res = await evoFetch(path)
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: `HTTP ${res.status}`, details: errData }
    }

    const data = await res.json()
    return {
      success: true,
      data: {
        pairingCode: data.pairingCode,
        code: data.code,
        base64: data.base64,
        count: data.count || 1,
      },
      message: number ? 'Pairing code generated' : 'QR code generated',
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function getConnectionState(instanceName: string): Promise<EvolutionResponse> {
  try {
    const res = await evoFetch(`/instance/connectionState/${instanceName}`)
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    return {
      success: true,
      data: {
        instance: {
          instanceName,
          state: data.instance?.state || data.state,
        },
      },
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function restartInstance(instanceName: string): Promise<EvolutionResponse> {
  try {
    const res = await evoFetch(`/instance/restart/${instanceName}`, { method: 'PUT', body: '{}' })
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    return {
      success: true,
      data: {
        instance: {
          instanceName,
          state: data.instance?.state || 'restarting',
        },
      },
      message: `Instance ${instanceName} restarted`,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function setPresence(instanceName: string, presence: string): Promise<EvolutionResponse> {
  const validPresences = ['available', 'unavailable', 'composing', 'recording', 'paused']
  if (!validPresences.includes(presence)) {
    return { success: false, error: `Invalid presence. Valid: ${validPresences.join(', ')}` }
  }

  try {
    const res = await evoFetch(`/instance/setPresence/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ presence }),
    })
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    return { success: true, data, message: `Presence set to ${presence}` }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

// --- Messaging ---

export async function sendMessage(instanceName: string, number: string, text: string): Promise<EvolutionResponse> {
  try {
    // Limpar número: remover @s.whatsapp.net se presente
    const cleanNumber = number.replace('@s.whatsapp.net', '').replace('@g.us', '')

    console.log(`[SEND] Enviando para ${cleanNumber} via instância ${instanceName}`)

    // Evolution API v2 format: { number, text } (NOT { number, textMessage: { text } })
    const res = await evoFetch(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: cleanNumber,
        text,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error(`[SEND] Falha HTTP ${res.status}:`, JSON.stringify(errData))
      return { success: false, error: `HTTP ${res.status}`, details: errData }
    }

    const data = await res.json()
    console.log(`[SEND] Mensagem enviada com sucesso para ${cleanNumber}`)
    return { success: true, data }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[SEND] Erro ao enviar mensagem:`, msg)
    return { success: false, error: msg }
  }
}

// --- Webhook Processing ---

export async function processWebhook(webhookData: {
  event: string
  instance: string
  data: unknown
}): Promise<EvolutionResponse> {
  const { event, instance, data } = webhookData

  // Normalize event name: Evolution API v2 uses "messages.upsert", v1 uses "MESSAGES_UPSERT"
  const normalizedEvent = event?.toUpperCase().replace(/\./g, '_') || ''

  switch (normalizedEvent) {
    case 'QRCODE_UPDATED':
      handleQrCodeUpdate(instance, data as Record<string, unknown>)
      break
    case 'CONNECTION_UPDATE':
      handleConnectionUpdate(instance, data as Record<string, unknown>)
      break
    case 'MESSAGES_UPSERT':
      await handleMessageUpsert(instance, data)
      break
    default:
      console.log(`[WEBHOOK] Unhandled event: ${event} (normalized: ${normalizedEvent})`)
      return { success: true, message: `Unhandled event: ${event}` }
  }

  return { success: true, message: `Processed ${event} for ${instance}` }
}

function handleQrCodeUpdate(instance: string, data: Record<string, unknown>) {
  const qrcode = data.qrcode as string
  if (qrcode) {
    qrCodeCache.set(instance, {
      qrcode,
      timestamp: Date.now(),
      expires_at: Date.now() + QR_CODE_EXPIRY,
    })
    updateInstanceStatus(instance, 'qr_ready')
  }
}

function handleConnectionUpdate(instance: string, data: Record<string, unknown>) {
  const status = data.state === 'open' ? 'connected' : 'disconnected'
  updateInstanceStatus(instance, status)
  if (status === 'connected') {
    qrCodeCache.delete(instance)
  }
}

// --- Groq Whisper Audio Transcription ---

async function transcribeWhatsAppAudio(
  instance: string,
  messageKey: Record<string, unknown>
): Promise<string | null> {
  try {
    console.log(`[Whisper] Baixando áudio da instância ${instance}...`)

    // Buscar o base64 do áudio via Evolution API
    const res = await evoFetch(`/chat/getBase64FromMediaMessage/${instance}`, {
      method: 'POST',
      body: JSON.stringify({ message: { key: messageKey }, convertToMp4: false }),
    })

    if (!res.ok) {
      console.error(`[Whisper] Falha ao buscar áudio: HTTP ${res.status}`)
      return null
    }

    const { base64, mimetype } = await res.json()
    if (!base64) {
      console.error('[Whisper] Resposta sem base64')
      return null
    }

    // Converter base64 → Buffer → File para o Groq
    const audioBuffer = Buffer.from(base64, 'base64')
    const ext = mimetype?.includes('ogg') ? 'ogg' : 'mp3'
    const audioFile = new File([audioBuffer], `audio.${ext}`, { type: mimetype || 'audio/ogg' })

    console.log(`[Whisper] Transcrevendo áudio (${audioBuffer.length} bytes, tipo: ${ext})...`)

    // Groq suporta whisper-large-v3 para transcrição
    const transcription = await getGroqClient().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      language: 'pt',
      response_format: 'text',
    })

    const text = typeof transcription === 'string' ? transcription : (transcription as any).text || ''
    console.log(`[Whisper] Transcrição: "${text.slice(0, 100)}..."`)
    return text
  } catch (error) {
    console.error('[Whisper] Erro na transcrição:', error)
    return null
  }
}

async function handleMessageUpsert(instance: string, data: unknown) {
  let messages: Array<Record<string, unknown>> = []
  if (Array.isArray(data)) {
    messages = data
  } else if (data && typeof data === 'object') {
    const dataObj = data as Record<string, unknown>
    messages = (dataObj.messages || []) as Array<Record<string, unknown>>
    if (dataObj.key && dataObj.message) messages = [dataObj]
  }

  console.log(`[WEBHOOK] handleMessageUpsert: ${messages.length} messages from ${instance}`)

  for (const message of messages) {
    const key = message.key as Record<string, unknown>
    if (key?.fromMe) continue

    const contact = key?.remoteJid as string
    if (!contact) continue

    const msgObj = message.message as Record<string, unknown> | undefined
    const messageId = (key.id as string) || `msg_${Date.now()}`

    // ── Detectar tipo e extrair conteúdo ────────────────────────────────────
    const isAudio = !!(msgObj?.audioMessage || msgObj?.pttMessage)
    const isImage = !!(msgObj?.imageMessage)

    let text =
      (msgObj?.conversation as string) ||
      ((msgObj?.extendedTextMessage as Record<string, unknown>)?.text as string) ||
      ''
    let messageType: BufferedMessage['messageType'] = 'text'

    // Áudio → transcrever
    if (isAudio && !text) {
      messageType = 'audio'
      console.log(`[WEBHOOK] Áudio de ${contact}, transcrevendo...`)
      const transcribed = await transcribeWhatsAppAudio(instance, key)
      text = transcribed || '[Áudio recebido. Por favor, escreva sua mensagem em texto.]'
      console.log(`[WEBHOOK] Áudio transcrito: "${text.slice(0, 80)}..."`)
    }

    // Imagem → descrever com Vision
    if (isImage && !text) {
      messageType = 'image'
      console.log(`[WEBHOOK] Imagem de ${contact}, analisando com Vision...`)
      const caption = (msgObj?.imageMessage as Record<string, unknown>)?.caption as string | undefined
      const described = await describeWhatsAppImage(instance, key, caption)
      text = described || '[Imagem recebida mas não foi possível analisar.]'
      console.log(`[WEBHOOK] Imagem descrita: "${text.slice(0, 80)}..."`)
    }

    if (!text) continue

    // ── Verificar pausa/reativação ANTES do buffer ───────────────────────────
    // Reativação da IA (ex: "Atendimento finalizado")
    if (isReactivationKeyword(text)) {
      await handleReactivation(contact, instance)
      continue
    }

    // Pausa manual da IA
    if (isPauseKeyword(text)) {
      await handlePause(contact)
      continue
    }

    // ── Treinamento via WhatsApp (TreinoIA1212: conteúdo) ───────────────────
    if (text.startsWith(TRAINING_PREFIX)) {
      const trainingContent = text.slice(TRAINING_PREFIX.length).trim()
      if (trainingContent) {
        await handleTrainingMessage(contact, instance, trainingContent)
      }
      continue
    }

    // ── Empurrar para buffer Redis (debounce 10s) ────────────────────────────
    const bufferedMsg: BufferedMessage = {
      text,
      messageId,
      messageType,
      timestamp: Date.now(),
    }

    await pushToBuffer(contact, bufferedMsg, (bufferedMessages) =>
      processBufferedMessages(instance, contact, bufferedMessages)
    )
  }
}

// ── Processar conjunto de mensagens acumuladas pelo buffer ───────────────────
async function processBufferedMessages(
  instance: string,
  contact: string,
  bufferedMessages: BufferedMessage[]
): Promise<void> {
  // Concatenar todas as mensagens em uma única entrada do usuário
  const combinedText = bufferedMessages.map(m => m.text).join('\n')
  const messageId = bufferedMessages[bufferedMessages.length - 1].messageId
  const phoneNumber = contact.replace('@s.whatsapp.net', '').replace('@g.us', '')

  try {
    // 1. Buscar ou criar Lead
    let lead = await prisma.lead.findUnique({ where: { telefone: phoneNumber } })
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          nome: phoneNumber,
          telefone: phoneNumber,
          status: 'novo',
          fonte: 'whatsapp',
          score: 0,
          metadata: { whatsappChatId: contact, instanceName: instance },
        },
      })
      console.log('✅ Novo lead criado:', lead.id, phoneNumber)
    } else {
      await prisma.lead.update({ where: { id: lead.id }, data: { ultimaInteracao: new Date() } })
    }

    // 2. Buscar ou criar Conversation
    let conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, whatsappChatId: contact, status: 'active' },
    })
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          whatsappChatId: contact,
          channel: 'whatsapp',
          status: 'active',
          handledBy: 'ai',
          startedAt: new Date(),
          lastMessageAt: new Date(),
          messageCount: 0,
        },
      })
      console.log('✅ Nova conversa criada:', conversation.id)
    }

    // Verificar se está em modo humano
    if (conversation.handledBy === 'human') {
      console.log('⚠️ Conversa em modo humano, IA não responde')
      // Salvar mensagens mesmo assim (histórico)
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
      return
    }

    // 3. Salvar todas as mensagens do buffer no banco
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

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: { increment: bufferedMessages.length },
        lastMessageAt: new Date(),
      },
    })

    // 4. Buscar agente ativo
    let agent = await prisma.agent.findFirst({
      where: {
        status: 'active',
        channels: { some: { channel: 'whatsapp', isActive: true, config: { path: ['instanceName'], equals: instance } } },
      },
      include: { channels: true },
    })
    if (!agent) {
      agent = await prisma.agent.findFirst({
        where: { status: 'active', channels: { some: { channel: 'whatsapp', isActive: true } } },
        include: { channels: true },
      })
    }

    if (!agent) {
      console.log('⚠️ Nenhum agente ativo encontrado para WhatsApp')
      return
    }

    console.log(`[WEBHOOK] Agente: ${agent.name}`)

    // 5. Buscar histórico + chamar IA
    const { chatWithAgent } = await import('@/lib/groq')

    const previousMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: 'asc' },
      take: 20,
    })

    const messageHistory = previousMessages.map(msg => ({
      role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    }))

    try {
      const aiResponse = await chatWithAgent(agent.id, messageHistory, {
        leadName: lead.nome,
        leadPhone: lead.telefone,
        leadStatus: lead.status,
      })

      if (aiResponse.message) {
        // 6. Pós-processar resposta (char limit + emojis + naturalidade)
        const formatted = formatWhatsAppResponse(aiResponse.message, {
          userMessage: combinedText,
        })

        await sendMessage(instance, contact, formatted)

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            leadId: lead.id,
            sender: 'assistant',
            messageType: 'text',
            content: formatted,
            isAiGenerated: true,
            aiModel: agent.model,
            aiConfidence: aiResponse.confidence,
            sentAt: new Date(),
          },
        })

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { messageCount: { increment: 1 }, lastMessageAt: new Date() },
        })

        console.log('✅ Resposta enviada:', agent.name)
      }
    } catch (aiError) {
      console.error('❌ Erro IA:', aiError)
      const autoResponse = getAutomatedResponse(combinedText)
      if (autoResponse) {
        await sendMessage(instance, contact, autoResponse)
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            leadId: lead.id,
            sender: 'assistant',
            messageType: 'text',
            content: autoResponse,
            isAiGenerated: true,
            aiModel: 'rule-based',
            sentAt: new Date(),
          },
        })
      }
    }
  } catch (error) {
    console.error('❌ Erro ao processar mensagens:', error)
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
    await prisma.message.create({
      data: {
        ...data,
        isAiGenerated: false,
        sentAt: new Date(),
      },
    })
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e?.code === 'P2002') {
      console.log(`[WEBHOOK] Msg ${data.whatsappMessageId} já existe, ignorando`)
    } else {
      throw err
    }
  }
}

async function handleReactivation(contact: string, instance: string) {
  console.log(`[WEBHOOK] Reativando IA para ${contact}`)
  const phoneNumber = contact.replace('@s.whatsapp.net', '')
  const lead = await prisma.lead.findUnique({ where: { telefone: phoneNumber } })
  if (!lead) return

  const conversation = await prisma.conversation.findFirst({
    where: { leadId: lead.id, whatsappChatId: contact, status: 'active' },
  })
  if (conversation) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { handledBy: 'ai' },
    })
    await sendMessage(instance, contact, 'IA reativada! 🤖 Olá, como posso te ajudar?')
    console.log('✅ IA reativada para', contact)
  }
}

async function handlePause(contact: string) {
  console.log(`[WEBHOOK] Pausando IA para ${contact}`)
  const phoneNumber = contact.replace('@s.whatsapp.net', '')
  const lead = await prisma.lead.findUnique({ where: { telefone: phoneNumber } })
  if (!lead) return

  const conversation = await prisma.conversation.findFirst({
    where: { leadId: lead.id, whatsappChatId: contact, status: 'active' },
  })
  if (conversation) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { handledBy: 'human' },
    })
    console.log('✅ IA pausada para', contact)
  }
}

// ── Treinamento via WhatsApp ──────────────────────────────────────────────────

async function handleTrainingMessage(contact: string, instance: string, content: string) {
  console.log(`[TREINO] Mensagem de treinamento de ${contact}: "${content.slice(0, 80)}..."`)

  try {
    // Buscar agente ativo para esta instância
    const agent = await prisma.agent.findFirst({
      where: {
        status: 'active',
        channels: {
          some: {
            channel: 'whatsapp',
            isActive: true,
            config: { path: ['instanceName'], equals: instance },
          },
        },
      },
      select: { id: true, name: true, knowledgeBaseId: true },
    }) ?? await prisma.agent.findFirst({
      where: { status: 'active', channels: { some: { channel: 'whatsapp', isActive: true } } },
      select: { id: true, name: true, knowledgeBaseId: true },
    })

    if (!agent?.knowledgeBaseId) {
      console.log('[TREINO] Agente sem Knowledge Base configurada')
      await sendMessage(instance, contact, '⚠️ Nenhuma base de conhecimento configurada para este agente.')
      return
    }

    // Criar documento com o conteúdo de treinamento
    const title = `WhatsApp Training - ${new Date().toISOString().slice(0, 10)}`
    const doc = await prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId: agent.knowledgeBaseId,
        title,
        content,
        sourceUrl: `whatsapp://${contact}/${Date.now()}`,
        fileType: 'txt',
        chunks: [],
        status: 'processing',
      },
    })

    // Vectorizar em background
    processDocumentVectorization(doc.id, content)
      .then(() => console.log(`[TREINO] Documento ${doc.id} vectorizado`))
      .catch(err => console.error(`[TREINO] Erro na vectorização:`, err))

    // Registrar no audit log (Google Sheets, se configurado)
    logTrainingAudit(agent.knowledgeBaseId, doc.id, title, content.length).catch(() => {})

    await sendMessage(
      instance,
      contact,
      `✅ Conteúdo adicionado à base de conhecimento!\n\nDocumento: "${title}"\n${content.length} caracteres serão processados em breve.`
    )

    console.log(`[TREINO] Documento criado: ${doc.id} para KB ${agent.knowledgeBaseId}`)
  } catch (error) {
    console.error('[TREINO] Erro:', error)
    await sendMessage(instance, contact, '❌ Erro ao salvar conteúdo de treinamento. Tente novamente.')
  }
}

/**
 * Registra evento de treinamento no Google Sheets (audit trail).
 * Busca spreadsheetId no config da Knowledge Base.
 */
async function logTrainingAudit(
  knowledgeBaseId: string,
  documentId: string,
  title: string,
  charCount: number
) {
  try {
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
      select: { config: true },
    })
    const config = (kb?.config || {}) as Record<string, unknown>
    const spreadsheetId = config.auditSheetId as string | undefined
    if (!spreadsheetId) return

    // Buscar qualquer conexão google-sheets ativa no sistema
    const conn = await prisma.oAuthConnection.findFirst({
      where: { provider: 'google-sheets' },
      select: { accessToken: true },
    })
    if (!conn) return

    const row = [
      new Date().toISOString(),
      title,
      documentId,
      charCount.toString(),
      'whatsapp',
      'completed',
    ]

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      }
    )
  } catch (err) {
    console.error('[TREINO] Erro ao registrar audit no Sheets:', err)
  }
}

// ── Análise de imagem com Vision (Groq/OpenAI) ────────────────────────────────
async function describeWhatsAppImage(
  instance: string,
  messageKey: Record<string, unknown>,
  caption?: string
): Promise<string | null> {
  try {
    // Buscar base64 da imagem via Evolution API
    const res = await evoFetch(`/chat/getBase64FromMediaMessage/${instance}`, {
      method: 'POST',
      body: JSON.stringify({ message: { key: messageKey }, convertToMp4: false }),
    })
    if (!res.ok) return null

    const { base64, mimetype } = await res.json() as { base64: string; mimetype: string }
    if (!base64) return null

    // Usar OpenAI Vision (GPT-4o) para descrever a imagem
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      // Fallback: retornar caption se houver
      return caption ? `[Imagem com legenda: "${caption}"]` : null
    }

    const prompt = caption
      ? `Descreva esta imagem brevemente. A legenda do usuário é: "${caption}"`
      : 'Descreva esta imagem brevemente em português. Seja direto e objetivo.'

    const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimetype};base64,${base64}`, detail: 'low' } },
            ],
          },
        ],
      }),
    })

    if (!visionRes.ok) return caption || null
    const visionData = await visionRes.json() as { choices?: Array<{ message?: { content?: string } }> }
    const description = visionData.choices?.[0]?.message?.content || null
    return description ? `[Imagem: ${description}]` : null
  } catch (error) {
    console.error('[Vision] Erro ao descrever imagem:', error)
    return null
  }
}

function getAutomatedResponse(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes('olá') || lower.includes('oi') || lower.includes('ola')) {
    return 'Olá! Sou a Polaris IA, sua assistente virtual. Como posso te ajudar?'
  }
  if (lower.includes('preço') || lower.includes('valor') || lower.includes('preco')) {
    return 'Para te ajudar com valores, preciso saber mais detalhes sobre o que você procura. Pode me contar mais?'
  }
  return null
}

// --- QR Code Cache ---

export function getCachedQRCode(instance: string) {
  const cached = qrCodeCache.get(instance)
  if (!cached || Date.now() > cached.expires_at) {
    if (cached) qrCodeCache.delete(instance)
    return null
  }
  return cached
}

export async function getQRCode(instanceName: string, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedQRCode(instanceName)
    if (cached) {
      return {
        success: true,
        source: 'cache',
        data: {
          instanceName,
          qr_code: cached.qrcode,
          expires_in: Math.max(0, cached.expires_at - Date.now()),
          expires_at: new Date(cached.expires_at).toISOString(),
          generated_at: new Date(cached.timestamp).toISOString(),
        },
      }
    }
  }

  // Try connecting to get a fresh QR code
  const connectResult = await connectInstance(instanceName)
  if (connectResult.success && connectResult.data) {
    const connData = connectResult.data as Record<string, unknown>
    return {
      success: true,
      source: 'evolution_api',
      data: {
        instanceName,
        qr_code: connData.base64 || connData.code || connData.pairingCode,
        ...connData,
      },
    }
  }

  return { success: false, error: 'Could not generate QR code' }
}

// --- Cache & Status ---

function updateInstanceStatus(instance: string, status: string) {
  instanceStatusCache.set(instance, { status, last_update: new Date().toISOString() })
}

export function getInstanceStatus(instance: string) {
  return instanceStatusCache.get(instance) || { status: 'unknown' }
}

export function getCacheStats() {
  return { qr_codes: qrCodeCache.size, instances: instanceStatusCache.size }
}

export async function healthCheck(): Promise<{ success: boolean; status: string; error?: string }> {
  try {
    const res = await evoFetch('/instance/fetchInstances')
    return { success: res.ok, status: res.ok ? 'healthy' : 'unhealthy' }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, status: 'unhealthy', error: msg }
  }
}
