// 005-agentic-companies — detalhe da Empresa. Segmento estático `empresa` coexiste com o
// dinâmico `[id]` (detalhe do AGENTE, INTOCADO). Server wrapper resolve o param (Next 16
// Promise) e delega ao client view com as abas.
import { CompanyDetailView } from '@/components/dashboard/companies/CompanyDetailView'

export default async function CompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  return <CompanyDetailView companyId={companyId} />
}
