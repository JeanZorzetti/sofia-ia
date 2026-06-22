# Phase 1 — Quickstart: Validação do Dashboard Teams-first

Roteiro de validação manual/E2E que prova a feature ponta a ponta. Mapeia os cenários do `spec.md`
(US1–US3) e os critérios de sucesso (SC).

## Pré-requisitos

- App rodando (dev Windows+OneDrive: `next dev --webpack` — Turbopack quebra nesse ambiente).
- Login no dashboard; conta com ao menos 1 Team e algumas execuções (`TeamRun`) — e uma conta
  "vazia" (sem Teams) para os estados vazios.
- DevTools aberto (Network para conferir `GET /api/teams/overview`; nenhuma chamada a `conversations`/
  `analytics/overview` de atendimento na home).

## Cenário 1 — Overview Teams-first (US1)

1. Abrir `/dashboard` com conta que tem Teams/execuções → ver **KPIs de Teams** (Teams, Execuções no
   período, Taxa de sucesso, Tasks executadas). *(FR-003)*
2. Confirmar que **NÃO** há widgets de atendimento: sem "Conversas Ativas", "Taxa de Conversão",
   "Leads Qualificados", "Tempo Médio de Resposta", "Total Mensagens", "Conversas Recentes". *(FR-002, SC-001)*
3. Conta **sem Teams** → estado vazio com **CTA "Criar Team"** (1 clique até o fluxo de criação). *(FR-004, SC-005)*
4. Trocar período 7d/30d/90d → KPIs sensíveis a tempo recalculam; "Teams" (inventário) não muda. *(FR-006, SC-006)*
5. Badge de saúde do sistema e onboarding (redirect `/onboarding`/wizard) seguem funcionando. *(FR-005)*

## Cenário 2 — Execuções Recentes (US2)

1. Com execuções existentes → ver lista das mais recentes (time, status, início, duração). *(FR-007)*
2. Clicar numa execução → navega para `/dashboard/teams/[id]` (detalhe do time/runs).
3. Execução em andamento → duração aparece como "em andamento" (não como sucesso/falha). *(edge case)*
4. Conta sem execuções → estado vazio coerente, sem erro. *(FR-011)*

## Cenário 3 — Métricas ricas (US3)

1. No período → ver **duração média** e **distribuição sucesso/falha** corretas. *(FR-008)*
2. Ver **custo/tokens** agregados (e por membro, se houver `TeamMemberUsage`); runs antigas sem custo
   não distorcem médias. *(FR-008, edge case)*
3. **Gráfico de atividade de Teams** (execuções/tasks/custo por dia) reflete o período; trocar período
   recalcula. *(FR-009, SC-006)*

## Multi-tenant (FR-010 / SC-003)

- Com duas contas distintas, cada `/dashboard` mostra **apenas** os Teams/execuções do próprio usuário.
- No Network, a resposta de `GET /api/teams/overview` não contém ids de execuções de outro tenant.

## Não-regressão

- Onboarding, seletor de período e badge de saúde inalterados.
- Nenhuma rota existente quebrada; nenhuma migração; coordinator `runTeam` intocado.

## Gate real (constituição V)

Gate de build local: `npm run typecheck` + `npm run build` (`Compiled successfully`; ignorar a falha de
cópia do `standalone` — OneDrive errno -4094). Validação definitiva = **E2E autenticado em produção**
(`polarisia.com.br`) após deploy.
