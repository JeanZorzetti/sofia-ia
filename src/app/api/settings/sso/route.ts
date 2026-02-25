import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

/**
 * GET /api/settings/sso
 * Busca configurações SSO da organização do usuário autenticado
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Busca organização do usuário (primeira organização onde é admin)
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: auth.id, role: 'ADMIN' },
      include: { organization: true },
    })

    if (!membership) {
      return NextResponse.json({
        google: null,
        microsoft: null,
        saml: null,
        oidc: null,
      })
    }

    const org = membership.organization

    // Retorna também as configurações legadas da tabela SsoConfig
    const ssoConfigs = await prisma.ssoConfig.findMany({
      where: { workspaceId: org.id },
    }).catch(() => [])

    const saml = ssoConfigs.find(c => c.provider === 'saml') || null
    const oidc = ssoConfigs.find(c => c.provider === 'oidc') || null

    return NextResponse.json({
      google: org.ssoProvider === 'google' ? {
        provider: 'google',
        enabled: true,
        domain: org.ssoDomain,
        clientId: org.ssoClientId ? '***' : null, // Mascara secret
        forced: org.ssoForced,
      } : null,
      microsoft: org.ssoProvider === 'microsoft' ? {
        provider: 'microsoft',
        enabled: true,
        domain: org.ssoDomain,
        clientId: org.ssoClientId ? '***' : null,
        forced: org.ssoForced,
      } : null,
      saml,
      oidc,
      orgId: org.id,
      orgSlug: org.slug,
    })
  } catch (error) {
    console.error('SSO GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/settings/sso
 * Salva configuração SSO (Google ou Microsoft) para a organização
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { provider, domain, clientId, clientSecret, forced } = body

    // Valida o provider
    if (!['google', 'microsoft', 'saml', 'oidc'].includes(provider)) {
      return NextResponse.json({ error: 'Provider inválido' }, { status: 400 })
    }

    // Para SAML e OIDC legados, usa a tabela SsoConfig
    if (provider === 'saml' || provider === 'oidc') {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: auth.id, role: 'ADMIN' },
        include: { organization: true },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
      }

      await prisma.ssoConfig.upsert({
        where: { workspaceId_provider: { workspaceId: membership.organization.id, provider } },
        update: {
          enabled: body.enabled ?? false,
          config: body.config || {},
          credentials: body.credentials || {},
          updatedAt: new Date(),
        },
        create: {
          workspaceId: membership.organization.id,
          provider,
          enabled: body.enabled ?? false,
          config: body.config || {},
          credentials: body.credentials || {},
        },
      })

      return NextResponse.json({ success: true })
    }

    // Para Google/Microsoft OAuth, atualiza o model Organization
    if (!domain || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Domínio, Client ID e Client Secret são obrigatórios' },
        { status: 400 }
      )
    }

    // Busca ou cria organização do usuário
    let membership = await prisma.organizationMember.findFirst({
      where: { userId: auth.id, role: 'ADMIN' },
      include: { organization: true },
    })

    if (!membership) {
      // Cria organização padrão para o usuário
      const emailDomain = auth.email.split('@')[1]
      const orgSlug = emailDomain.replace(/\./g, '-') + '-' + auth.id.slice(0, 8)
      const org = await prisma.organization.create({
        data: {
          name: emailDomain,
          slug: orgSlug,
          ssoProvider: provider,
          ssoDomain: domain,
          ssoClientId: clientId,
          ssoClientSecret: clientSecret,
          ssoForced: forced ?? false,
        },
      })
      await prisma.organizationMember.create({
        data: { orgId: org.id, userId: auth.id, role: 'ADMIN' },
      })
      return NextResponse.json({ success: true, orgSlug: org.slug })
    }

    // Atualiza a organização existente
    await prisma.organization.update({
      where: { id: membership.organization.id },
      data: {
        ssoProvider: provider,
        ssoDomain: domain,
        ssoClientId: clientId,
        // Só atualiza o secret se foi enviado um novo (não mascarado)
        ...(clientSecret && clientSecret !== '***' ? { ssoClientSecret: clientSecret } : {}),
        ssoForced: forced ?? false,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      orgSlug: membership.organization.slug,
    })
  } catch (error) {
    console.error('SSO POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/settings/sso
 * Remove configuração SSO da organização
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: auth.id, role: 'ADMIN' },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    await prisma.organization.update({
      where: { id: membership.orgId },
      data: {
        ssoProvider: null,
        ssoDomain: null,
        ssoClientId: null,
        ssoClientSecret: null,
        ssoForced: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SSO DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
