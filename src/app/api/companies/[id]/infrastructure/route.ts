// 005-agentic-companies — GET + PUT /api/companies/[id]/infrastructure
// C2: o vínculo de MCP é LEITURA + deep-link (a escrita de MCP fica na config do próprio
// agente — reuso de AgentMcpServer). Só a flag `sandbox` por cargo é escrita in-company,
// em Company.config.infrastructure. Nenhuma credencial nova é armazenada (Princípio V).
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, putInfrastructureSchema } from '@/lib/validation'

type RouteParams = { params: Promise<{ id: string }> }

interface InfraEntry {
  agentId: string | null
  agentName: string | null
  mcpServers: { id: string; name: string; enabled: boolean }[]
  sandbox: boolean
}

export const GET = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const company = await prisma.company.findFirst({
      where: { id, createdBy: ownerId(auth) },
      select: {
        config: true,
        roles: { select: { key: true, agentId: true, agent: { select: { name: true } } } },
      },
    })
    if (!company) return apiNotFound('Company not found')

    const infraCfg = ((company.config as Record<string, unknown>)?.infrastructure ?? {}) as Record<string, { sandbox?: boolean }>
    const staffedAgentIds = company.roles.map(r => r.agentId).filter((x): x is string => !!x)

    // Lê os vínculos MCP de todos os agentes encaixados de uma vez (reuso de AgentMcpServer).
    const links = staffedAgentIds.length
      ? await prisma.agentMcpServer.findMany({
          where: { agentId: { in: staffedAgentIds } },
          select: { agentId: true, enabled: true, mcpServer: { select: { id: true, name: true } } },
        })
      : []

    const data: Record<string, InfraEntry> = {}
    for (const role of company.roles) {
      const mcpServers = links
        .filter(l => l.agentId === role.agentId)
        .map(l => ({ id: l.mcpServer.id, name: l.mcpServer.name, enabled: l.enabled }))
      data[role.key] = {
        agentId: role.agentId,
        agentName: role.agent?.name ?? null,
        mcpServers,
        sandbox: infraCfg[role.key]?.sandbox ?? false,
      }
    }
    return apiOk(data)
  } catch (error) {
    console.error('Error fetching infrastructure:', error)
    return apiError('Failed to fetch infrastructure', 500)
  }
})

export const PUT = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const company = await prisma.company.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { config: true } })
    if (!company) return apiNotFound('Company not found')

    const parsed = await parseJson(request, putInfrastructureSchema)
    if (!parsed.ok) return apiError(parsed.error, 400)

    const config = (company.config && typeof company.config === 'object' ? company.config : {}) as Record<string, unknown>
    // Persiste só a flag sandbox por cargo; merge raso preserva sops e outras chaves.
    const infrastructure: Record<string, { sandbox?: boolean }> = {}
    for (const [roleKey, val] of Object.entries(parsed.data)) {
      if (val.sandbox !== undefined) infrastructure[roleKey] = { sandbox: val.sandbox }
    }
    const nextConfig = { ...config, infrastructure }

    await prisma.company.update({ where: { id }, data: { config: nextConfig as object } })
    return apiOk({ infrastructure })
  } catch (error) {
    console.error('Error updating infrastructure:', error)
    return apiError('Failed to update infrastructure', 500)
  }
})
