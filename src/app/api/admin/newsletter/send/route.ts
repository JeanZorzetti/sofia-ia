import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { buildNewsletterHtml } from '@/lib/newsletter-template'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/newsletter/send
 * Envia newsletter para a lista de assinantes via Resend.
 * Apenas admin.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { subject, headline, preheader, bodyHtml, ctaText, ctaUrl, edition, to } = body

  if (!subject || !headline || !bodyHtml) {
    return NextResponse.json(
      { success: false, error: 'subject, headline e bodyHtml são obrigatórios' },
      { status: 400 }
    )
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return NextResponse.json({ success: false, error: 'RESEND_API_KEY não configurada' }, { status: 500 })
  }

  const html = buildNewsletterHtml({ subject, headline, preheader, body: bodyHtml, ctaText, ctaUrl, edition })

  // Destinatários: array de emails ou padrão para lista de broadcast
  const recipients: string[] = Array.isArray(to) && to.length > 0
    ? to
    : [process.env.NEWSLETTER_FROM || 'newsletter@roilabs.com.br']

  const results = await Promise.allSettled(
    recipients.map(email =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Sofia AI <${process.env.NEWSLETTER_FROM || 'newsletter@roilabs.com.br'}>`,
          to: [email],
          subject,
          html,
        }),
      }).then(r => r.json())
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ success: true, data: { sent, failed, total: recipients.length } })
}
