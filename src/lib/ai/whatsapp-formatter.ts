/**
 * WhatsApp Response Formatter
 * Pós-processa respostas da IA antes de enviar pelo WhatsApp:
 *  1. Limita o tamanho (180 chars para perguntas específicas, 360 para gerais)
 *  2. Ajusta emojis (máx 2, contextual)
 *  3. Naturaliza o português brasileiro
 *
 * Inspirado no "Enhanced Atendente v1.0" do workflow n8n.
 */

// ── Emoji contextual por tema ──────────────────────────────────────────────────
const EMOJI_MAP: Record<string, string> = {
  // Saudações
  olá: '👋', oi: '😊', bom_dia: '🌅', boa_tarde: '☀️', boa_noite: '🌙',
  // Imóveis
  imovel: '🏠', apartamento: '🏢', casa: '🏡', terreno: '🌳', aluguel: '🔑',
  venda: '🏷️', compra: '🤝', financiamento: '💳',
  // Agenda
  visita: '📅', reuniao: '📆', horario: '🕐', agenda: '📋',
  // Confirmação / Negativo
  confirmado: '✅', certo: '👍', perfeito: '🎯', otimo: '🌟',
  nao: '❌', problema: '⚠️',
  // Dúvidas
  pergunta: '🤔', duvida: '💬', info: 'ℹ️',
  // Valores
  preco: '💰', valor: '💵', desconto: '🎁',
}

// ── Expressões naturais do português BR ──────────────────────────────────────
const CONNECTORS = [
  'Olha,', 'Então,', 'Veja,', 'Basicamente,', 'Pra te falar a verdade,',
  'Ah,', 'Ó,', 'Bom,',
]

const CLOSINGS = [
  'Posso te ajudar em mais alguma coisa?',
  'Tem alguma dúvida?',
  'O que acha?',
  'Qualquer coisa, é só falar!',
  'Pode contar comigo!',
]

// ── Detectar tipo de pergunta (específica vs geral) ──────────────────────────
function isSpecificQuestion(userMessage: string): boolean {
  const specific = [
    /\bpreço\b/i, /\bvalor\b/i, /\bquant[oa]\b/i, /\bm²\b/i, /\bmetros?\b/i,
    /\bquartos?\b/i, /\bvagas?\b/i, /\bandares?\b/i, /\bcondomínio\b/i,
    /\biptu\b/i, /\bcep\b/i, /\bendereço\b/i, /\bbairro\b/i,
  ]
  return specific.some(r => r.test(userMessage))
}

// ── Detectar emojis existentes ────────────────────────────────────────────────
function countEmojis(text: string): number {
  // Regex abrangente para emojis Unicode
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu
  return (text.match(emojiRegex) || []).length
}

// ── Selecionar emoji contextual ───────────────────────────────────────────────
function pickEmoji(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [keyword, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(keyword.replace('_', ' '))) {
      return emoji
    }
  }
  return null
}

// ── Limitar tamanho sem cortar palavras ───────────────────────────────────────
function truncateSmart(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text

  // Tentar cortar em ponto final
  const sentences = text.split(/(?<=[.!?])\s+/)
  let result = ''
  for (const sentence of sentences) {
    if ((result + sentence).length > maxChars) break
    result += (result ? ' ' : '') + sentence
  }

  if (!result) {
    // Fallback: cortar na última palavra antes do limite
    result = text.slice(0, maxChars).replace(/\s+\S*$/, '')
  }

  return result.trim()
}

// ── Normalizar espaços e pontuação extra ──────────────────────────────────────
function normalizeText(text: string): string {
  return text
    .replace(/\s{2,}/g, ' ')       // múltiplos espaços → 1
    .replace(/\n{3,}/g, '\n\n')    // mais de 2 linhas → 2
    .trim()
}

// ── Remover emojis excessivos (manter máx 2) ─────────────────────────────────
function limitEmojis(text: string, max = 2): string {
  let count = 0
  return text.replace(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu, (match) => {
    count++
    return count <= max ? match : ''
  }).trim()
}

// ── API principal ─────────────────────────────────────────────────────────────

export interface FormatterOptions {
  userMessage?: string    // mensagem original do usuário (para detectar tipo)
  addClosing?: boolean    // adicionar fechamento casual (default: false)
  maxChars?: number       // override do limite de chars
}

/**
 * Formata a resposta da IA para o padrão WhatsApp do workflow.
 */
export function formatWhatsAppResponse(
  aiResponse: string,
  options: FormatterOptions = {}
): string {
  const { userMessage = '', addClosing = false } = options

  let text = normalizeText(aiResponse)

  // 1. Limitar emojis a no máximo 2
  text = limitEmojis(text, 2)

  // 2. Determinar limite de chars
  const charLimit = options.maxChars
    ?? (isSpecificQuestion(userMessage) ? 180 : 360)

  // 3. Truncar se necessário
  text = truncateSmart(text, charLimit)

  // 4. Adicionar emoji contextual se não houver nenhum
  if (countEmojis(text) === 0) {
    const emoji = pickEmoji(text) ?? pickEmoji(userMessage)
    if (emoji) {
      text = `${text} ${emoji}`
    }
  }

  // 5. Adicionar fechamento casual (opcional)
  if (addClosing && !text.endsWith('?')) {
    const closing = CLOSINGS[Math.floor(Math.random() * CLOSINGS.length)]
    const withClosing = `${text}\n\n${closing}`
    if (withClosing.length <= charLimit * 1.2) {
      text = withClosing
    }
  }

  return text.trim()
}

/**
 * Verifica se a mensagem contém palavra-chave de reativação da IA.
 * O n8n usa "Atendimento finalizado" para retomar o bot.
 */
export function isReactivationKeyword(text: string): boolean {
  const keywords = [
    'atendimento finalizado',
    'finalizado',
    'reativar ia',
    'reativar bot',
    'voltar ia',
    'bot on',
  ]
  const lower = text.toLowerCase().trim()
  return keywords.some(k => lower.includes(k))
}

/**
 * Verifica se a mensagem é uma solicitação de pausar a IA.
 */
export function isPauseKeyword(text: string): boolean {
  const keywords = [
    'pausar ia',
    'pausar bot',
    'ia off',
    'bot off',
    'atendimento humano',
    'falar com humano',
    'falar com atendente',
  ]
  const lower = text.toLowerCase().trim()
  return keywords.some(k => lower.includes(k))
}
