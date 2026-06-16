// Pure roster definition for the "Planejamento de Campanha Threads" Team (SP6a).
// Reuses EXISTING Threads agents (with their plugins/skills/MCP) as workers/reviewer;
// the lead is a fresh synthetic coordinator. NO DB imports — safe under tsx locally.
import type { RosterInput } from '../src/lib/orchestration/team/team-roster'

export const CAMPAIGN_TEAM_NAME = 'Planejamento de Campanha Threads'
export const CAMPAIGN_TEAM_DESCRIPTION =
  'Pipeline completo de planejamento de campanha: briefing → arco narrativo → validação de dados → redação de todos os posts → revisão editorial → agendamento automático no calendário.'
export const CAMPAIGN_TEAM_CONFIG = {
  inputLabel:
    'Briefing da campanha (ex: "Campanha de lançamento do Plano Pro — 10 posts em 2 semanas, foco em conversão, tema: como a Polaris IA multiplica resultados de marketing")',
}
export const CAMPAIGN_MODEL = 'llama-3.3-70b-versatile'

// Agentes EXISTENTES do Threads (já wired a plugins/skills/MCP). NÃO recriar.
export const CAMPAIGN_AGENT_IDS = {
  estrategista: '8b41f3f9-944f-420b-8800-6b7961b14aed',
  analista: '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  copywriter: '87245dd3-76b3-4776-bdf0-2c38896e74c0',
  editor: '43d8df70-4f66-4407-9aca-a37a2bfc6299',
  gestor: '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
} as const

// Lead sintético (só coordena — não precisa de tools do Threads).
export const CAMPAIGN_LEAD_SPEC = {
  name: 'Coordenador de Campanha Threads',
  model: CAMPAIGN_MODEL,
  systemPrompt: `Você é o coordenador de uma equipe de planejamento de campanhas para o Threads da Polaris IA. Seu papel é orquestrar — não executar as etapas você mesmo.

Ao receber o briefing da campanha, delegue em sequência:
1. Estrategista — arco narrativo + plano de N posts (tema, ângulo, tom, dia/horário de cada post).
2. Analista — validar e enriquecer o plano com dados reais do Threads usando as ferramentas dele (insights de perfil e de posts).
3. Copywriter — redigir TODOS os posts do plano (≤500 caracteres cada), usando o validador de formato.
4. Editor (Revisor) — revisão editorial e aprovação post a post.
5. Gestor — com os posts APROVADOS, agendar a publicação (mínimo 24h entre posts da mesma campanha).

Garanta que cada etapa recebeu o contexto da anterior e que o entregável final é uma campanha completa, revisada e agendada. Se um membro entregar algo incompleto ou fora do briefing, peça correção antes de seguir. Escreva sempre em português brasileiro.`,
}

/** Monta o roster do Team. `leadAgentId` é o agente lead recém-criado. */
export function buildCampaignRoster(leadAgentId: string): RosterInput[] {
  return [
    { agentId: leadAgentId, role: 'lead', model: CAMPAIGN_MODEL, position: 0 },
    { agentId: CAMPAIGN_AGENT_IDS.estrategista, role: 'worker', model: null, position: 1 },
    { agentId: CAMPAIGN_AGENT_IDS.analista, role: 'worker', model: null, position: 2 },
    { agentId: CAMPAIGN_AGENT_IDS.copywriter, role: 'worker', model: null, position: 3 },
    { agentId: CAMPAIGN_AGENT_IDS.editor, role: 'reviewer', model: null, position: 4 },
    { agentId: CAMPAIGN_AGENT_IDS.gestor, role: 'worker', model: null, position: 5 },
  ]
}
