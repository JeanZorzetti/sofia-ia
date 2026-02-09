import { prisma } from '@/lib/prisma'

export interface IntegrationExecutionResult {
  success: boolean
  message: string
  data?: unknown
  error?: string
}

/**
 * Send webhook with payload
 */
export async function sendWebhook(
  integrationId: string,
  payload: Record<string, unknown>
): Promise<IntegrationExecutionResult> {
  try {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return {
        success: false,
        message: 'Integração não encontrada',
      }
    }

    if (integration.type !== 'webhook') {
      return {
        success: false,
        message: 'Integração não é do tipo webhook',
      }
    }

    const config = integration.config as Record<string, unknown>
    const webhookUrl = config.webhookUrl as string | undefined
    const method = (config.method as string) || 'POST'
    const headers = (config.headers as Record<string, string>) || {
      'Content-Type': 'application/json',
    }

    if (!webhookUrl) {
      return {
        success: false,
        message: 'URL do webhook não configurada',
      }
    }

    const response = await fetch(webhookUrl, {
      method,
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return {
        success: false,
        message: `Webhook retornou status ${response.status}`,
      }
    }

    const responseData = await response.json()

    return {
      success: true,
      message: 'Webhook enviado com sucesso',
      data: responseData,
    }
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao enviar webhook',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Call external API
 */
export async function callApiRest(
  integrationId: string,
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, unknown>
): Promise<IntegrationExecutionResult> {
  try {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return {
        success: false,
        message: 'Integração não encontrada',
      }
    }

    if (integration.type !== 'api_rest') {
      return {
        success: false,
        message: 'Integração não é do tipo API REST',
      }
    }

    const config = integration.config as Record<string, unknown>
    const credentials = integration.credentials as Record<string, unknown>
    const baseUrl = config.baseUrl as string | undefined

    if (!baseUrl) {
      return {
        success: false,
        message: 'URL base da API não configurada',
      }
    }

    const url = `${baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth headers
    if (credentials.apiKey) {
      headers['Authorization'] = `Bearer ${credentials.apiKey as string}`
    }
    if (credentials.customHeaders) {
      Object.assign(headers, credentials.customHeaders as Record<string, string>)
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      return {
        success: false,
        message: `API retornou status ${response.status}`,
      }
    }

    const responseData = await response.json()

    return {
      success: true,
      message: 'Chamada API bem-sucedida',
      data: responseData,
    }
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao chamar API',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Send email via SMTP
 */
export async function sendEmail(
  integrationId: string,
  to: string | string[],
  subject: string,
  html: string,
  text?: string
): Promise<IntegrationExecutionResult> {
  try {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return {
        success: false,
        message: 'Integração não encontrada',
      }
    }

    if (integration.type !== 'email_smtp') {
      return {
        success: false,
        message: 'Integração não é do tipo Email SMTP',
      }
    }

    const config = integration.config as Record<string, unknown>
    const credentials = integration.credentials as Record<string, unknown>

    const fromName = config.fromName as string | undefined
    const fromEmail = config.fromEmail as string | undefined
    const host = credentials.host as string | undefined
    const port = credentials.port as number | undefined
    const user = credentials.user as string | undefined
    const pass = credentials.pass as string | undefined

    if (!host || !port || !user || !pass || !fromEmail) {
      return {
        success: false,
        message: 'Configuração SMTP incompleta',
      }
    }

    // In production, you would use nodemailer here
    // For now, we'll just simulate the email sending
    console.log('Sending email:', {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
      text,
    })

    return {
      success: true,
      message: 'Email enviado com sucesso (simulado)',
      data: {
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao enviar email',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Send WhatsApp message via Evolution API
 */
export async function sendWhatsAppMessage(
  integrationId: string,
  to: string,
  message: string
): Promise<IntegrationExecutionResult> {
  try {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return {
        success: false,
        message: 'Integração não encontrada',
      }
    }

    if (integration.type !== 'whatsapp') {
      return {
        success: false,
        message: 'Integração não é do tipo WhatsApp',
      }
    }

    const config = integration.config as Record<string, unknown>
    const credentials = integration.credentials as Record<string, unknown>
    const evolutionApiUrl = config.evolutionApiUrl as string | undefined
    const instanceName = config.instanceName as string | undefined
    const apiKey = credentials.apiKey as string | undefined

    if (!evolutionApiUrl || !instanceName || !apiKey) {
      return {
        success: false,
        message: 'Configuração WhatsApp incompleta',
      }
    }

    const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: to,
        text: message,
      }),
    })

    if (!response.ok) {
      return {
        success: false,
        message: `Erro ao enviar mensagem WhatsApp: ${response.status}`,
      }
    }

    const responseData = await response.json()

    return {
      success: true,
      message: 'Mensagem WhatsApp enviada com sucesso',
      data: responseData,
    }
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao enviar mensagem WhatsApp',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Execute integration action based on type
 */
export async function executeIntegrationAction(
  integrationId: string,
  action: string,
  params: Record<string, unknown>
): Promise<IntegrationExecutionResult> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  })

  if (!integration) {
    return {
      success: false,
      message: 'Integração não encontrada',
    }
  }

  switch (integration.type) {
    case 'webhook':
      return sendWebhook(integrationId, params)

    case 'api_rest':
      return callApiRest(
        integrationId,
        params.endpoint as string,
        params.method as string,
        params.body as Record<string, unknown>
      )

    case 'email_smtp':
      return sendEmail(
        integrationId,
        params.to as string | string[],
        params.subject as string,
        params.html as string,
        params.text as string | undefined
      )

    case 'whatsapp':
      return sendWhatsAppMessage(
        integrationId,
        params.to as string,
        params.message as string
      )

    default:
      return {
        success: false,
        message: `Tipo de integração não suportado: ${integration.type}`,
      }
  }
}
