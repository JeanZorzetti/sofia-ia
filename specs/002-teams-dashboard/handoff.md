# Handoff — Dashboard Teams-first (002-teams-dashboard)

**Sessão**: 2026-06-22 (planejamento Spec Kit + protótipo Ralph) · **Status**: ✅ Spec Kit completo até `tasks.md` (specify → plan → tasks) · ✅ protótipo Ralph em `ralph/` · ⏳ **implementação NÃO iniciada** · **Próximo passo**: implementar (via loop Ralph OU `/speckit-implement`), começando pelo MVP (US1)

## O que foi feito nesta sessão

1. **Protótipo Ralph** ([ralph/](../../ralph/), commit `1e232e2`): loop autônomo fino que dirige `/speckit-implement` 1 task por vez (contexto novo por iteração), com 3 amarras (escopo 1-feature · gate tolerando OneDrive errno -4094 · parada dura em `[HUMAN]`/migração/E2E). Spec Kit segue como cérebro.
2. **Feature 002-teams-dashboard** — planejamento completo:
   - `spec.md` (commit `b6dcedc`): home Teams-first; remover atendimento/WhatsApp; analytics de Teams em 3 fatias.
   - `plan.md` + `research.md` + `data-model.md` + `contracts/teams-overview.md` + `quickstart.md` (commit `2fb9a6c`).
   - `tasks.md` (este commit): 14 tasks por user story.
   - Referência SPECKIT no `CLAUDE.md` repontada para esta feature (local; não commitado — CLAUDE.md tem mudanças pré-existentes não-minhas).

## Decisões de plano (ver research.md)

- **Scoping = `team.createdBy = auth.id`** (NÃO organização — `Team` não tem `organizationId`). Corrige a premissa "usuário/Organização" do spec.
- **Custo/duração JÁ existem**: `TeamRun.{durationMs,tokensUsed,estimatedCost,turnsUsed,startedAt,completedAt}` + `TeamMemberUsage` (tokens por membro). US3 entrega de verdade (fallback só p/ linhas nulas).
- **Status**: sucesso = `completed`; finalizados = `completed|failed|rate_limited|cancelled`; `{pending,running}` = em andamento. Tasks executadas = `TeamTask status='done'`.
- **Endpoint novo** `GET /api/teams/overview` espelha `analytics/overview` (`withAll` + `parsePeriod` + `auth.id`); cresce por fatia (overview → +recentRuns → +timeline/byMember).
- **Sem migração**; **coordinator `runTeam` intocado** (read-side puro).

## Próximos passos

**Opção A — rodar o loop Ralph** (implementação autônoma):
```powershell
pwsh ralph/ralph.ps1 -FeatureDir specs/002-teams-dashboard          # 1 task/iteração, com prompt de permissão
pwsh ralph/ralph.ps1 -FeatureDir specs/002-teams-dashboard -Yolo     # autônomo (git/npm sem prompt)
```
O loop para sozinho em T013/T014 (`[HUMAN]`).

**Opção B — implementar em sessão** via `/speckit-implement` (ou manual), começando pelo MVP:
- Foundational T002 (endpoint) → US1 T003–T005 (reescrita da home) → **parar e validar** (MVP) → US2 → US3.

## Gates / pendências (gate real = constituição V)

- **T012**: gate de build local (`typecheck` + `build` compile OK; ignorar errno -4094 do standalone).
- **T013 [HUMAN]**: quickstart 1–3 + multi-tenant em dev (`next dev --webpack`) — browser/login.
- **T014 [HUMAN]**: E2E autenticado em prod (`polarisia.com.br`) após deploy.

## Gotchas

- **PowerShell perde cwd** entre chamadas → `Set-Location` em cada comando (raiz default = `ROI Labs`, não o subprojeto).
- **OneDrive errno -4094**: `next build` compila + gera as páginas; só a cópia do `standalone` falha local. Não é regressão.
- **Hook `agent-context` quebrado** neste ambiente → updates do bloco SPECKIT no `CLAUDE.md` são manuais.
- **Link da US2**: "Execuções Recentes" → `/dashboard/teams/[teamId]` (não há rota de UI por-run; só API). Confirmar se a página do time aceita `?run=<id>` para focar.
- Coordinator/schema **intocados** — feature read-side, sem migração.
