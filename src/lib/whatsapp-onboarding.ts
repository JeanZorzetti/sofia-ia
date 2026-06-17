/**
 * whatsapp-onboarding.ts — fluxo de Embedded Signup (Fase 2).
 *
 * Depois que o cliente conclui o popup do Embedded Signup no browser, o Facebook JS
 * SDK devolve um `code` (+ session info: waba_id, phone_number_id). O backend troca
 * o code por um token, registra o número no Cloud API e assina o app no webhook da
 * WABA do cliente. Tudo server-side (usa META_APP_SECRET).
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/embedded-signup
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`
const APP_ID = process.env.META_APP_ID || ''
const APP_SECRET = process.env.META_APP_SECRET || ''
// PIN de verificação em 2 etapas usado no registro do número (Cloud API).
const REGISTER_PIN = process.env.WHATSAPP_REGISTER_PIN || '000000'

export interface OnboardingResult {
  accessToken: string
  displayPhoneNumber?: string
  verifiedName?: string
}

/** Troca o `code` do Embedded Signup por um access token (server-side). */
export async function exchangeCodeForToken(code: string): Promise<string> {
  if (!APP_ID || !APP_SECRET) {
    throw new Error('META_APP_ID / META_APP_SECRET não configurados')
  }
  const url = `${BASE_URL}/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${encodeURIComponent(code)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(`Falha ao trocar code por token: HTTP ${res.status} ${JSON.stringify(data)}`)
  }
  return data.access_token as string
}

/** Detalhes do número (nome verificado + número formatado). Tolerante a falha. */
async function fetchPhoneDetails(
  phoneNumberId: string,
  token: string
): Promise<{ displayPhoneNumber?: string; verifiedName?: string }> {
  try {
    const res = await fetch(
      `${BASE_URL}/${phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return {}
    const data = await res.json()
    return { displayPhoneNumber: data.display_phone_number, verifiedName: data.verified_name }
  } catch {
    return {}
  }
}

/**
 * Registra o número no Cloud API. Idempotente na prática: se já estiver registrado,
 * a Meta retorna erro que ignoramos (não bloqueia o onboarding).
 */
async function registerPhoneNumber(phoneNumberId: string, token: string): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', pin: REGISTER_PIN }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn(`[WA Onboarding] register não-OK (seguindo): ${res.status} ${JSON.stringify(err)}`)
    }
  } catch (err) {
    console.warn('[WA Onboarding] erro no register (seguindo):', err)
  }
}

/** Assina o app aos webhooks da WABA do cliente. */
async function subscribeWaba(wabaId: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Falha ao assinar webhook da WABA: HTTP ${res.status} ${JSON.stringify(err)}`)
  }
}

/**
 * Executa o onboarding completo: code → token, detalhes, registro do número e
 * assinatura do webhook. Retorna o token (a criptografar) + metadados do número.
 */
export async function runEmbeddedSignup(
  code: string,
  wabaId: string,
  phoneNumberId: string
): Promise<OnboardingResult> {
  const accessToken = await exchangeCodeForToken(code)
  const details = await fetchPhoneDetails(phoneNumberId, accessToken)
  await registerPhoneNumber(phoneNumberId, accessToken)
  await subscribeWaba(wabaId, accessToken)
  return { accessToken, ...details }
}
