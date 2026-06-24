// 007-company-run-resilience — Helpers PUROS (sem DB, sem rede) consumidos por
// company-run.ts, pela rota de resume e pelo cron. Mantidos puros para teste isolado.
//
// Princípio II: este módulo NÃO toca o coordinator; só interpreta o resultado de uma
// fase (já produzido por runTeamAndWait) e calcula sinais derivados.
import { isClaudeRateLimit } from '@/lib/ai/claude-token-pool'

/** Resultado mínimo de uma fase (subconjunto de RunTeamAndWaitResult). */
export interface PhaseResultLike {
  status: string
  output: string | null
}

/**
 * Esgotamento do pool? Cobre os DOIS jeitos que o limite chega:
 *  - status terminal 'rate_limited' (o run já sinalizou), OU
 *  - status 'completed' mas com a assinatura de limite no output (exit 0 — o caso que
 *    marcou as fases do encurtador como "completed" falso).
 * Reusa a fonte única isClaudeRateLimit (regex com word boundaries → sem falso-positivo).
 */
export function isPhaseExhausted(result: PhaseResultLike): boolean {
  if (result.status === 'rate_limited') return true
  if (result.status === 'completed' && isClaudeRateLimit(result.output)) return true
  return false
}

/**
 * Extrai o horário de reset (UTC) de uma mensagem do CLI, ex.:
 *   "You've hit your session limit · resets 4:30pm (UTC)" → hoje 16:30Z (ou amanhã se já passou)
 *   "resets 5pm (UTC)" / "resets 16:30 (UTC)" / "resets 11am (UTC)"
 * Retorna null quando não houver horário (o bloqueio ainda ocorre, só sem reset).
 */
export function parseResetAt(text: string | null | undefined, now: Date = new Date()): Date | null {
  if (!text) return null
  const m = text.match(/resets?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*\(utc\)/i)
  if (!m) return null
  let hour = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const ampm = m[3]?.toLowerCase()
  if (ampm === 'pm' && hour < 12) hour += 12
  if (ampm === 'am' && hour === 12) hour = 0
  if (hour > 23 || min > 59) return null
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, min, 0, 0))
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 1) // próximo reset (futuro)
  return d
}

/** Peso do modelo no consumo da janela (Opus pesa ~5× Sonnet). */
export function MODEL_WEIGHT(model: string | null | undefined): number {
  if (!model) return 1
  if (model.includes('opus')) return 5
  if (model.includes('sonnet')) return 1
  return 1
}

/** Proxy de consumo persistido por fase (independe do token-count que subconta o claude-cli). */
export interface PhaseUsageProxy {
  turns: number
  durationMs: number | null
  byModel: Record<string, number>
  weightedUnits: number
  blocked: boolean
}

/** Calcula o proxy a partir de sinais confiáveis (turns × peso-do-modelo por membro do roster). */
export function computeUsageProxy(input: {
  turnsUsed: number | null
  durationMs: number | null
  members: { model: string | null }[]
  blocked: boolean
}): PhaseUsageProxy {
  const turns = input.turnsUsed ?? 1
  const byModel: Record<string, number> = {}
  let weightedUnits = 0
  for (const member of input.members) {
    const key = member.model ?? 'unknown'
    const units = turns * MODEL_WEIGHT(member.model)
    byModel[key] = (byModel[key] ?? 0) + units
    weightedUnits += units
  }
  return { turns, durationMs: input.durationMs, byModel, weightedUnits, blocked: input.blocked }
}
