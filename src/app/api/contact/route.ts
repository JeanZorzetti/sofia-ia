import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, company, phone, type, message, employees, useCase } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Nome, email e mensagem são obrigatórios' },
        { status: 400 }
      )
    }

    if (message.length < 20) {
      return NextResponse.json(
        { success: false, error: 'Mensagem muito curta (mínimo 20 caracteres)' },
        { status: 400 }
      )
    }

    const lead = await prisma.salesLead.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        type: type || 'general',
        message: message.trim(),
        employees: employees || null,
        useCase: useCase?.trim() || null,
        source: 'contato',
      },
    })

    return NextResponse.json({ success: true, data: { id: lead.id } })
  } catch (error) {
    console.error('[POST /api/contact]', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar mensagem' },
      { status: 500 }
    )
  }
}
