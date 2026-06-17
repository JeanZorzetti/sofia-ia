import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { runEmbeddedSignup } from '@/lib/whatsapp-onboarding'

/**
 * POST /api/whatsapp/connect
 * Conclui o Embedded Signup: recebe { code, wabaId, phoneNumberId } do client,
 * troca o code por token, registra o número, assina o webhook e grava a
 * WhatsAppAccount (token criptografado) do usuário autenticado.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { code?: string; wabaId?: string; phoneNumberId?: string; agentId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
  }

  const { code, wabaId, phoneNumberId, agentId } = body
  if (!code || !wabaId || !phoneNumberId) {
    return NextResponse.json(
      { success: false, error: 'code, wabaId e phoneNumberId são obrigatórios' },
      { status: 400 }
    )
  }

  try {
    const result = await runEmbeddedSignup(code, wabaId, phoneNumberId)

    const account = await prisma.whatsAppAccount.upsert({
      where: { phoneNumberId },
      create: {
        userId: user.id,
        agentId: agentId || null,
        wabaId,
        phoneNumberId,
        displayPhoneNumber: result.displayPhoneNumber,
        verifiedName: result.verifiedName,
        accessToken: encrypt(result.accessToken),
        status: 'connected',
      },
      update: {
        userId: user.id,
        agentId: agentId || null,
        wabaId,
        displayPhoneNumber: result.displayPhoneNumber,
        verifiedName: result.verifiedName,
        accessToken: encrypt(result.accessToken),
        status: 'connected',
      },
      select: {
        id: true,
        phoneNumberId: true,
        displayPhoneNumber: true,
        verifiedName: true,
        status: true,
        agentId: true,
      },
    })

    return NextResponse.json({ success: true, account })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro no onboarding'
    console.error('[WA Connect] Erro:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
