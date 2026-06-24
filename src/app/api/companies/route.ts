// 005-agentic-companies — GET (listar) + POST (criar de nicho) /api/companies
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { apiOk, apiError } from '@/lib/api-response'
import { parseJson, createCompanySchema } from '@/lib/validation'
import { listCompanies, createCompanyFromNiche } from '@/lib/companies/company-store'

// GET /api/companies — empresas do dono (admin → todas), com contagem de cargos ocupados/vagos.
export const GET = withAuth(async (request, auth) => {
  try {
    const companies = await listCompanies(ownerId(auth))
    const data = companies.map(c => {
      const total = c.roles.length
      const staffed = c.roles.filter(r => r.agentId).length
      return { ...c, roleCount: total, staffedCount: staffed, vacantCount: total - staffed }
    })
    return apiOk(data)
  } catch (error) {
    console.error('Error listing companies:', error)
    return apiError('Failed to list companies', 500)
  }
})

// POST /api/companies — cria a partir de um nicho (semeia cargos + RACI pré-preenchida).
export const POST = withAuth(async (request, auth) => {
  try {
    const parsed = await parseJson(request, createCompanySchema)
    if (!parsed.ok) return apiError(parsed.error, 400)
    const { name, niche, typology, description } = parsed.data

    const result = await createCompanyFromNiche({ name, niche, typology, description, userId: auth.id })
    if (!result.ok) return apiError(result.error, 400)

    return apiOk(result.company, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return apiError('Failed to create company', 500)
  }
})
