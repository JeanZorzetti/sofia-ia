import { after } from 'next/server'
import { createHash } from 'node:crypto'

export type RoihubOrigem = 'polaris:contato' | 'polaris:peca-seu-site' | 'polaris:early-access'

type RoihubLeadInput = {
  nome: string
  email: string
  telefone?: string | null
  origem: RoihubOrigem
  metadata?: Record<string, unknown>
}

// ponytail: bucket de 2min agrupa reenvios técnicos (retry) no mesmo external_id,
// deduplicados pelo UNIQUE(external_id) do roihub. Reenvio intencional >2min vira
// card novo — aceitável no volume de leads de marketing. Se virar problema real,
// trocar por id gerado no cliente (crypto.randomUUID() no mount do formulário).
export function externalId(email: string, origem: string): string {
  const bucket = Math.floor(Date.now() / 120_000)
  return createHash('sha256').update(`${email}|${origem}|${bucket}`).digest('hex')
}

/**
 * Envia um lead do Polaris ao CRM do roihub (POST /api/crm/leads).
 * Best-effort (FR-006): a chamada roda em after(), depois da resposta já
 * enviada ao visitante, e nunca lança — falha vira só log de servidor.
 */
export function sendLeadToRoihub(input: RoihubLeadInput): void {
  after(async () => {
    try {
      const baseUrl = process.env.ROIHUB_CRM_URL
      const secret = process.env.ROIHUB_CRM_SECRET
      if (!baseUrl || !secret) {
        console.error('[roihub-crm] ROIHUB_CRM_URL/ROIHUB_CRM_SECRET ausente')
        return
      }

      const email = input.email.trim().toLowerCase()
      const payload = {
        external_id: externalId(email, input.origem),
        pipeline: 'polaris',
        nome: input.nome,
        email,
        telefone: input.telefone || undefined,
        origem: input.origem,
        metadata: input.metadata ?? {},
      }

      const res = await fetch(`${baseUrl}/api/crm/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        console.error(`[roihub-crm] roihub retornou ${res.status}`)
      }
    } catch (err) {
      console.error('[roihub-crm] falha ao enviar lead:', err)
    }
  })
}
