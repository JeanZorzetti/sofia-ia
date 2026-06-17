/**
 * GET /api/cron/sheets-import
 * Importa leads de uma planilha Google Sheets e envia saudação via WhatsApp.
 *
 * Formato esperado da planilha (a partir da linha 2, linha 1 = cabeçalho):
 *   A: telefone (obrigatório)
 *   B: nome
 *   C: empresa
 *   D: notas / parceiro
 *   E: status (cron escreve "IMPORTADO" após processar)
 *
 * Configure por agente via POST /api/agents/[id]/sheets-import
 * Acionado pelo cron externo: 0 9 1 * *  (mensal) ou sob demanda.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sheetsRead, sheetsWrite } from '@/lib/integrations/google-sheets'
import { resolveAccountByAgent } from '@/lib/whatsapp-cloud-service'
import { sendWhatsAppTemplate } from '@/lib/whatsapp-templates'
import { verifyCronAuth } from '@/lib/authz'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Outreach a leads importados é business-initiated (fora da janela de 24h) → template HSM.
const GREETING_TEMPLATE = process.env.WHATSAPP_GREETING_TEMPLATE || 'greeting_pt'
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'pt_BR'

type ImportResult = { phone: string; name: string; action: string }

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const imported: ImportResult[] = []

  try {
    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
      select: { id: true, config: true },
    })

    for (const agent of agents) {
      const config = (agent.config || {}) as Record<string, unknown>
      if (!config.sheetsImportEnabled) continue

      const spreadsheetId = config.sheetsImportSpreadsheetId as string | undefined
      const sheetName = (config.sheetsImportSheetName as string | undefined) || 'Sheet1'
      const userId = config.sheetsImportUserId as string | undefined
      if (!spreadsheetId || !userId) continue

      const account = await resolveAccountByAgent(agent.id)
      if (!account) continue

      // Ler planilha — A=telefone, B=nome, C=empresa, D=notas, E=status
      let rows: unknown[][]
      try {
        const result = await sheetsRead(userId, spreadsheetId, `${sheetName}!A2:E1000`)
        rows = result.values
      } catch (err) {
        console.error('[sheets-import] Erro ao ler planilha:', err)
        continue
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as string[]
        const phone = row[0]?.toString().trim()
        if (!phone) continue

        // Pular linhas já processadas
        const rowStatus = row[4]?.toString().trim()
        if (rowStatus === 'IMPORTADO') continue

        const nome = row[1]?.toString().trim() || phone
        const empresa = row[2]?.toString().trim() || ''
        const notas = row[3]?.toString().trim() || ''

        // Verificar/criar lead
        let lead = await prisma.lead.findUnique({ where: { telefone: phone } })
        let isNew = false
        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              nome,
              telefone: phone,
              fonte: 'planilha',
              metadata: { empresa, notas, importadoPor: agent.id },
            },
          })
          isNew = true
        }

        // Enviar saudação via template HSM (cold outreach — fora da janela de 24h)
        const firstName = nome.split(' ')[0] || 'tudo bem'
        try {
          const r = await sendWhatsAppTemplate(account, phone, GREETING_TEMPLATE, TEMPLATE_LANG, [firstName])
          if (!r.success) {
            imported.push({ phone, name: nome, action: 'send_error' })
            continue
          }
          imported.push({ phone, name: nome, action: isNew ? 'created_and_sent' : 'existing_sent' })
        } catch (err) {
          console.error('[sheets-import] Erro ao enviar WhatsApp:', err)
          imported.push({ phone, name: nome, action: 'send_error' })
          continue
        }

        // Marcar linha como processada (coluna E)
        const sheetRow = i + 2 // +1 para índice 1-based, +1 para pular cabeçalho
        try {
          await sheetsWrite(userId, spreadsheetId, `${sheetName}!E${sheetRow}`, [['IMPORTADO']])
        } catch (err) {
          console.error('[sheets-import] Erro ao marcar linha:', err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      count: imported.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno'
    console.error('[sheets-import] Fatal:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
