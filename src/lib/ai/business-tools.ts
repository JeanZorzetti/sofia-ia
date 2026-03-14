/**
 * Business Tools — Cognitive Orchestrator
 * Ferramentas determinísticas (sem LLM) para análise de negócio imobiliário.
 * Replicam os Code Nodes do n8n: business_case_generator, psychology_analyzer, roi_calculator.
 */

// ── Business Case Generator ────────────────────────────────────────────────────

export interface BusinessCaseInput {
  companyType?: 'imobiliaria' | 'construtora' | 'corretor_autonomo' | 'investidor'
  companySize?: 'pequena' | 'media' | 'grande'
  leadsMonth?: number
  currentConversion?: number
  avgTicket?: number
  teamSize?: number
}

export interface BusinessCaseResult {
  currentSituation: { leadsMonth: number; closingsMonth: number; revenueMonth: number; leadsLostTiming: number }
  projectedWithSofia: { closingsMonth: number; revenueMonth: number; improvementPct: number }
  roi: { additionalRevenue: number; sofiaFee: number; netGain: number; paybackDays: number; roiPct: number }
}

export function businessCaseGenerator(input: BusinessCaseInput): BusinessCaseResult {
  const B = { leadsMonth: 100, conversion: 0.042, ticket: 2340, lostTiming: 0.73, boost: 2.8, fee: 497 }

  const leadsMonth = input.leadsMonth ?? B.leadsMonth
  const conv = input.currentConversion ?? B.conversion
  const ticket = input.avgTicket ?? B.ticket

  const curClosings = Math.floor(leadsMonth * conv)
  const curRevenue = curClosings * ticket
  const lostTiming = Math.floor(leadsMonth * B.lostTiming)

  const projConv = conv * B.boost
  const projClosings = Math.floor(leadsMonth * projConv)
  const projRevenue = projClosings * ticket
  const additionalRevenue = projRevenue - curRevenue
  const netGain = additionalRevenue - B.fee
  const paybackDays = Math.max(1, Math.round((B.fee / Math.max(1, additionalRevenue)) * 30))

  return {
    currentSituation: { leadsMonth, closingsMonth: curClosings, revenueMonth: curRevenue, leadsLostTiming: lostTiming },
    projectedWithSofia: { closingsMonth: projClosings, revenueMonth: projRevenue, improvementPct: Math.round((B.boost - 1) * 100) },
    roi: { additionalRevenue, sofiaFee: B.fee, netGain, paybackDays, roiPct: Math.round((netGain / B.fee) * 100) },
  }
}

// ── Psychology Analyzer ───────────────────────────────────────────────────────

export type DiscProfile = 'analytical' | 'driver' | 'expressive' | 'amiable' | 'mixed'

export interface PsychologyResult {
  profile: DiscProfile
  confidence: number
  indicators: string[]
  tone: string
  elements: string[]
  offerTiming: string
}

const DISC_SIGNALS: Record<DiscProfile, string[]> = {
  analytical: ['como funciona', 'técnico', 'dado', 'integra', 'detalhe', 'comprova', 'estatística', 'roi', 'retorno', 'específico', 'processo'],
  driver: ['rápido', 'urgente', 'precis', 'resultado', 'imediato', 'agora', 'problem', 'perdendo', 'escapando', 'competitiv', 'eficien'],
  expressive: ['interessante', 'incrível', 'inovaç', 'tecnologia', 'diferente', 'modern', 'futuro', 'tendência', 'revolucion'],
  amiable: ['equipe', 'parceir', 'confiança', 'referência', 'recomendaç', 'experiência', 'satisfaç', 'relacion'],
  mixed: [],
}

const DISC_STRATEGY: Record<DiscProfile, { tone: string; elements: string[]; offerTiming: string }> = {
  analytical: { tone: 'técnico e baseado em dados', elements: ['ROI específico', 'dados do setor', 'benchmarks'], offerTiming: 'após apresentar evidências' },
  driver: { tone: 'direto e focado em resultados', elements: ['urgência de mercado', 'impacto imediato', 'vantagem competitiva'], offerTiming: 'imediato com urgência' },
  expressive: { tone: 'entusiasmado e inovador', elements: ['tecnologia de ponta', 'diferenciação', 'cases inspiradores'], offerTiming: 'no pico do entusiasmo' },
  amiable: { tone: 'consultivo e empático', elements: ['cases de sucesso', 'depoimentos', 'confiança'], offerTiming: 'após construir rapport' },
  mixed: { tone: 'equilibrado e profissional', elements: ['benefício principal', 'prova social', 'próximo passo claro'], offerTiming: 'após qualificação' },
}

export function psychologyAnalyzer(userMessages: string[]): PsychologyResult {
  const text = userMessages.join(' ').toLowerCase()
  const scores: Record<DiscProfile, number> = { analytical: 0, driver: 0, expressive: 0, amiable: 0, mixed: 0 }

  for (const profile of Object.keys(DISC_SIGNALS) as DiscProfile[]) {
    for (const signal of DISC_SIGNALS[profile]) {
      if (text.includes(signal)) scores[profile]++
    }
  }

  const candidates = (['analytical', 'driver', 'expressive', 'amiable'] as DiscProfile[])
  const maxScore = Math.max(...candidates.map(p => scores[p]))
  const dominant: DiscProfile = maxScore === 0 ? 'mixed' : (candidates.find(p => scores[p] === maxScore) ?? 'mixed')
  const confidence = maxScore === 0 ? 0.4 : Math.min(0.95, 0.5 + maxScore * 0.1)

  const indicators = candidates.filter(p => scores[p] > 0).map(p => `${p}(${scores[p]})`)
  const strategy = DISC_STRATEGY[dominant]

  return { profile: dominant, confidence, indicators, ...strategy }
}

// ── ROI Calculator ─────────────────────────────────────────────────────────────

export interface RoiInput {
  leadsMonth?: number
  avgTicket?: number
  currentConversion?: number
  hoursSavedMonth?: number
  hourlyRate?: number
}

export interface RoiResult {
  leadRevenuGain: number
  timeSavingsGain: number
  totalGain: number
  sofiaFee: number
  netRoi: number
  roiPct: number
  breakEvenLeads: number
}

export function roiCalculator(input: RoiInput): RoiResult {
  const leadsMonth = input.leadsMonth ?? 100
  const ticket = input.avgTicket ?? 2340
  const conv = input.currentConversion ?? 0.042
  const hoursSaved = input.hoursSavedMonth ?? 40
  const hourlyRate = input.hourlyRate ?? 80
  const sofiaFee = 497

  const additionalClosings = leadsMonth * conv * 1.8
  const leadRevenueGain = additionalClosings * ticket
  const timeSavingsGain = hoursSaved * hourlyRate
  const totalGain = leadRevenueGain + timeSavingsGain
  const netRoi = totalGain - sofiaFee
  const roiPct = Math.round((netRoi / sofiaFee) * 100)
  const breakEvenLeads = Math.ceil(sofiaFee / (ticket * conv))

  return { leadRevenuGain: Math.round(leadRevenueGain), timeSavingsGain, totalGain: Math.round(totalGain), sofiaFee, netRoi: Math.round(netRoi), roiPct, breakEvenLeads }
}
