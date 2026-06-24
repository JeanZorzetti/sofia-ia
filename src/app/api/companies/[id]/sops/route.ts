// 005-agentic-companies — PUT /api/companies/[id]/sops
// SOPs (formato de saída esperado) por cargo (FR-011) — persistido em Company.config.sops
// com merge raso (preserva infrastructure e outras chaves de config).
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, putSopsSchema } from '@/lib/validation'

type RouteParams = { params: Promise<{ id: string }> }

export const PUT = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const company = await prisma.company.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { config: true } })
    if (!company) return apiNotFound('Company not found')

    const parsed = await parseJson(request, putSopsSchema)
    if (!parsed.ok) return apiError(parsed.error, 400)

    const config = (company.config && typeof company.config === 'object' ? company.config : {}) as Record<string, unknown>
    const nextConfig = { ...config, sops: parsed.data.sops }

    await prisma.company.update({ where: { id }, data: { config: nextConfig as object } })
    return apiOk({ sops: parsed.data.sops })
  } catch (error) {
    console.error('Error updating sops:', error)
    return apiError('Failed to update sops', 500)
  }
})
