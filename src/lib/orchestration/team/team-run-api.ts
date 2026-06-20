// HTTP↔domínio para as rotas de disparo de Team run por API key (SP4).
// Mantém as rotas finas e dá um ponto puro testável. Reusado pela rota de sessão (status map).
import type { TeamRunMode, TeamRunErrorCode } from './start-team-run'
import type { GitMode } from '@/lib/git/git-delivery-plan'

export interface ParsedTeamRunBody {
  mission: string          // já trimado; '' se ausente (startTeamRun lança missing_mission)
  mode: TeamRunMode        // 'code' só se body.mode === 'code', senão 'chat'
  repoUrl: string | null
  base: string | null
  gitMode: GitMode | null  // S3.1: só 'direct' é aceito; qualquer outra coisa → null = legado 'pr'
  previewEnabled: boolean  // Preview mode: sobe dev server + iframe pós-run (só code-run com repo)
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Lê o body de uma requisição de disparo. Defensivo (body pode não ser objeto).
 * Aliases p/ compat com templates Zapier/Make/n8n: mission > input > message.
 */
export function parseTeamRunBody(body: unknown): ParsedTeamRunBody {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const mission = str(b.mission) || str(b.input) || str(b.message)
  const mode: TeamRunMode = b.mode === 'code' ? 'code' : 'chat'
  return {
    mission,
    mode,
    repoUrl: str(b.repoUrl) || null,
    base: str(b.base) || null,
    gitMode: b.gitMode === 'direct' ? 'direct' : null,
    previewEnabled: b.previewEnabled === true || b.previewEnabled === 'true',
  }
}

/** Fonte única do mapa código→HTTP (rotas de sessão + API key importam isto). */
export const TEAM_RUN_STATUS_BY_CODE: Record<TeamRunErrorCode, number> = {
  not_found: 404,
  invalid_roster: 400,
  missing_mission: 400,
  queue_unavailable: 503,
}
