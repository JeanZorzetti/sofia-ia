/**
 * Google Calendar API v3 service
 * Usado pelos AI tools para criar/cancelar/reagendar reuniões.
 *
 * Requer OAuth com escopo: https://www.googleapis.com/auth/calendar
 */

import { getOAuthConnection } from '@/lib/integrations/oauth'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
  attendees?: Array<{ email: string; responseStatus?: string }>
  hangoutLink?: string
  conferenceData?: unknown
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function calFetch(userId: string, path: string, options: RequestInit = {}): Promise<Response> {
  const conn = await getOAuthConnection(userId, 'google-calendar')
  if (!conn) throw new Error('Google Calendar não conectado. Configure a integração primeiro.')

  return fetch(`${CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${conn.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Verifica se um horário está disponível no calendário.
 * Usa a Freebusy API do Google Calendar.
 */
export async function checkAvailability(
  userId: string,
  start: string,
  end: string,
  calendarId = 'primary'
): Promise<boolean> {
  const res = await calFetch(userId, '/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: start,
      timeMax: end,
      items: [{ id: calendarId }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar freeBusy error ${res.status}: ${err}`)
  }

  const data = await res.json() as {
    calendars: Record<string, { busy: Array<{ start: string; end: string }> }>
  }
  const busy = data.calendars[calendarId]?.busy || []
  return busy.length === 0
}

/**
 * Cria um evento no Google Calendar com link Google Meet.
 * Armazena o remoteJid no campo description para identificação nos lembretes.
 */
export async function createCalendarEvent(
  userId: string,
  params: {
    nome: string
    email: string
    start: string
    end: string
    remoteJid?: string
    calendarId?: string
  }
): Promise<CalendarEvent> {
  const calendarId = params.calendarId || 'primary'
  const requestId = `sofia-${Date.now()}`

  const body = {
    summary: params.nome,
    description: params.remoteJid || '',
    start: { dateTime: params.start, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: params.end, timeZone: 'America/Sao_Paulo' },
    attendees: [{ email: params.email }],
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 120 },
        { method: 'popup', minutes: 5 },
      ],
    },
  }

  const res = await calFetch(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    { method: 'POST', body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar createEvent error ${res.status}: ${err}`)
  }

  return res.json() as Promise<CalendarEvent>
}

/**
 * Busca eventos de um attendee (por email) e deleta o mais recente.
 */
export async function deleteEventByEmail(
  userId: string,
  email: string,
  calendarId = 'primary'
): Promise<{ deleted: boolean; eventId?: string }> {
  const events = await listEventsByEmail(userId, email, calendarId)
  if (!events.length) return { deleted: false }

  // Pegar o evento mais próximo no futuro
  const target = events[0]
  const res = await calFetch(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${target.id}?sendUpdates=all`,
    { method: 'DELETE' }
  )

  if (!res.ok && res.status !== 204 && res.status !== 410) {
    const err = await res.text()
    throw new Error(`Calendar deleteEvent error ${res.status}: ${err}`)
  }

  return { deleted: true, eventId: target.id }
}

/**
 * Atualiza horário de evento de um attendee (by email).
 */
export async function updateEventByEmail(
  userId: string,
  email: string,
  start: string,
  end: string,
  calendarId = 'primary'
): Promise<CalendarEvent> {
  const events = await listEventsByEmail(userId, email, calendarId)
  if (!events.length) throw new Error(`Nenhum evento encontrado para ${email}`)

  const target = events[0]
  const body = {
    start: { dateTime: start, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: end, timeZone: 'America/Sao_Paulo' },
  }

  const res = await calFetch(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${target.id}?sendUpdates=all`,
    { method: 'PATCH', body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar updateEvent error ${res.status}: ${err}`)
  }

  return res.json() as Promise<CalendarEvent>
}

/**
 * Lista eventos futuros de um calendário dentro de uma janela de tempo.
 * Usado pelo cron de lembretes.
 */
export async function listUpcomingEvents(
  userId: string,
  timeMin: string,
  timeMax: string,
  calendarId = 'primary'
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })

  const res = await calFetch(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar listEvents error ${res.status}: ${err}`)
  }

  const data = await res.json() as { items?: CalendarEvent[] }
  return data.items || []
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function listEventsByEmail(
  userId: string,
  email: string,
  calendarId: string
): Promise<CalendarEvent[]> {
  const now = new Date().toISOString()
  const params = new URLSearchParams({
    timeMin: now,
    q: email,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '10',
  })

  const res = await calFetch(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  )

  if (!res.ok) return []
  const data = await res.json() as { items?: CalendarEvent[] }

  // Filtrar apenas eventos onde o email está nos attendees
  return (data.items || []).filter(e =>
    e.attendees?.some(a => a.email.toLowerCase() === email.toLowerCase())
  )
}
