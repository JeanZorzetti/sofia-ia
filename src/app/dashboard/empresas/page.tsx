// 009-usecase-squads — /dashboard/empresas: galeria de Empresas (guarda-chuva).
// Porta a CompaniesGallery que ficava em /agents e transforma empresas em cards
// de agrupamento para navegação até /empresas/[id] (squads).
import { CompaniesGallery } from '@/components/dashboard/companies/CompaniesGallery'

export default function EmpresasPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <CompaniesGallery empresasBasePath="/dashboard/empresas" />
    </div>
  )
}
