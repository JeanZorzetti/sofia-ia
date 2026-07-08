# Implementation Plan: BYOS — Token de Assinatura Claude por Usuário

**Branch**: `011-byos-claude-token` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-byos-claude-token/spec.md`

## Summary

Cada usuário pode cadastrar o token OAuth da própria assinatura Claude (`claude setup-token`) em um campo exclusivo da conta, criptografado (AES-256-GCM via `src/lib/crypto.ts`), write-only e verificado ativamente no cadastro. Quando um run de Team/Squad/Company do usuário executa, os dois pontos de consumo Claude existentes (code-agent no sandbox e ClaudeCliService via groq.ts) usam o token do usuário em vez do pool da plataforma — injetado por **AsyncLocalStorage** a partir dos entrypoints de execução, sem tocar no coordinator. Sem token cadastrado, o caminho do pool permanece byte-idêntico.

## Technical Context

**Language/Version**: TypeScript / Next.js 16 (App Router, RSC-first) + worker Node standalone (Docker)

**Primary Dependencies**: Prisma ORM (PostgreSQL), módulo puro existente `src/lib/ai/claude-token-pool.ts` (failover), `src/services/claude-cli-service.ts` (spawn do Claude CLI), `src/lib/crypto.ts` (AES-256-GCM, `ENCRYPTION_KEY`), padrão `withAuth` + zod nas rotas

**Storage**: PostgreSQL via Prisma — nova tabela `user_claude_tokens` (1:1 com `users`), migração formal

**Testing**: jest no CI (não roda local — OneDrive errno -4094); script de verificação sem rede/DB no padrão de `scripts/claude-pool-verify.ts`; gate real = E2E autenticado em produção

**Target Platform**: EasyPanel (Docker) em `polarisia.com.br` — 2 serviços (app Next + worker), ambos com Claude CLI disponível (caminho local-spawn já existe nos dois)

**Project Type**: Web app monolito (Next App Router) + processo worker

**Performance Goals**: verificação ativa no cadastro responde em < 60s (timeout curto, prompt mínimo, 1 turno); zero overhead nos runs sem token (1 query por run para resolver o dono)

**Constraints**: coordinator `runTeam` INTOCADO (Constituição II); comportamento sem token byte-idêntico; token write-only (nunca em GET/logs/exports); migração aplicada manualmente no host real `2.24.207.200:5435` ANTES do push (Constituição III)

**Scale/Scope**: 1 token por usuário; base pequena de usuários (pré-tração); 3 endpoints + 1 página de settings + 1 helper ALS + 2 leituras de override + 1 tabela

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|-----------|-----------|--------|
| I — Ação > Análise | Escopo claro pós-clarify; sem exploração além dos pontos de integração já mapeados | PASS |
| II — Coordinator intocado (NON-NEGOTIABLE) | Injeção por AsyncLocalStorage nos **entrypoints** (worker, runTeamAndWait, dispatch de squads) + leitura do override nos 2 call sites do pool (`code-agent.ts`, `groq.ts`) — ambos já são pontos de extensão do pool, fora do coordinator. `runTeam` não muda. Sem override → `withClaudeTokenFailover` byte-idêntico | PASS |
| III — Migração formal no host real (NON-NEGOTIABLE) | Nova tabela via `prisma migrate dev` local + `prisma migrate deploy` MANUAL em `2.24.207.200:5435` antes do push (task explícita no tasks.md) | PASS |
| IV — Padrões Next 16 + type safety | Rotas novas: `params` Promise (não aplicável — rota fixa), `auth.id`, prisma singleton, zod; sem SDK top-level | PASS |
| V — Segurança multi-tenant | Token criptografado em repouso (crypto.ts), write-only, ownership por `userId` em toda rota, audit log em cadastro/rotação/remoção, nunca logado | PASS |

**Re-check pós-Phase 1**: PASS — o design final não introduziu violação (nenhuma edição no coordinator; entidade nova isolada; contratos write-only).

## Project Structure

### Documentation (this feature)

```text
specs/011-byos-claude-token/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões e alternativas
├── data-model.md        # Phase 1 — entidade UserClaudeToken
├── quickstart.md        # Phase 1 — guia de validação E2E
├── contracts/
│   └── claude-token-api.md  # Phase 1 — contrato REST /api/settings/claude-token
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma                      # + model UserClaudeToken (tabela user_claude_tokens)

src/lib/ai/
├── claude-token-pool.ts               # INALTERADO (módulo puro do pool)
└── claude-token-override.ts           # NOVO — ALS: runWithClaudeToken(token, fn) / currentClaudeTokenOverride()

src/lib/orchestration/team/
└── code-agent.ts                      # ~5 linhas: se override presente → tentativa única com ele (sem pool)

src/lib/ai/
└── groq.ts                            # ~5 linhas: idem no caminho ClaudeCliService.generate

src/worker/index.ts                    # envolve a execução do run com runWithClaudeToken(token do dono)
src/lib/companies/*                    # entrypoint runTeamAndWait: mesmo wrap (identificar exato no tasks)

src/lib/settings/
└── claude-token-service.ts            # NOVO — save (verifica+criptografa+máscara), get metadata, delete

src/app/api/settings/claude-token/
└── route.ts                           # NOVO — GET (metadata) / PUT (cadastrar+verificar) / DELETE

src/app/dashboard/settings/claude/
└── page.tsx                           # NOVO — UI: instruções passo a passo, campo, máscara, remover

tests/ (CI)
└── api/settings/claude-token.test.ts  # NOVO — auth/IDOR/write-only/formato
scripts/
└── claude-override-verify.ts          # NOVO — verificação sem rede/DB (padrão claude-pool-verify.ts)
```

**Structure Decision**: monolito existente — feature entra como 1 tabela + 1 helper puro + 1 service + 1 rota + 1 página, com edições mínimas nos 2 call sites do pool e nos entrypoints de execução. Nenhum arquivo do coordinator é tocado.

## Complexity Tracking

Sem violações da constituição — tabela não aplicável.
