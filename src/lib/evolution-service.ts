import { prisma } from '@/lib/prisma'

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

export async function createInstance(instanceName: string, settings: Record<string, unknown> = {}): Promise<EvolutionResponse> {
  try {
    const body = {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhookUrl: WEBHOOK_URL,
      webhookByEvents: true,
      webhookBase64: true,
      webhookEvents: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'MESSAGE_STATUS_UPDATE'],
      rejectCall: true,
      msgCall: 'Sofia IA does not accept calls. Please use text messages.',
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      readStatus: false,
      syncFullHistory: false,
      ...settings,
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
    const res = await evoFetch(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        options: { delay: 1200, presence: 'composing' },
        textMessage: { text },
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: `HTTP ${res.status}`, details: errData }
    }

    const data = await res.json()
    return { success: true, data }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

// --- Webhook Processing ---

export async function processWebhook(webhookData: {
  event: string
  instance: string
  data: Record<string, unknown>
}): Promise<EvolutionResponse> {
  const { event, instance, data } = webhookData

  switch (event) {
    case 'QRCODE_UPDATED':
      handleQrCodeUpdate(instance, data)
      break
    case 'CONNECTION_UPDATE':
      handleConnectionUpdate(instance, data)
      break
    case 'MESSAGES_UPSERT':
      await handleMessageUpsert(instance, data)
      break
    default:
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

async function handleMessageUpsert(instance: string, data: Record<string, unknown>) {
  const messages = (data.messages || []) as Array<Record<string, unknown>>
  for (const message of messages) {
    const key = message.key as Record<string, unknown>
    if (key?.fromMe) continue

    const contact = key?.remoteJid as string
    const msgObj = message.message as Record<string, unknown> | undefined
    const text =
      (msgObj?.conversation as string) ||
      ((msgObj?.extendedTextMessage as Record<string, unknown>)?.text as string) ||
      ''

    if (!text || !contact) continue

    // Extrair número de telefone do contact (remover @s.whatsapp.net)
    const phoneNumber = contact.replace('@s.whatsapp.net', '')

    try {
      // 1. Buscar ou criar Lead
      let lead = await prisma.lead.findUnique({
        where: { telefone: phoneNumber }
      })

      if (!lead) {
        // Criar novo lead a partir da mensagem recebida
        lead = await prisma.lead.create({
          data: {
            nome: phoneNumber, // Será atualizado depois com o nome real
            telefone: phoneNumber,
            status: 'novo',
            fonte: 'whatsapp',
            score: 0,
            metadata: {
              whatsappChatId: contact,
              instanceName: instance
            }
          }
        })
        console.log('✅ Novo lead criado:', lead.id, phoneNumber)
      } else {
        // Atualizar última interação
        await prisma.lead.update({
          where: { id: lead.id },
          data: { ultimaInteracao: new Date() }
        })
      }

      // 2. Buscar ou criar Conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          leadId: lead.id,
          whatsappChatId: contact,
          status: 'active'
        }
      })

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            leadId: lead.id,
            whatsappChatId: contact,
            status: 'active',
            startedAt: new Date(),
            lastMessageAt: new Date(),
            messageCount: 0
          }
        })
        console.log('✅ Nova conversa criada:', conversation.id)
      }

      // 3. Salvar mensagem recebida no banco
      const messageId = (key.id as string) || `msg_${Date.now()}`
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          leadId: lead.id,
          whatsappMessageId: messageId,
          sender: 'user',
          messageType: 'text',
          content: text,
          isAiGenerated: false,
          sentAt: new Date(),
        }
      })

      // 4. Atualizar contador de mensagens da conversa
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date()
        }
      })

      console.log('✅ Mensagem salva no banco:', messageId)

      // AI response via Groq will be handled by the AI service
      const autoResponse = getAutomatedResponse(text)
      if (autoResponse) {
        await sendMessage(instance, contact, autoResponse)

        // Salvar resposta automática no banco
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
          }
        })

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            messageCount: { increment: 1 },
            lastMessageAt: new Date()
          }
        })
      }
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem no banco:', error)
      // Continua processando outras mensagens mesmo se houver erro
    }
  }
}

function getAutomatedResponse(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes('olá') || lower.includes('oi') || lower.includes('ola')) {
    return 'Olá! Sou a Sofia, assistente virtual da imobiliária. Como posso te ajudar?'
  }
  if (lower.includes('preço') || lower.includes('valor') || lower.includes('preco')) {
    return 'Para te informar os valores, preciso saber mais sobre o tipo de imóvel e a região que você procura. Pode me dar mais detalhes?'
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
        qr_code: connData.code || connData.pairingCode,
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
