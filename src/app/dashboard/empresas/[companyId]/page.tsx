// 009-usecase-squads — /dashboard/empresas/[companyId]: detalhe da empresa com aba Squads.
// Porta o CompanyDetailView (existente) para a rota dedicada /empresas e
// adiciona a aba "Squads" (cards com botão Rodar + composer de squads).
import { EmpresaDetailView } from '@/components/dashboard/squads/EmpresaDetailView'

export default async function EmpresaDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  return <EmpresaDetailView companyId={companyId} />
}
