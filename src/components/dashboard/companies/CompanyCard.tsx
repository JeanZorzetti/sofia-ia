'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users } from 'lucide-react'

export interface CompanySummary {
  id: string
  name: string
  niche: string
  typology: string
  description: string | null
  roleCount: number
  staffedCount: number
  vacantCount: number
}

const TYPOLOGY_LABEL: Record<string, string> = {
  generalist: 'Generalista',
  specialist: 'Especialista',
  hybrid: 'Híbrida',
}

/** Prettify a niche key (software_house → Software House) for display. */
export function nicheLabel(niche: string): string {
  return niche.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function CompanyCard({ company, onNavigate }: { company: CompanySummary; onNavigate: (id: string) => void }) {
  return (
    <Card
      className="glass-card hover-scale cursor-pointer transition-opacity"
      onClick={() => onNavigate(company.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-white text-base truncate">{company.name}</CardTitle>
              <p className="text-xs text-white/50 truncate">{nicheLabel(company.niche)}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">{TYPOLOGY_LABEL[company.typology] ?? company.typology}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between pt-1 text-xs text-white/60">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {company.staffedCount}/{company.roleCount} cargos ocupados
          </span>
          {company.vacantCount > 0 && (
            <Badge variant="outline" className="text-xs border-amber-400/40 text-amber-300">
              {company.vacantCount} vaga{company.vacantCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
