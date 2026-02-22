import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crm/lead
 *
 * Proxy público (sem auth) que cria um contato no Sirius CRM.
 * Usado pelo formulário de contato da landing page.
 *
 * Env vars necessárias:
 *   SIRIUS_CRM_API_KEY   — API key do Sirius CRM (Bearer token)
 *   SIRIUS_CRM_URL       — URL base do CRM (default: https://sirius.roilabs.com.br)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, company, subject, message } = body

    // Validação básica
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nome obrigatório (mínimo 2 caracteres).' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    const apiKey = process.env.SIRIUS_CRM_API_KEY
    const crmBase = process.env.SIRIUS_CRM_URL ?? 'https://sirius.roilabs.com.br'

    if (!apiKey) {
      console.error('[crm/lead] SIRIUS_CRM_API_KEY não configurada')
      return NextResponse.json({ error: 'Configuração interna ausente. Tente novamente em breve.' }, { status: 500 })
    }

    // Monta payload para o CRM — enriquece company com subject/message se existirem
    const noteContext = [
      subject ? `Assunto: ${subject}` : null,
      message ? `Mensagem: ${message}` : null,
    ].filter(Boolean).join(' | ')

    const payload: Record<string, string> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
    }
    if (phone) payload.phone = phone.trim()
    if (company) payload.company = company.trim()
    // Inclui contexto adicional se o CRM aceitar — campo extra ignorado se não reconhecido
    if (noteContext) payload.notes = noteContext

    const crmRes = await fetch(`${crmBase}/api/v1/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!crmRes.ok) {
      const errorText = await crmRes.text().catch(() => '')
      console.error(`[crm/lead] CRM retornou ${crmRes.status}:`, errorText)
      return NextResponse.json(
        { error: 'Não foi possível enviar sua mensagem. Tente novamente.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[crm/lead] Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente em breve.' }, { status: 500 })
  }
}
