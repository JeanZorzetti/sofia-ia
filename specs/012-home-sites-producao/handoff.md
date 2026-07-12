# Handoff — 012 Home V4 ("Sites de produção, não protótipos")

**Data:** 2026-07-12 · **Branch:** `main` · **Status:** spec/clarify/plan/tasks COMPLETOS; implementação NÃO iniciada (T001–T017 pendentes).

## O que foi feito nesta sessão

- **spec.md** — 4 user stories (US1 intake+home = MVP; US2 nada removido; US3 prova cética; US4 SEO/GEO), FR-001–FR-010, edge cases, critérios mensuráveis. Seção **Clarifications 2026-07-12** com as 6 ambiguidades resolvidas.
- **plan.md** — Constitution Check PASS (sem banco, sem coordinator); estrutura de arquivos definida (tudo em `(public)/` + `src/data/` + extensão retrocompatível de `/api/crm/lead`).
- **research.md** — R1–R6 (reuso do proxy CRM, `/peca-seu-site`, copy tipada em `home-v4.ts`, schema Service, sem redirects, screenshot TeamRun).
- **contracts/intake-lead.md** — payload estendido do POST `/api/crm/lead` (honeypot, siteType/currentSite/goal→notes, subject `site-intake`), com garantia de não-regressão do ContactForm.
- **quickstart.md** — 5 cenários E2E de produção.
- **tasks.md** — 17 tasks em 6 fases, MVP = Phases 1–3.

## Decisões (e por quê)

- **Intake reusa `/api/crm/lead`** (Sirius CRM): proxy já em produção servindo `/contato`; extensão só concatena campos novos em `notes`. Sem tabela nova, sem migração (não há gate de `prisma migrate` nesta feature).
- **`/peca-seu-site` como página própria**: URL falável/rastreável; CTA do hero aponta pra ela.
- **Copy tipada com `source` obrigatório** na comparativa: FR-007 (toda crítica com fonte) vira erro de compilação, não checklist.
- **Ordem de migração**: home atual vai para `/plataforma` (T002) ANTES de `/` ser reescrita (T008) — nunca há home quebrada no meio do caminho.
- **Preço sem números** (FR-010): tabela de valores é decisão pendente do Jean (§5 da estratégia) — a seção comunica o modelo e converte para o intake.

## Próximos passos (em ordem)

1. `speckit-implement` — executar T001–T017 do tasks.md (MVP = T001–T012).
2. Baseline PSI da home ATUAL antes do push (T015 — necessário para SC-005).
3. Deploy (T016) + E2E produção (T017) e registrar evidências aqui.

## Pendências / decisões em aberto

- **Tabela de preços** (valores por escopo landing/institucional/site+blog): decisão do Jean, não bloqueia — entra depois como atualização de conteúdo.
- **Screenshot da UI de TeamRun** (T011): capturar de um run real durante a implementação.
- **Traduzir home nova (en/es)**: fora de escopo, iteração futura.

## Gotchas de ambiente

- jest não roda local (OneDrive errno -4094) — teste da rota (T012) valida no CI.
- Lighthouse local não confiável — performance só em produção (PSI), baseline ANTES do deploy.
- `SIRIUS_CRM_API_KEY`/`SIRIUS_CRM_URL` já configuradas em produção (o form de `/contato` funciona E2E desde 11/07).
- Build: `prisma generate` antes de `next build`; operações de DB no build envoltas em `|| echo skipped`.
