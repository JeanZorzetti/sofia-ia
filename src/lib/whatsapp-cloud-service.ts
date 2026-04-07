/**
 * whatsapp-cloud-service.ts
 *
 * Serviço da WhatsApp Business Cloud API oficial (Meta)
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Credenciais necessárias no .env.local:
 *   WHATSAPP_ACCESS_TOKEN       — System User token permanente
 *   WHATSAPP_PHONE_NUMBER_ID    — ID do número registrado na Meta
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN — Token de verificação do webhook
 *   WHATSAPP_API_VERSION        — Versão da Graph API (ex: v21.0)
 */

import { prisma } from '@/lib/prisma'
import { getGroqClient } from '@/lib/ai/groq'

// ── Config ──────────────────────────────────────────────────────────────────

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || ''
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

function cloudHeaders(): HeadersInit {
    return {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
    }
}

// ── Send Message ─────────────────────────────────────────────────────────────

/**
 * Envia mensagem de texto via WhatsApp Cloud API.
 * @param to  Número no formato internacional sem + (ex: 5562999998888)
 * @param text Texto a enviar
 */
export async function sendWhatsAppMessage(
    to: string,
    text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const res = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: cloudHeaders(),
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

export async function markMessageRead(messageId: string): Promise<void> {
    try {
        await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: cloudHeaders(),
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
 * Baixa uma mídia (áudio) pelo media_id retornado pelo webhook.
 * 1. GET /v21.0/{media_id}  → obtém a URL temporária
 * 2. GET {url}              → baixa o buffer do áudio
 */
async function downloadWhatsAppMedia(
    mediaId: string
): Promise<{ buffer: Buffer; mimetype: string } | null> {
    try {
        // Passo 1: obter URL
        const metaRes = await fetch(`${BASE_URL}/${mediaId}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        })
        if (!metaRes.ok) {
            console.error(`[WA Cloud] Falha ao obter URL da mídia ${mediaId}: ${metaRes.status}`)
            return null
        }
        const { url, mime_type } = await metaRes.json()

        // Passo 2: baixar o binário
        const mediaRes = await fetch(url, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        })
        if (!mediaRes.ok) {
            console.error(`[WA Cloud] Falha ao baixar mídia: ${mediaRes.status}`)
            return null
        }

        const arrayBuffer = await mediaRes.arrayBuffer()
        return { buffer: Buffer.from(arrayBuffer), mimetype: mime_type || 'audio/ogg' }
    } catch (error) {
        console.error('[WA Cloud] Erro ao baixar mídia:', error)
        return null
    }
}

// ── Transcribe Audio (Groq Whisper) ─────────────────────────────────────────

async function transcribeAudio(
    buffer: Buffer,
    mimetype: string
): Promise<string | null> {
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
                : (transcription as any).text || ''

        console.log(`[Whisper] Transcrito: "${text.slice(0, 100)}"`)
        return text
    } catch (error) {
        console.error('[Whisper] Erro na transcrição:', error)
        return null
    }
}

// ── Process Webhook ───────────────────────────────────────────────────────────

/**
 * Processa o payload oficial da Meta Cloud API.
 *
 * Estrutura esperada:
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{
 *     "id": "WABA_ID",
 *     "changes": [{
 *       "value": {
 *         "messaging_product": "whatsapp",
 *         "metadata": { "phone_number_id": "...", "display_phone_number": "..." },
 *         "contacts": [{ "profile": { "name": "..." }, "wa_id": "..." }],
 *         "messages": [{ "id": "...", "from": "...", "type": "text|audio", ... }]
 *       }
 *     }]
 *   }]
 * }
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
            const messages = (value.messages as Array<Record<string, unknown>>) || []
            const contacts = (value.contacts as Array<Record<string, unknown>>) || []

            for (const message of messages) {
                await handleIncomingMessage(message, contacts)
            }
        }
    }
}

// ── Handle Individual Message ─────────────────────────────────────────────────

async function handleIncomingMessage(
    message: Record<string, unknown>,
    contacts: Array<Record<string, unknown>>
): Promise<void> {
    const messageId = message.id as string
    const from = message.from as string // número do remetente (ex: 5562999998888)
    const messageType = message.type as string // text | audio | image | ...

    if (!from || !messageId) return

    // Marcar como lida (feedback visual no WhatsApp do cliente)
    markMessageRead(messageId).catch(() => { })

    // Extrair nome do contato
    const contact = contacts.find(
        (c) => (c.wa_id as string) === from
    )
    const contactName =
        ((contact?.profile as Record<string, unknown>)?.name as string) || from

    // Extrair texto da mensagem
    let text = ''

    if (messageType === 'text') {
        text = ((message.text as Record<string, unknown>)?.body as string) || ''
    } else if (messageType === 'audio' || messageType === 'voice') {
        const audioObj = message.audio as Record<string, unknown> | undefined
        const mediaId = audioObj?.id as string | undefined
        console.log(`[WA Cloud] Áudio recebido de ${from} (media_id: ${mediaId})`)

        if (mediaId) {
            const media = await downloadWhatsAppMedia(mediaId)
            if (media) {
                const transcribed = await transcribeAudio(media.buffer, media.mimetype)
                text = transcribed || '[Áudio recebido mas não foi possível transcrever. Por favor, escreva sua mensagem.]'
            }
        }
    } else {
        console.log(`[WA Cloud] Tipo de mensagem não suportado: ${messageType}`)
        return
    }

    if (!text) return

    console.log(`[WA Cloud] Mensagem de ${from} (${contactName}): "${text.slice(0, 80)}"`)

    try {
        // 1. Buscar ou criar Lead
        let lead = await prisma.lead.findUnique({ where: { telefone: from } })

        if (!lead) {
            lead = await prisma.lead.create({
                data: {
                    nome: contactName,
                    telefone: from,
                    status: 'novo',
                    fonte: 'whatsapp',
                    score: 0,
                    metadata: {
                        whatsappContactId: from,
                        provider: 'meta-cloud-api',
                        displayName: contactName,
                    },
                },
            })
            console.log('✅ Novo lead criado:', lead.id, from)
        } else {
            if (lead.nome === from && contactName !== from) {
                // Atualizar nome quando tínhamos apenas o número
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { nome: contactName, ultimaInteracao: new Date() },
                })
            } else {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { ultimaInteracao: new Date() },
                })
            }
        }

        // 2. Buscar ou criar Conversation ativa
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
                    messageCount: 0,
                },
            })
            console.log('✅ Nova conversa criada:', conversation.id)
        }

        // 3. Salvar mensagem do cliente (unique constraint evita duplicata)
        try {
            await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    leadId: lead.id,
                    whatsappMessageId: messageId,
                    sender: 'user',
                    messageType: messageType === 'text' ? 'text' : 'audio',
                    content: text,
                    isAiGenerated: false,
                    sentAt: new Date(),
                },
            })
        } catch (createErr: unknown) {
            const prismaError = createErr as { code?: string }
            if (prismaError?.code === 'P2002') {
                console.log(`[WA Cloud] Mensagem ${messageId} já processada, ignorando`)
                return
            }
            throw createErr
        }

        // 4. Atualizar contador da conversa
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { messageCount: { increment: 1 }, lastMessageAt: new Date() },
        })

        // 5. Verificar modo (humano = não responde com IA)
        if (conversation.handledBy === 'human') {
            console.log('⚠️ Conversa em modo humano, IA não responderá')
            return
        }

        // 6. Buscar agente ativo Prolife (canal whatsapp, provider meta-cloud-api)
        let agent = await prisma.agent.findFirst({
            where: {
                status: 'active',
                channels: {
                    some: {
                        channel: 'whatsapp',
                        isActive: true,
                        config: { path: ['provider'], equals: 'meta-cloud-api' },
                    },
                },
            },
            include: { channels: true },
        })

        // Fallback: qualquer agente whatsapp ativo
        if (!agent) {
            agent = await prisma.agent.findFirst({
                where: {
                    status: 'active',
                    channels: { some: { channel: 'whatsapp', isActive: true } },
                },
                include: { channels: true },
            })
        }

        console.log(`[WA Cloud] Agente: ${agent?.name || 'nenhum'}`)

        if (!agent) {
            console.log('⚠️ Nenhum agente ativo encontrado para whatsapp')
            return
        }

        // 7. Buscar histórico para contexto da IA
        const previousMessages = await prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { sentAt: 'asc' },
            take: 12,
        })

        const messageHistory = previousMessages.map((msg) => ({
            role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: msg.content,
        }))

        // 8. Gerar resposta com IA
        const { chatWithAgent } = await import('@/lib/groq')

        const aiResponse = await chatWithAgent(agent.id, messageHistory, {
            leadName: lead.nome,
            leadPhone: lead.telefone,
            leadStatus: lead.status,
        })

        if (!aiResponse.message) return

        // 9. Enviar resposta pelo WhatsApp Cloud API
        const sendResult = await sendWhatsAppMessage(from, aiResponse.message)
        if (!sendResult.success) {
            console.error('[WA Cloud] Falha ao enviar resposta:', sendResult.error)
        }

        // 10. Salvar resposta da IA no banco
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                leadId: lead.id,
                whatsappMessageId: sendResult.messageId,
                sender: 'assistant',
                messageType: 'text',
                content: aiResponse.message,
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

        console.log('✅ Resposta da IA enviada via WhatsApp Cloud API')
    } catch (error) {
        console.error('[WA Cloud] Erro ao processar mensagem:', error)
    }
}
