/**
 * whatsapp-templates.ts — templates HSM (Fase 3).
 *
 * Mensagens proativas FORA da janela de 24h (último inbound do cliente) só podem
 * ser enviadas via template pré-aprovado pela Meta. Este módulo lista os templates
 * de uma WABA e envia uma mensagem de template.
 */

import type { WabaAccount } from '@/lib/whatsapp-cloud-service'

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

export interface WhatsAppTemplate {
  name: string
  status: string
  language: string
  category: string
}

/** Parâmetro posicional de um componente de template. */
export interface TemplateParam {
  type: 'text'
  text: string
}

/** Lista os templates da WABA (nome, status de aprovação, idioma, categoria). */
export async function listTemplates(account: WabaAccount): Promise<WhatsAppTemplate[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/${account.wabaId}/message_templates?fields=name,status,language,category&limit=100`,
      { headers: { Authorization: `Bearer ${account.accessToken}` } }
    )
    if (!res.ok) {
      console.error('[WA Templates] list não-OK:', res.status)
      return []
    }
    const data = await res.json()
    return (data.data || []) as WhatsAppTemplate[]
  } catch (err) {
    console.error('[WA Templates] erro ao listar:', err)
    return []
  }
}

/**
 * Envia uma mensagem de template. `bodyParams` preenche as variáveis posicionais
 * do corpo ({{1}}, {{2}}, ...). `language` é o código (ex: pt_BR).
 */
export async function sendWhatsAppTemplate(
  account: WabaAccount,
  to: string,
  templateName: string,
  language: string,
  bodyParams: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const components =
      bodyParams.length > 0
        ? [
            {
              type: 'body',
              parameters: bodyParams.map((text): TemplateParam => ({ type: 'text', text })),
            },
          ]
        : []

    const res = await fetch(`${BASE_URL}/${account.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: { name: templateName, language: { code: language }, components },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[WA Templates] envio falhou:', res.status, JSON.stringify(err))
      return { success: false, error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}
