/**
 * Google Calendar AI Tools
 * Define as ferramentas de calendário para function calling (Groq/OpenRouter).
 * O agente IA decide quando chamar cada tool baseado no contexto da conversa.
 *
 * Tools:
 *  - verificar_disponibilidade: checa se horário está livre
 *  - criar_reuniao: cria evento com Google Meet
 *  - cancelar_reuniao: deleta evento por email do participante
 *  - reagendar_reuniao: atualiza horário do evento
 */

import type {
  checkAvailability,
  createCalendarEvent,
  deleteEventByEmail,
  updateEventByEmail,
} from '@/lib/google-calendar'

// ── Tool Definitions (OpenAI-compatible function calling format) ───────────────

export const calendarToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'verificar_disponibilidade',
      description:
        'Verifica se um horário está disponível no calendário antes de agendar uma reunião. Sempre verifique a disponibilidade antes de criar um evento.',
      parameters: {
        type: 'object',
        properties: {
          start: {
            type: 'string',
            description:
              'Data/hora de início no formato ISO 8601 com timezone, ex: 2024-10-18T14:30:00-03:00',
          },
          end: {
            type: 'string',
            description:
              'Data/hora de fim no formato ISO 8601 com timezone, ex: 2024-10-18T15:20:00-03:00 (50 minutos após o início)',
          },
        },
        required: ['start', 'end'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'criar_reuniao',
      description:
        'Cria uma reunião no Google Calendar com link Google Meet. Chame após confirmar disponibilidade e coletar nome, email e data do usuário. A duração padrão é 50 minutos.',
      parameters: {
        type: 'object',
        properties: {
          nome: {
            type: 'string',
            description: 'Nome completo do participante',
          },
          email: {
            type: 'string',
            description: 'Email do participante para enviar o convite',
          },
          start: {
            type: 'string',
            description:
              'Data/hora de início ISO 8601 com timezone, ex: 2024-10-18T14:30:00-03:00',
          },
          end: {
            type: 'string',
            description:
              'Data/hora de fim ISO 8601 (início + 50 minutos), ex: 2024-10-18T15:20:00-03:00',
          },
        },
        required: ['nome', 'email', 'start', 'end'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancelar_reuniao',
      description:
        'Cancela uma reunião existente. Chame após o usuário confirmar que quer cancelar e informar o email usado no agendamento.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Email do participante usado no agendamento original',
          },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reagendar_reuniao',
      description:
        'Reagenda uma reunião para uma nova data/hora. Chame após o usuário informar o email e a nova data.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Email do participante usado no agendamento original',
          },
          start: {
            type: 'string',
            description: 'Nova data/hora de início ISO 8601 com timezone',
          },
          end: {
            type: 'string',
            description: 'Nova data/hora de fim ISO 8601 (início + 50 minutos)',
          },
        },
        required: ['email', 'start', 'end'],
      },
    },
  },
] as const

// ── Tool Executor ─────────────────────────────────────────────────────────────

export async function executeCalendarTool(
  toolName: string,
  args: Record<string, string>,
  calendarUserId: string,
  remoteJid?: string
): Promise<string> {
  const {
    checkAvailability: check,
    createCalendarEvent: create,
    deleteEventByEmail: del,
    updateEventByEmail: update,
  } = await import('@/lib/google-calendar')

  try {
    if (toolName === 'verificar_disponibilidade') {
      const available = await check(calendarUserId, args.start, args.end)
      if (available) {
        return JSON.stringify({ available: true, message: 'Horário disponível para agendamento.' })
      } else {
        return JSON.stringify({ available: false, message: 'Horário indisponível. Solicite outro horário ao usuário.' })
      }
    }

    if (toolName === 'criar_reuniao') {
      const event = await create(calendarUserId, {
        nome: args.nome,
        email: args.email,
        start: args.start,
        end: args.end,
        remoteJid,
      })
      const dataFormatada = formatDatePTBR(event.start.dateTime)
      return JSON.stringify({
        success: true,
        eventId: event.id,
        hangoutLink: event.hangoutLink,
        message: `Reunião criada para ${dataFormatada}. Link Google Meet: ${event.hangoutLink || 'não disponível'}`,
      })
    }

    if (toolName === 'cancelar_reuniao') {
      const result = await del(calendarUserId, args.email)
      if (result.deleted) {
        return JSON.stringify({ success: true, message: 'Reunião cancelada com sucesso.' })
      } else {
        return JSON.stringify({ success: false, message: `Nenhuma reunião encontrada para ${args.email}.` })
      }
    }

    if (toolName === 'reagendar_reuniao') {
      const event = await update(calendarUserId, args.email, args.start, args.end)
      const dataFormatada = formatDatePTBR(event.start.dateTime)
      return JSON.stringify({
        success: true,
        hangoutLink: event.hangoutLink,
        message: `Reunião reagendada para ${dataFormatada}. Link: ${event.hangoutLink || 'mantido'}`,
      })
    }

    return JSON.stringify({ error: `Tool desconhecida: ${toolName}` })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error(`[calendar-tools] ${toolName} error:`, error)
    return JSON.stringify({ error: msg })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDatePTBR(dateTime: string): string {
  try {
    return new Date(dateTime).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  } catch {
    return dateTime
  }
}
