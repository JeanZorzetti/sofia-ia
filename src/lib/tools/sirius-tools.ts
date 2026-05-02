/**
 * Sirius CRM Tools — Tools para agentes Polaris IA operarem o Sirius via API v1.
 *
 * Cada tool mapeia para um endpoint da API v1 do Sirius CRM.
 * Auth via Bearer token (API key gerada no Sirius por organização).
 *
 * Env vars necessárias:
 *   SIRIUS_API_URL  — Base URL (ex: https://sirius.roilabs.com.br)
 *   SIRIUS_API_KEY  — API key da organização no Sirius
 */

// ── HTTP client ──────────────────────────────────────────────────────────────

function getSiriusConfig() {
  const url = process.env.SIRIUS_API_URL
  const key = process.env.SIRIUS_API_KEY
  if (!url || !key) {
    throw new Error('[SiriusTools] SIRIUS_API_URL and SIRIUS_API_KEY must be set')
  }
  return { url: url.replace(/\/$/, ''), key }
}

async function siriusRequest(method: string, path: string, body?: unknown) {
  const { url, key } = getSiriusConfig()

  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(
      `[SiriusTools] ${method} ${path} returned ${res.status}: ${JSON.stringify(data)}`
    )
  }

  return data
}

// ── OpenAI-format tool definitions (for Groq / OpenRouter function calling) ──

export const siriusToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'sirius_get_contact_context',
      description:
        'Busca contexto completo de um contato no Sirius CRM: deals, notas, mensagens WhatsApp, tags, atividades.',
      parameters: {
        type: 'object',
        properties: {
          contactId: {
            type: 'string',
            description: 'UUID do contato no Sirius',
          },
        },
        required: ['contactId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sirius_get_deal_context',
      description:
        'Busca contexto completo de um deal no Sirius CRM: pipeline, estágios, contato, notas, atividades, mensagens WhatsApp, ações de agentes.',
      parameters: {
        type: 'object',
        properties: {
          dealId: {
            type: 'string',
            description: 'UUID do deal no Sirius',
          },
        },
        required: ['dealId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sirius_update_deal_stage',
      description:
        'Move um deal para outro estágio do pipeline no Sirius CRM. Registra que a movimentação foi feita por agente.',
      parameters: {
        type: 'object',
        properties: {
          dealId: {
            type: 'string',
            description: 'UUID do deal',
          },
          stageId: {
            type: 'string',
            description: 'UUID do estágio de destino',
          },
          reason: {
            type: 'string',
            description: 'Motivo da movimentação (para auditoria)',
          },
        },
        required: ['dealId', 'stageId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sirius_add_deal_note',
      description:
        'Adiciona uma nota em um deal no Sirius CRM. Usado para registrar análises, observações e raciocínio do agente.',
      parameters: {
        type: 'object',
        properties: {
          dealId: {
            type: 'string',
            description: 'UUID do deal',
          },
          content: {
            type: 'string',
            description: 'Conteúdo da nota',
          },
          authorName: {
            type: 'string',
            description: 'Nome do agente que criou a nota (ex: "LeadQualifier")',
          },
        },
        required: ['dealId', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sirius_send_whatsapp',
      description:
        'Envia mensagem WhatsApp para um número via conexão Evolution API configurada no Sirius CRM.',
      parameters: {
        type: 'object',
        properties: {
          connectionId: {
            type: 'string',
            description: 'UUID da conexão WhatsApp (Evolution API instance) no Sirius',
          },
          phone: {
            type: 'string',
            description: 'Número de telefone com DDD e código do país (ex: 5562999999999)',
          },
          message: {
            type: 'string',
            description: 'Texto da mensagem a enviar',
          },
        },
        required: ['connectionId', 'phone', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sirius_check_calendar',
      description:
        'Verifica slots disponíveis no calendário da organização no Sirius CRM. Retorna horários livres para agendamento.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Data início no formato ISO 8601 (ex: 2026-03-28)',
          },
          endDate: {
            type: 'string',
            description: 'Data fim no formato ISO 8601 (ex: 2026-04-04)',
          },
          durationMinutes: {
            type: 'number',
            description: 'Duração do slot em minutos (padrão: 30)',
          },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sirius_book_meeting',
      description:
        'Agenda uma reunião no calendário do Sirius CRM, opcionalmente vinculada a um deal.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título da reunião',
          },
          startTime: {
            type: 'string',
            description: 'Horário de início ISO 8601 (ex: 2026-03-28T14:00:00Z)',
          },
          endTime: {
            type: 'string',
            description: 'Horário de término ISO 8601 (ex: 2026-03-28T14:30:00Z)',
          },
          dealId: {
            type: 'string',
            description: 'UUID do deal relacionado (opcional)',
          },
          description: {
            type: 'string',
            description: 'Descrição/pauta da reunião (opcional)',
          },
        },
        required: ['title', 'startTime', 'endTime'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'sirius_log_action',
      description:
        'Registra uma ação do agente no feed de auditoria do Sirius CRM (/IA). Toda ação autônoma DEVE ser logada.',
      parameters: {
        type: 'object',
        properties: {
          agentName: {
            type: 'string',
            description:
              'Nome do agente (ex: LeadQualifier, FollowUpCoordinator, DealStageAnalyzer, MeetingScheduler, ContactEnricher)',
          },
          actionType: {
            type: 'string',
            description:
              'Tipo da ação (ex: QUALIFY_LEAD, SEND_WHATSAPP, MOVE_DEAL, CREATE_NOTE, BOOK_MEETING, ENRICH_CONTACT)',
          },
          entityType: {
            type: 'string',
            description: 'Tipo da entidade afetada (ex: Deal, Contact, CalendarEvent)',
          },
          entityId: {
            type: 'string',
            description: 'UUID da entidade afetada',
          },
          reasoning: {
            type: 'string',
            description:
              'Raciocínio completo do agente explicando por que tomou essa decisão. Visível para o humano no feed /IA.',
          },
          confidence: {
            type: 'number',
            description:
              'Nível de confiança de 0 a 1. Ações com confiança < 0.7 requerem aprovação humana antes de executar.',
          },
          input: {
            type: 'object',
            description: 'Dados de entrada que o agente usou para tomar a decisão',
          },
          output: {
            type: 'object',
            description: 'Resultado da ação executada (opcional, preenchido após execução)',
          },
        },
        required: [
          'agentName',
          'actionType',
          'entityType',
          'entityId',
          'reasoning',
          'confidence',
          'input',
        ],
      },
    },
  },
]

// ── Tool executor ────────────────────────────────────────────────────────────

export const siriusTools = {
  definitions: siriusToolDefinitions,

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    try {
      switch (name) {
        case 'sirius_get_contact_context':
          return await siriusRequest(
            'GET',
            `/api/v1/contacts/${args.contactId}/context`
          )

        case 'sirius_get_deal_context':
          return await siriusRequest(
            'GET',
            `/api/v1/deals/${args.dealId}/context`
          )

        case 'sirius_update_deal_stage':
          return await siriusRequest(
            'PATCH',
            `/api/v1/deals/${args.dealId}/stage`,
            {
              stageId: args.stageId,
              movedBy: 'agent',
              reason: args.reason,
            }
          )

        case 'sirius_add_deal_note':
          return await siriusRequest(
            'POST',
            `/api/v1/deals/${args.dealId}/notes`,
            {
              content: args.content,
              authorName: args.authorName,
            }
          )

        case 'sirius_send_whatsapp':
          return await siriusRequest('POST', '/api/v1/whatsapp/send', {
            connectionId: args.connectionId,
            phone: args.phone,
            message: args.message,
          })

        case 'sirius_check_calendar': {
          const qs = new URLSearchParams({
            startDate: String(args.startDate),
            endDate: String(args.endDate),
          })
          if (args.durationMinutes) {
            qs.set('durationMinutes', String(args.durationMinutes))
          }
          return await siriusRequest(
            'GET',
            `/api/v1/calendar/availability?${qs.toString()}`
          )
        }

        case 'sirius_book_meeting':
          return await siriusRequest('POST', '/api/v1/calendar/book', {
            title: args.title,
            startTime: args.startTime,
            endTime: args.endTime,
            dealId: args.dealId,
            description: args.description,
          })

        case 'sirius_log_action':
          return await siriusRequest('POST', '/api/v1/agents/actions', {
            agentName: args.agentName,
            actionType: args.actionType,
            entityType: args.entityType,
            entityId: args.entityId,
            reasoning: args.reasoning,
            confidence: args.confidence,
            input: args.input,
            output: args.output,
          })

        default:
          return { error: `Unknown Sirius tool: ${name}` }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[SiriusTools] Error executing ${name}:`, message)
      return { error: message }
    }
  },

  /**
   * Check if a tool name belongs to Sirius tools
   */
  isSupported(name: string): boolean {
    return siriusToolDefinitions.some((t) => t.function.name === name)
  },
}
