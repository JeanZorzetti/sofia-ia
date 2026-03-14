/**
 * Cognitive Pipeline — 3-stage multi-agent chain
 * Replicates n8n: Cognitive Orchestrator → Strategy Optimizer → Response Synthesizer
 *
 * Ativado por: agent.config.cognitiveMode = true
 *
 * Stage 1 — Cognitive Orchestrator (llama-3.3-70b, JSON mode, temp 0.3)
 *   Analisa perfil psicológico + contexto RAG + lead profile
 *   Retorna JSON estruturado com estratégia recomendada
 *
 * Stage 2 — Strategy Optimizer (llama-3.3-70b, temp 0.2)
 *   Refina a estratégia em 3-5 diretrizes concretas de comunicação
 *
 * Stage 3 — Response Synthesizer (agent.model, temp 0.4)
 *   Gera a mensagem final usando as diretrizes + system prompt original do agente
 */

import { getGroqClient } from '@/lib/ai/groq'
import { businessCaseGenerator, psychologyAnalyzer, roiCalculator } from '@/lib/ai/business-tools'

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

// ── Stage 1 prompt ─────────────────────────────────────────────────────────────

const ORCHESTRATOR_SYSTEM = `Você é um Agente Orquestrador Cognitivo especializado em vendas imobiliárias B2B.

Analise os inputs e retorne um JSON com esta estrutura exata:
{
  "psychological_profile": "analytical|driver|expressive|amiable|mixed",
  "emotional_state": "curioso|ansioso|frustrado|confiante|entusiasmado|neutro",
  "lead_temperature": "frio|morno|quente|muito_quente",
  "urgency_level": "baixa|media|alta|critica",
  "primary_approach": "educativa|consultiva|comercial|empatica|tecnica",
  "communication_tone": "formal|casual|tecnico|emocional",
  "persuasive_elements": ["elemento1", "elemento2"],
  "offer_timing": "agora|proxima_mensagem|apos_qualificacao",
  "key_insight": "insight principal em 1 frase para o atendente usar",
  "strategic_question": "pergunta para qualificar ou avançar a conversa",
  "confidence": 0.85
}

Retorne APENAS o JSON, sem texto adicional.`

// ── Stage 2 prompt ─────────────────────────────────────────────────────────────

const OPTIMIZER_SYSTEM = `Você é o Strategy Optimizer. Recebe a análise cognitiva e a mensagem do lead.
Retorne 3-5 diretrizes diretas e acionáveis para o atendente seguir NESTA resposta específica.
Formato: lista numerada, sem introdução, cada linha com ≤ 15 palavras.
Seja concreto: "Use o dado X para criar urgência" não "seja persuasivo".`

// ── Pipeline ───────────────────────────────────────────────────────────────────

export async function runCognitivePipeline(params: {
  agentModel: string
  systemPrompt: string
  messages: ChatMessage[]
  leadContext: Record<string, unknown>
  knowledgeContext: string
}): Promise<{ message: string; model: string; usage: any; confidence: number }> {
  const { agentModel, systemPrompt, messages, leadContext, knowledgeContext } = params

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const history = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')

  // Pre-compute deterministic tools (free, no LLM needed)
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content)
  const psychProfile = psychologyAnalyzer(userMessages)
  const businessCase = businessCaseGenerator({
    companyType: (leadContext?.companyType as any) ?? 'imobiliaria',
    companySize: (leadContext?.companySize as any) ?? 'media',
    leadsMonth: (leadContext?.leadsMonth as number) ?? undefined,
    avgTicket: (leadContext?.avgTicket as number) ?? undefined,
  })
  const roi = roiCalculator({
    leadsMonth: (leadContext?.leadsMonth as number) ?? undefined,
    avgTicket: (leadContext?.avgTicket as number) ?? undefined,
  })

  const orchestratorUserMsg = [
    `RAG_INPUT: ${knowledgeContext || 'N/A'}`,
    `MESSAGE_CONTENT: ${lastUserMsg}`,
    `LEAD_PROFILE: ${JSON.stringify(leadContext)}`,
    `CONVERSATION_HISTORY:\n${history}`,
    `PSYCHOLOGY_ANALYSIS: ${JSON.stringify(psychProfile)}`,
    `BUSINESS_CASE: ${JSON.stringify(businessCase)}`,
    `ROI_DATA: ${JSON.stringify(roi)}`,
  ].join('\n\n')

  // ── Stage 1: Cognitive Orchestrator ────────────────────────────────────────
  let cognitiveAnalysis: Record<string, unknown> = {}
  let stage1Usage: Record<string, number> = {}

  try {
    const s1 = await getGroqClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: ORCHESTRATOR_SYSTEM },
        { role: 'user', content: orchestratorUserMsg },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })
    stage1Usage = (s1.usage ?? {}) as Record<string, number>
    cognitiveAnalysis = JSON.parse(s1.choices[0]?.message?.content ?? '{}')
  } catch {
    cognitiveAnalysis = { primary_approach: 'consultiva', communication_tone: 'profissional', confidence: 0.5 }
  }

  // ── Stage 2: Strategy Optimizer ────────────────────────────────────────────
  let strategyPlan = ''
  let stage2Usage: Record<string, number> = {}

  try {
    const s2 = await getGroqClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: OPTIMIZER_SYSTEM },
        { role: 'user', content: `COGNITIVE_ANALYSIS:\n${JSON.stringify(cognitiveAnalysis, null, 2)}\n\nMESSAGEM_DO_LEAD: ${lastUserMsg}` },
      ],
      temperature: 0.2,
      max_tokens: 400,
    })
    stage2Usage = (s2.usage ?? {}) as Record<string, number>
    strategyPlan = s2.choices[0]?.message?.content ?? ''
  } catch {
    strategyPlan = `1. Seja consultivo e empático.\n2. Foque no benefício principal.\n3. Termine com uma pergunta qualificadora.`
  }

  // ── Stage 3: Response Synthesizer ──────────────────────────────────────────
  const enrichedSystem = strategyPlan
    ? `${systemPrompt}\n\n## DIRETRIZES ESTRATÉGICAS (siga nesta resposta)\n${strategyPlan}`
    : systemPrompt

  const s3 = await getGroqClient().chat.completions.create({
    model: agentModel,
    messages: [{ role: 'system', content: enrichedSystem }, ...messages],
    temperature: 0.4,
    max_tokens: 1024,
  })

  const finalMessage = s3.choices[0]?.message?.content ?? ''
  const s3Usage = (s3.usage ?? {}) as Record<string, number>

  const totalUsage = {
    prompt_tokens: (stage1Usage['prompt_tokens'] ?? 0) + (stage2Usage['prompt_tokens'] ?? 0) + (s3Usage['prompt_tokens'] ?? 0),
    completion_tokens: (stage1Usage['completion_tokens'] ?? 0) + (stage2Usage['completion_tokens'] ?? 0) + (s3Usage['completion_tokens'] ?? 0),
    total_tokens: (stage1Usage['total_tokens'] ?? 0) + (stage2Usage['total_tokens'] ?? 0) + (s3Usage['total_tokens'] ?? 0),
  }

  const confidence = typeof cognitiveAnalysis.confidence === 'number'
    ? cognitiveAnalysis.confidence
    : 0.9

  return { message: finalMessage, model: agentModel, usage: totalUsage, confidence }
}
