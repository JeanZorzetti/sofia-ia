import { NextRequest, NextResponse } from 'next/server'
import { sendLeadToRoihub, type RoihubOrigem } from '@/lib/roihub-crm'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crm/lead
 *
 * Proxy público (sem auth) usado pelo intake "peça seu site" (IntakeForm.tsx)
 * e pela inscrição de early access. Cria um lead no CRM do roihub, pipeline
 * "polaris", best-effort (FR-006) — falha aqui nunca vira erro para o visitante.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, company, subject, message, siteType, currentSite, goal, website } = body

    // Honeypot: campo oculto só um bot preenche. Responde 200 sem chegar ao CRM.
    if (typeof website === 'string' && website.trim().length > 0) {
      return NextResponse.json({ success: true })
    }

    // Validação básica
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nome obrigatório (mínimo 2 caracteres).' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    const origem: RoihubOrigem = subject === 'early_access' ? 'polaris:early-access' : 'polaris:peca-seu-site'
    const metadata =
      origem === 'polaris:early-access'
        ? { company, message }
        : { company, siteType, currentSite, goal }

    sendLeadToRoihub({
      nome: name.trim(),
      email,
      telefone: phone || null,
      origem,
      metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[crm/lead] Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente em breve.' }, { status: 500 })
  }
}
