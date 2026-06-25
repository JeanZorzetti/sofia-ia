'use client'

// 009-usecase-squads (T020): /agents volta a ser o catálogo do POOL de definições
// reutilizáveis. A galeria de Empresas/Squads migrou para /dashboard/empresas.
// Zero regressão: detalhe do agente /dashboard/agents/[id] permanece intocado.
import { AllAgentsView } from '@/components/dashboard/agents/AllAgentsView'

export default function AgentsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <AllAgentsView />
    </div>
  )
}
