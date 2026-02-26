/**
 * Cron: Weekly Digest
 * Runs every Monday at 08:00 BRT (11:00 UTC).
 *
 * Sends a summary email to active users (logged in last 14 days) with:
 * - Executions run last week
 * - Agents count
 * - Quick action CTA
 *
 * Protected by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'

function buildDigestEmail(firstName: string, stats: {
  executionsThisWeek: number
  totalAgents: number
  totalOrchestrations: number
}): string {
  const hasActivity = stats.executionsThisWeek > 0

  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  body{margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .w{max-width:600px;margin:0 auto;background:#1e293b;border-radius:12px;overflow:hidden;}
  .h{background:linear-gradient(135deg,#6d28d9,#3b82f6);padding:24px 32px;display:flex;align-items:center;justify-content:space-between;}
  .h h1{color:#fff;font-size:18px;font-weight:700;margin:0;}
  .h span{color:rgba(255,255,255,0.7);font-size:13px;}
  .b{padding:28px 32px;}
  .b h2{color:#f1f5f9;font-size:17px;margin:0 0 8px;}
  .b p{color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 14px;}
  .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:20px 0;}
  .stat{background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid rgba(255,255,255,0.06);}
  .stat-num{color:#fff;font-size:24px;font-weight:700;display:block;}
  .stat-label{color:#64748b;font-size:11px;margin-top:4px;display:block;}
  .cta{text-align:center;margin:24px 0 0;}
  .cta a{display:inline-block;background:linear-gradient(135deg,#6d28d9,#3b82f6);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;}
  .ft{padding:20px 32px;text-align:center;border-top:1px solid #334155;}
  .ft p{color:#475569;font-size:12px;margin:0;}
  .ft a{color:#6d28d9;text-decoration:none;}
</style></head><body>
<div style="padding:24px 16px;">
<div class="w">
<div class="h">
  <h1>Sofia IA</h1>
  <span>Resumo semanal</span>
</div>
<div class="b">
  <h2>Oi, ${firstName}! Aqui está seu resumo da semana</h2>
  ${hasActivity
    ? `<p>Você executou <strong>${stats.executionsThisWeek} orquestração${stats.executionsThisWeek !== 1 ? 'ões' : ''}</strong> nos últimos 7 dias. Continue assim!</p>`
    : `<p>Você não executou nenhuma orquestração esta semana. Que tal experimentar um dos templates prontos?</p>`
  }

  <div class="stats">
    <div class="stat">
      <span class="stat-num">${stats.executionsThisWeek}</span>
      <span class="stat-label">Execuções esta semana</span>
    </div>
    <div class="stat">
      <span class="stat-num">${stats.totalAgents}</span>
      <span class="stat-label">Agentes criados</span>
    </div>
    <div class="stat">
      <span class="stat-num">${stats.totalOrchestrations}</span>
      <span class="stat-label">Orquestrações</span>
    </div>
  </div>

  ${!hasActivity
    ? `<p style="font-size:13px;color:#64748b;">Dica: acesse o marketplace para encontrar templates prontos e executar em segundos.</p>`
    : ''
  }

  <div class="cta">
    <a href="${APP_URL}/dashboard">${hasActivity ? 'Continuar trabalhando →' : 'Voltar e explorar templates →'}</a>
  </div>
</div>
<div class="ft">
  <p>Sofia IA · <a href="${APP_URL}">sofiaia.roilabs.com.br</a> · <a href="${APP_URL}/dashboard/settings">Cancelar emails</a></p>
</div>
</div></div></body></html>`
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const d14 = new Date(now); d14.setDate(d14.getDate() - 14)
  const d7 = new Date(now); d7.setDate(d7.getDate() - 7)

  let sent = 0
  let skipped = 0

  // Active users = logged in last 14 days
  const users = await prisma.user.findMany({
    where: {
      status: 'active',
      lastLogin: { gte: d14 },
    },
    select: { id: true, email: true, name: true },
    take: 500,
  })

  for (const user of users) {
    // Avoid sending more than once per week (check last 6 days)
    const recentDigest = await prisma.analyticsEvent.count({
      where: {
        userId: user.id,
        event: 'weekly_digest_sent',
        createdAt: { gte: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) },
      },
    })
    if (recentDigest > 0) { skipped++; continue }

    // Gather user stats
    const [executionsThisWeek, totalAgents, totalOrchestrations] = await Promise.all([
      // Executions this week for this user's orchestrations
      prisma.orchestrationExecution.count({
        where: {
          createdAt: { gte: d7 },
          orchestration: { createdBy: user.id },
        },
      }),
      prisma.agent.count({ where: { createdBy: user.id } }),
      prisma.agentOrchestration.count({ where: { createdBy: user.id } }),
    ])

    const firstName = user.name.split(' ')[0]

    await sendEmail({
      to: user.email,
      subject: `${firstName}, seu resumo da semana na Sofia IA`,
      html: buildDigestEmail(firstName, { executionsThisWeek, totalAgents, totalOrchestrations }),
    })

    await trackEvent('weekly_digest_sent', user.id)
    sent++
  }

  return NextResponse.json({ success: true, processed: users.length, sent, skipped, runAt: now.toISOString() })
}
