// 005-agentic-companies — As 7 fases canônicas do SDLC agêntico (constantes de código,
// não dados por empresa). Derivadas da seção 6 do blueprint
// (docs/empresa_agentica_notebook_lm/Organograma de Empresa Agêntica.md).
//
// `essential` resolve A1: numa execução, uma fase ESSENCIAL com cargo R/A vago →
// `blocked` (não falha silenciosa); uma fase NÃO-essencial vaga → `skipped`.
// Default de essenciais: requirements, design, implementation, testing.

export type RaciValue = 'R' | 'A' | 'C' | 'I'

export interface SdlcPhase {
  /** Chave estável usada na RACI e em CompanyPhaseRun.phase */
  key: string
  /** Rótulo exibido na UI */
  label: string
  /** Objetivo resumido da fase */
  objective: string
  /** Artefatos de saída esperados (alimentam a fase seguinte) */
  outputArtifacts: string[]
  /** Fase essencial → vaga R/A bloqueia o run; não-essencial → é pulada (skipped) */
  essential: boolean
}

/** As 7 fases, em ordem de execução (position 0..6). */
export const SDLC_PHASES: readonly SdlcPhase[] = [
  {
    key: 'planning',
    label: 'Planeamento',
    objective: 'Identificar a viabilidade do projeto, metas iniciais e escopo de negócio global.',
    outputArtifacts: ['Documento Inicial de Planeamento', 'Estudo de Viabilidade'],
    essential: false,
  },
  {
    key: 'requirements',
    label: 'Análise de Requisitos',
    objective: 'Traduzir premissas em necessidades de mercado, fluxos lógicos e casos de uso.',
    outputArtifacts: ['Documento de Requisitos de Produto (PRD)', 'Histórias de Utilizador'],
    essential: true,
  },
  {
    key: 'design',
    label: 'Design do Sistema',
    objective: 'Definir infraestrutura técnica, modelo de dados e interfaces/contratos de API.',
    outputArtifacts: ['Documento de Design de Sistema (SDD)', 'Diagramas', 'Modelos de Dados'],
    essential: true,
  },
  {
    key: 'implementation',
    label: 'Implementação',
    objective: 'Transformar as especificações arquiteturais em código-fonte funcional.',
    outputArtifacts: ['Módulos Executáveis', 'Código-Fonte', 'Aplicação Funcional Básica'],
    essential: true,
  },
  {
    key: 'testing',
    label: 'Teste / QA',
    objective: 'Detetar anomalias contra o PRD via verificação automatizada e o loop revisor (desalucinação comunicativa).',
    outputArtifacts: ['Relatórios de Testes', 'Código Refatorado', 'Regressões Mitigadas'],
    essential: true,
  },
  {
    key: 'deployment',
    label: 'Implantação',
    objective: 'Empacotar e promover o artefacto testado a produção, tornando-o acessível.',
    outputArtifacts: ['Sistema Empacotado (Containers)', 'Pipelines CI/CD Executados', 'Logs de Produção'],
    essential: false,
  },
  {
    key: 'maintenance',
    label: 'Manutenção',
    objective: 'Otimização contínua e correção proativa de falhas descobertas após o lançamento.',
    outputArtifacts: ['Correção de Bugs', 'Atualizações de Software', 'Monitorização de Telemetria'],
    essential: false,
  },
] as const

/** Conjunto ordenado das chaves das fases. */
export const SDLC_PHASE_KEYS: readonly string[] = SDLC_PHASES.map(p => p.key)

/** Lookup por chave. */
export function getPhase(key: string): SdlcPhase | undefined {
  return SDLC_PHASES.find(p => p.key === key)
}
