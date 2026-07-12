# Polaris Teams — Prompt inicial da Sessão 3

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: Sub-projeto C — Code Factory.**

---

## Contexto pra continuar (Polaris Teams)

Programa **"Polaris Teams"**: importar conceito/UX/protocolo da **Agent Teams AI** (Electron OSS de orquestração de times de agentes de código, `C:\dev\agent-teams-ai`) pra **Polaris** (antiga Sofia = `sofia-next`, deploy EasyPanel em `polarisia.com.br`, GitHub `JeanZorzetti/sofia-ia`). Roadmap geral em `docs/Polaris Teams/ROADMAP.md` (3 sub-projetos: **A — Teams Core**, **B — Teams UX**, **C — Code Factory**). Cadência: **um sprint por sessão**; confirmar abordagem antes de executar (regra global).

### O que JÁ foi feito ✅ (sessões 1 e 2)

**Sub-projeto A — Teams Core** (entregue 2026-06-13, em prod). Entidade **dedicada** (NÃO a strategy `'team'` no execute route de orchestrations — esse acoplamento foi rejeitado): tabelas Prisma `Team/TeamMember/TeamRun/TeamTask/TeamMessage` + rotas `/api/teams/*`. Engine em `src/lib/orchestration/team/`: `team-coordinator.ts` (`runTeam`, loop Lead-orquestrado), `team-protocol.ts` (diretivas por linha `@TASK/@MESSAGE/@DONE/@APPROVE/@REJECT`, NÃO JSON), `team-prompts.ts`, `team-board.ts`, `team-roster.ts`, `team-store.ts` (`TeamStore` = porta injetada → coordinator testável sem DB), `team-types.ts`. Reviewer automático.

**Sub-projeto B — Teams UX** (entregue 2026-06-14, em prod). Slices 1-5:
1. **Run ao vivo sem fila:** `POST /api/teams/[id]/run` dispara o coordinator via **`after()` do `next/server`** e devolve `{runId}` na hora (era síncrono, ~5min). O SSE de `runs/[runId]/stream` **já existia e já fazia polling do DB** — só era inútil porque o POST era síncrono. Órfãos reconciliados por TTL (`team-reconcile.ts`).
2. **Override de modelo + effort por membro:** `ChatFn` ganhou 4º param `options`; coordinator passa `{model,effort}` do membro; `chatWithAgent` aplica mutando `agent.model` + `reasoning_effort` (só OpenRouter).
3-5. UI no design system (lista/criar/editar com pickers), **run view ao vivo** (`TeamRunView`: kanban, feed de atividade, histórico, métricas), **grafo de topologia** (`TeamGraph`, XY Flow).

**Gestão + disponibilidade** (também 2026-06-14): excluir time (arquivar), editar time (modal + `RosterEditor` compartilhado), **verificação de disponibilidade de modelo** (`src/lib/ai/model-availability.ts` + `/api/models` com status + `POST /api/models/test` ping ao vivo + página `/dashboard/models`). Sidebar agora tem **Modelos** (antes) e **Teams** (era órfão) em "Plataforma".

### Pendência menor (não bloqueia C)
**Slice 6 — drag-drop human-in-the-loop** no kanban (+ rota `PATCH` de task): **deferido por decisão** (board é dirigido por agente → valor marginal; dep nova `@dnd-kit` com risco OneDrive). Reabrir só se sentir falta.

### ⚠️ Gotchas de ambiente desta máquina (crítico)
- Projeto no **OneDrive**, que corrompe `node_modules` (errno -4094): **`jest`, `next build` e `require('pg')` TRAVAM/crasham localmente.** NÃO rodá-los aqui.
- Verificação confiável local: **`npx tsc --noEmit`** (type-safety) + **`npx tsx <script>.ts`** com `node:assert` e **imports relativos** (tsx não resolve o alias `@/`) pra lógica pura.
- **Gate real de build/jest = deploy no EasyPanel** (Linux limpo). Deploy = **push na `main`** → auto-deploy. Não dá pra ver os logs do EasyPanel daqui; **verificação E2E autenticada fica com o usuário** (sem credenciais de login no ambiente do Claude).
- **Prisma migrate funciona** (binário schema-engine, não o `pg` JS): `prisma migrate status/deploy` com `DATABASE_URL` inline.
- Caminhos com `[id]`/`[runId]` no git: usar pathspec `:(literal)`.
- Commits multi-linha no PowerShell: here-string **em variável** (`$msg = @' ... '@; git commit -m $msg`), nunca inline depois de `-m`.

### Banco de produção / segredos
- Real e alcançável: **`sofia_db@2.24.207.200:5435/sofia_db`** (mesmo VPS do Compass). O `.env` aponta pra `bot@31.97.23.166:5499` que **dá timeout** — usar o de cima pra migrate.
- 🔐 Senha do Postgres já exposta no chat — **rotacionar** (higiene).

---

## Foco desta sessão: Sub-projeto C — Code Factory 🏭

> Gancho: ler a seção **"Sub-projeto C — Code Factory"** em `docs/Polaris Teams/ROADMAP.md` antes de começar.

**Objetivo (do ROADMAP):** permitir que um Team rode agentes de **CÓDIGO** (não só LLM) — versão cloud da Agent Teams AI / "software house na nuvem". Casa com a tese da **Estética Fábrica**.

**Natureza:** **produto novo, não import.** O runtime de código da Agent Teams AI (`claude-multimodel` + `child_process` + filesystem local) **não porta pra web** — precisa ser reconstruído como serviço cloud.

**Net-new (infra pesada):**
- **Sandbox isolado por run** (avaliar E2B / Daytona / Modal / Firecracker / Docker-per-run).
- **Integração git** (clone/branch/commit/PR) + exec seguro de comandos.
- **Streaming de terminal/diff** pra UI (substitui xterm/node-pty do desktop).
- **Code review com diff** (ref. conceitual: módulo `review` da Agent Teams AI + `node-diff3`).

**O que reusa (não reescrever):**
- **O spine de coordenação do A** (roster, message bus, board, reviewer loop em `src/lib/orchestration/team/`) — mesmo cérebro, runtime diferente. Avaliar como o `ChatFn`/execução de membro vira "executar agente de código no sandbox".
- **A UX do B** (kanban, feed, grafo, run view) — trocar/estender o painel de saída por **terminal + diff**.

**Decisão-chave transversal (estava adiada de propósito até aqui):** a execução da Polaris hoje é **síncrona/in-process** (o B usa `after()` + reconciliação por TTL, sem fila durável). **C quase certamente exige fila assíncrona durável** — BullMQ/Temporal + **Redis (já está no stack)**. Decidir a fila NO spec do C.

**Dependências:** A e B prontos ✅. **Esforço: Alto · Risco: Alto.** Spec e plano **próprios**, track separado.

## O que fazer nesta sessão
1. **Brainstorm + spec do C** (use as skills superpowers: brainstorming → writing-plans). **Confirmar escopo comigo primeiro** — C é grande e ambíguo; provavelmente vale fatiar (ex.: C0 = fila durável + 1 sandbox provider + exec de 1 comando; C1 = git clone/branch/commit; C2 = terminal/diff streaming; C3 = code review com diff). Não tentar tudo num sprint.
2. Decisões a fechar no spec, em ordem: **(a) provider de sandbox** (E2B/Daytona/Modal/Docker-per-run — custo, isolamento, DX); **(b) fila** (BullMQ vs Temporal sobre o Redis do stack); **(c)** como o coordinator do A invoca "agente de código no sandbox" (estende `ChatFn`? nova primitiva de execução?); **(d)** modelo de dados pro run de código (logs/diff/PR) — estende `TeamRun`/`TeamTask` ou tabelas novas.
3. **Não** detalhar nada além do escopo confirmado. Um sprint por sessão; commit limpo por fatia; push ao concluir.

> Comece confirmando comigo o **escopo da primeira fatia do C** antes de escrever spec ou código.
