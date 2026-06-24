'use client'

// 005-agentic-companies (FR-006): a seção de agentes vira a galeria de Empresas (ponto de
// entrada principal). A antiga lista chapada de agentes continua acessível na aba secundária
// "Todos os agentes" — zero regressão no fluxo de Agentes/pastas/drag-drop.
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Building2, Bot } from 'lucide-react'
import { CompaniesGallery } from '@/components/dashboard/companies/CompaniesGallery'
import { AllAgentsView } from '@/components/dashboard/agents/AllAgentsView'

export default function AgentsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="companies" className="gap-1.5"><Building2 className="h-4 w-4" />Empresas</TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5"><Bot className="h-4 w-4" />Todos os agentes</TabsTrigger>
        </TabsList>
        <TabsContent value="companies"><CompaniesGallery /></TabsContent>
        <TabsContent value="agents"><AllAgentsView /></TabsContent>
      </Tabs>
    </div>
  )
}
