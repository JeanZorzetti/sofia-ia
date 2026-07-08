// 011-byos — /api/settings/claude-token. Escopada ao próprio usuário via
// getAuthFromRequest() → auth.id (zero IDOR: não há variante por id). O valor em
// claro NUNCA aparece em nenhuma resposta — GET/PUT devolvem só máscara + timestamps.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@/lib/auth'
import { logAudit, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit'
import {
  normalizeClaudeToken,
  isValidClaudeTokenFormat,
  verifyClaudeToken,
  saveClaudeToken,
  getClaudeTokenMetadata,
  deleteClaudeToken,
} from '@/lib/settings/claude-token-service'

const putSchema = z.object({ token: z.string().min(1) })

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return unauthorized()
  return NextResponse.json(await getClaudeTokenMetadata(auth.id))
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return unauthorized()

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    /* invalid JSON → handled as invalid_format below */
  }
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_format', message: 'Informe o token.' }, { status: 400 })
  }

  // Format gate BEFORE any network call (nothing verified/saved on a malformed token).
  const token = normalizeClaudeToken(parsed.data.token)
  if (!isValidClaudeTokenFormat(token)) {
    return NextResponse.json(
      {
        error: 'invalid_format',
        message: 'Formato inválido. O token começa com `sk-ant-oat` e não tem espaços. Gere com `claude setup-token`.',
      },
      { status: 400 },
    )
  }

  // Active verification: only a token that works AGORA é persistido (rotação atômica —
  // em falha, o token anterior permanece intacto porque o write só ocorre após o verify).
  const verdict = await verifyClaudeToken(token)
  if (verdict === 'token_rejected') {
    return NextResponse.json(
      { error: 'token_rejected', message: 'O token não foi aceito pelo Claude. Gere um novo com `claude setup-token` e cole aqui.' },
      { status: 422 },
    )
  }
  if (verdict === 'token_rate_limited') {
    return NextResponse.json(
      { error: 'token_rate_limited', message: 'Token válido, mas sua assinatura Claude está no limite agora. Tente novamente após o reset da sua janela de uso.' },
      { status: 422 },
    )
  }
  if (verdict === 'verification_unavailable') {
    return NextResponse.json(
      { error: 'verification_unavailable', message: 'Não foi possível verificar agora. Tente novamente.' },
      { status: 503 },
    )
  }

  const { rotated, mask } = await saveClaudeToken(auth.id, token)
  await logAudit(
    auth.id,
    rotated ? 'claude_token.rotated' : 'claude_token.created',
    'claude_token',
    undefined,
    { mask }, // nunca o valor — só a máscara nova
    undefined,
    getIpFromRequest(request),
    getUserAgentFromRequest(request),
  )
  return NextResponse.json(await getClaudeTokenMetadata(auth.id))
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return unauthorized()
  const existed = await deleteClaudeToken(auth.id)
  if (!existed) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  await logAudit(
    auth.id,
    'claude_token.deleted',
    'claude_token',
    undefined,
    undefined,
    undefined,
    getIpFromRequest(request),
    getUserAgentFromRequest(request),
  )
  return NextResponse.json({ configured: false })
}
