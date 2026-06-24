// 005-agentic-companies — Tipos compartilhados da UI de Empresas (organograma, RACI, SDLC, etc.)
import type { RaciValue } from '@/lib/companies/sdlc'

export type CompanyLayer = 'strategic' | 'tactical' | 'operational'

export interface StaffedAgent {
  id: string
  name: string
  model: string
  status: string
}

export interface CompanyRoleDTO {
  id: string
  key: string
  title: string
  layer: string
  department: string | null
  position: number
  agentId: string | null
  agent: StaffedAgent | null
}

export interface AgentOption {
  id: string
  name: string
}

export type RaciMatrix = Record<string, Record<string, RaciValue>>

export interface SdlcPhaseDTO {
  key: string
  label: string
  objective: string
  outputArtifacts: string[]
  essential: boolean
}

export interface CompanyDTO {
  id: string
  name: string
  niche: string
  typology: string
  description: string | null
  raci: RaciMatrix
  config: { sops?: Record<string, string>; infrastructure?: Record<string, { sandbox?: boolean }> }
}

export interface CompanyDetail {
  company: CompanyDTO
  roles: CompanyRoleDTO[]
  raci: RaciMatrix
  sdlc: SdlcPhaseDTO[]
}

export const LAYER_LABEL: Record<string, string> = {
  strategic: 'Estratégica (C-level)',
  tactical: 'Tático-Gerencial',
  operational: 'Operacional',
}

export const LAYER_ORDER: CompanyLayer[] = ['strategic', 'tactical', 'operational']
