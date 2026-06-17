/**
 * Team conversation mode (Fase 3 — Subordinação ao /teams).
 *
 * Lets a Conversation/WhatsApp channel be answered by a *Team* instead of a single
 * agent. The team LEAD replies and may consult specialist members **within the same
 * response cycle**, via a provider-agnostic TEXT protocol:
 *
 *     DELEGATE: <agentId> | <pergunta>
 *
 * The lead emits those lines; we parse them, run the targeted specialists (scoped to
 * the team roster), feed their answers back to the lead, and ask for the final reply.
 *
 * This is the *light* path — it reuses `chatWithAgent` + `delegateToAgent` and does
 * NOT touch the heavy async team-run engine. The coordinator (`runTeam`) is not
 * involved. Works on any provider, including the one-shot Claude CLI (subscription),
 * which has no native function-calling.
 */
import { prisma } from '@/lib/prisma'

interface ChatMsg {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface TeamConversationResult {
  message: string
  model: string
  usage: unknown
  confidence: number
  respondedBy?: { agentId: string; name: string; role: string }
  delegatedTo?: Array<{ agentId: string; name: string }>
}

/** Max times the lead can go back to specialists before being forced to answer. */
const MAX_DELEGATION_ROUNDS = 2

/** Parse `DELEGATE: <agentId> | <message>` lines out of the lead's text response. */
function parseDelegateDirectives(text: string): Array<{ agentId: string; message: string }> {
  const out: Array<{ agentId: string; message: string }> = []
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*DELEGATE:\s*([^|]+?)\s*\|\s*(.+?)\s*$/i)
    if (m) out.push({ agentId: m[1].trim(), message: m[2].trim() })
  }
  return out
}

/** Remove any DELEGATE lines so they never leak to the customer-facing reply. */
function stripDelegateLines(text: string): string {
  return text
    .split('\n')
    .filter((l) => !/^\s*DELEGATE:\s*[^|]+\|/i.test(l))
    .join('\n')
    .trim()
}

/**
 * Answers a conversation with a Team in conversation mode.
 * Returns null when the team is missing/malformed (no lead) so the caller can
 * fall back to the single-agent path.
 */
export async function answerConversationWithTeam(
  teamId: string,
  messages: ChatMsg[],
  leadContext: Record<string, unknown>,
  options?: { model?: string | null; effort?: string | null; useVectorSearch?: boolean },
): Promise<TeamConversationResult | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: { agent: { select: { id: true, name: true, status: true, description: true } } },
        orderBy: { position: 'asc' },
      },
    },
  })
  if (!team) return null

  const leadMember = team.members.find((m) => m.role === 'lead')
  if (!leadMember) return null // malformed roster → caller falls back to single-agent

  // Delegatable specialists = active workers/reviewer (everyone except the lead).
  const specialists = team.members.filter((m) => m.role !== 'lead' && m.agent.status === 'active')
  const rosterById = new Map(specialists.map((m) => [m.agentId, m]))
  const roster = specialists.map((m) => ({
    agentId: m.agentId,
    name: m.agent.name,
    role: m.role,
    description: m.agent.description ?? undefined,
  }))

  const userId = team.createdBy

  // Per-member model/effort overrides (e.g. lead pinned to claude-code-cli for the
  // subscription billing path). `chatWithAgent` honors options.model/effort.
  const leadOpts = {
    ...options,
    model: leadMember.model ?? options?.model ?? null,
    effort: leadMember.effort ?? options?.effort ?? null,
  }

  const { chatWithAgent } = await import('@/lib/ai/groq')
  const { delegateToAgent } = await import('@/lib/ai/delegation')

  let convo: ChatMsg[] = [...messages]
  const delegatedTo: Array<{ agentId: string; name: string }> = []
  let final: TeamConversationResult | null = null

  for (let round = 0; round <= MAX_DELEGATION_ROUNDS; round++) {
    const leadCtx = { ...leadContext, userId, teamDelegation: { roster, depth: 0 } }
    const resp = await chatWithAgent(leadMember.agentId, convo, leadCtx, leadOpts)
    const text = resp.message || ''

    // Only honor delegations targeting the team roster (scope enforcement).
    const directives = parseDelegateDirectives(text).filter((d) => rosterById.has(d.agentId))

    if (directives.length === 0 || round === MAX_DELEGATION_ROUNDS) {
      final = {
        message: stripDelegateLines(text) || text,
        model: resp.model,
        usage: resp.usage,
        confidence: resp.confidence ?? 0.9,
      }
      break
    }

    // Run the targeted specialists (reuses delegateToAgent → logs AgentDelegation,
    // anti-loop depth guard, runs the specialist agent via chatWithAgent).
    const results: string[] = []
    for (const d of directives) {
      const member = rosterById.get(d.agentId)!
      const answer = await delegateToAgent(leadMember.agentId, d.agentId, d.message, userId, 0)
      delegatedTo.push({ agentId: d.agentId, name: member.agent.name })
      results.push(`Especialista ${member.agent.name}: ${answer}`)
    }

    // Feed the specialists' answers back and ask the lead for the final reply.
    convo = [
      ...convo,
      { role: 'assistant', content: stripDelegateLines(text) || '(consultando especialistas internamente)' },
      {
        role: 'user',
        content: `Respostas dos especialistas (uso interno):\n${results.join('\n\n')}\n\nAgora escreva a resposta final ao cliente. Não mencione a consulta interna nem os especialistas.`,
      },
    ]
  }

  return {
    ...final!,
    respondedBy: { agentId: leadMember.agentId, name: leadMember.agent.name, role: leadMember.role },
    delegatedTo: delegatedTo.length ? delegatedTo : undefined,
  }
}
