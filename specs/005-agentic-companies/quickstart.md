# Quickstart — Validação E2E: Empresas Agênticas

Guia de validação que prova a feature ponta a ponta. Detalhes de entidades/rotas em
[data-model.md](./data-model.md) e [contracts/api.md](./contracts/api.md).

## Pré-requisitos

- Migração `add_agentic_companies` aplicada no host real `2.24.207.200:5435`
  (`prisma migrate deploy`) **antes** do deploy.
- `prisma generate` rodou antes do `next build`.
- Usuário autenticado com ≥3 agentes existentes (para encaixar em cargos).
- Para a execução: usar **Claude CLI** no worker, nunca provider `:free` (rate-limit quebra runs) —
  ver `polaris_teams_use_claude_cli`.

## Cenário 1 — Estrutura (US1, P1)

1. Em `/dashboard/agents`, ver a **galeria de Empresas** (não mais a lista chapada).
2. Criar empresa "Minha Software House" a partir do nicho **Software House**.
3. **Esperado**: organograma com 3 camadas (strategic/tactical/operational) e todos os cargos semente,
   inicialmente **vagos** (SC-001, < 2 min).
4. Encaixar um agente existente no cargo **Backend**; ver a vaga preenchida (SC-002).
5. Tentar encaixar o **mesmo** agente em **Frontend** → **bloqueado** com "já ocupa outro cargo"
   (FR-003a / regra 1:1).
6. Abrir "Todos os agentes" → a lista de agentes continua acessível (FR-006).

## Cenário 2 — Governança e processo (US2, P2)

1. Abrir a aba **Governança**: matriz RACI (cargos × 7 fases) **pré-preenchida** do blueprint (Q3).
2. Numa fase, marcar um segundo cargo como **A** e salvar → **rejeitado**: "precisa de exatamente 1
   Accountable" (FR-010 / SC-003).
3. Corrigir para 1 A e salvar → ok.
4. Abrir a aba **SDLC**: as 7 fases mostram objetivo, artefatos e os cargos atuantes (derivados da
   RACI) (SC-004).

## Cenário 3 — Execução (US3, P3)

1. Garantir que os cargos **A** e **R** das fases têm agentes encaixados.
2. Disparar **Executar** com a missão "Construir um TODO app com API REST".
3. **Esperado**: `CompanyRun` progride **sequencialmente** pelas 7 fases; cada fase cria um `TeamRun`
   real (`status:'internal'`, **não** aparece em `/dashboard/teams`) via `runTeamAndWait`.
4. Na aba **Execuções**, ver o status fase-a-fase + artefato de cada fase; o artefato da fase N aparece
   como entrada da N+1 (FR-015a / SC-005).
5. Na fase **Teste/QA**, confirmar o loop revisor (QA = reviewer do Time) devolvendo trabalho ao
   executor (FR-017).
6. **Caso de borda**: deixar o cargo R de uma fase vago e executar → run fica **blocked** com o motivo,
   sem falha silenciosa.

## Cenário 4 — Clonagem por nicho (P4)

1. Clonar "Minha Software House" como "Outra Empresa".
2. **Esperado**: organograma + RACI reproduzidos; cargos nascem **vagos** (agentes não migram — 1:1 +
   isolamento de tenant) (SC-006, < 1 min).

## Regressão (SC-007)

- `/dashboard/teams`, criação/execução de Times e detalhe de Agente (`/dashboard/agents/[id]`)
  continuam funcionando idênticos. Nenhum Time `internal` aparece na UI de Times.
- Diff do coordenador (`team-coordinator.ts`, `team-executor.ts`) = **vazio** (Princípio II).

## Gate de conclusão

- jest (CI): unit dos helpers `validateRaci` / `buildPhaseRoster` + testes de rota IDOR/auth das
  rotas de Empresa.
- E2E autenticado em produção (EasyPanel + login) — gate real.
