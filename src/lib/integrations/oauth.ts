/**
 * OAuth connection helper para integrações CRM (HubSpot, Salesforce).
 * Gerencia busca e renovação automática de tokens.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type OAuthProvider = 'hubspot' | 'salesforce' | 'google-sheets' | 'notion'

/**
 * Busca a conexão OAuth de um usuário para um provider específico.
 * Renova o token automaticamente se estiver expirado.
 */
export async function getOAuthConnection(userId: string, provider: OAuthProvider) {
  const connection = await prisma.oAuthConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  })

  if (!connection) return null

  // Verificar se token está expirado (com margem de 5 minutos)
  if (connection.expiresAt) {
    const expiresAt = new Date(connection.expiresAt)
    const now = new Date()
    const marginMs = 5 * 60 * 1000 // 5 minutos

    if (now.getTime() + marginMs >= expiresAt.getTime()) {
      // Tentar renovar token
      if (connection.refreshToken) {
        try {
          const refreshed = await refreshOAuthToken(
            connection.id,
            provider,
            connection.refreshToken
          )
          return refreshed
        } catch (error) {
          console.error(`[oauth] Failed to refresh ${provider} token:`, error)
          // Retornar conexão mesmo expirada — o chamador decidirá
          return connection
        }
      }
    }
  }

  return connection
}

/**
 * Renova o token OAuth de uma conexão.
 * Suporta HubSpot e Salesforce.
 */
export async function refreshOAuthToken(
  connectionId: string,
  provider: OAuthProvider,
  refreshToken: string
) {
  let newAccessToken: string
  let newRefreshToken: string | undefined
  let expiresIn: number

  if (provider === 'hubspot') {
    const clientId = process.env.HUBSPOT_CLIENT_ID
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('HubSpot OAuth credentials not configured')
    }

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error(`HubSpot token refresh failed: ${response.statusText}`)
    }

    const data = await response.json()
    newAccessToken = data.access_token
    newRefreshToken = data.refresh_token
    expiresIn = data.expires_in || 1800
  } else if (provider === 'salesforce') {
    const clientId = process.env.SALESFORCE_CLIENT_ID
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Salesforce OAuth credentials not configured')
    }

    const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error(`Salesforce token refresh failed: ${response.statusText}`)
    }

    const data = await response.json()
    newAccessToken = data.access_token
    newRefreshToken = refreshToken // Salesforce não emite novo refresh token
    expiresIn = 7200
  } else if (provider === 'google-sheets') {
    const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_SHEETS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Google Sheets OAuth credentials not configured')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error(`Google Sheets token refresh failed: ${response.statusText}`)
    }

    const data = await response.json()
    newAccessToken = data.access_token
    newRefreshToken = refreshToken // Google não emite novo refresh token
    expiresIn = data.expires_in || 3600
  } else if (provider === 'notion') {
    // Notion usa tokens de longa duração — sem renovação automática
    throw new Error('Notion tokens não expiram — não é necessário renovar')
  } else {
    throw new Error(`Provider desconhecido: ${provider}`)
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  const updated = await prisma.oAuthConnection.update({
    where: { id: connectionId },
    data: {
      accessToken: newAccessToken,
      ...(newRefreshToken && { refreshToken: newRefreshToken }),
      expiresAt,
    },
  })

  return updated
}

/**
 * Salva ou atualiza uma conexão OAuth no banco.
 */
export async function saveOAuthConnection(
  userId: string,
  provider: OAuthProvider,
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number | null,
  metadata: Record<string, unknown> = {}
) {
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null
  const metaJson = metadata as Prisma.InputJsonValue

  return prisma.oAuthConnection.upsert({
    where: { userId_provider: { userId, provider } },
    update: {
      accessToken,
      ...(refreshToken && { refreshToken }),
      ...(expiresAt && { expiresAt }),
      metadata: metaJson,
    },
    create: {
      userId,
      provider,
      accessToken,
      refreshToken: refreshToken || null,
      expiresAt,
      metadata: metaJson,
    },
  })
}
