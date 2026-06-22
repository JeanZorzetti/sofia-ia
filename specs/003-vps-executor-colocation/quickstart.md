# Quickstart — Validação E2E

Guia de validação da Fase 1 (executor self-hosted + co-localização). Não contém implementação — só como provar que funciona. Detalhes de interface em [contracts/](./contracts/), entidades em [data-model.md](./data-model.md).

## Passo 0 (PRÉ-REQUISITO) — Worker dedicado no EasyPanel

Sem isto, runs ficam `pending` para sempre (independe do provider).

1. Criar um serviço **separado** do `app` no EasyPanel (mesmo repo/imagem), start `npm run worker` (`Dockerfile.worker`).
2. Montar um **volume** para `VPS_RUNS_DIR` (ex.: `/runs`).
3. Setar no worker: `SANDBOX_PROVIDER=vps-local`, `VPS_RUNS_DIR=/runs`, `REDIS_URL`, `DATABASE_URL` (mesmo banco do app), `GITHUB_TOKEN` (push), `CLAUDE_CODE_OAUTH_TOKEN(S)`, `CODE_RUN_CONCURRENCY=1` (conservador na VPS).
4. Conferir nos logs: `[worker] code-run worker online (queue=code-run, ...)` e a contagem do pool de tokens claude.

## Verificações locais (sem deploy)

```bash
# Gate do motor (tsx, padrão do projeto — jest só no CI):
npx tsx scripts/vps-local-verify.ts      # namespacing por run, setTimeout no-op, close=rm-rf, connect reanexa
npx tsx scripts/colocation-verify.ts     # enriquecimento lead/reviewer; worker/sem-workdir byte-idêntico
npx tsx scripts/c0-verify.ts && npx tsx scripts/c1-verify.ts \
  && npx tsx scripts/c2-verify.ts && npx tsx scripts/c3-verify.ts   # sem regressão no motor
npm run typecheck
```

Resultado esperado: todos verdes; `tsc` limpo.

## Cenário A — US1 (sem teto de tempo) · SC-001/SC-002

1. Com `SANDBOX_PROVIDER=vps-local`, disparar uma missão de code-mode num repo cujo trabalho ultrapasse ~60 min (ou simular com uma tarefa longa).
2. **Esperado**: o run continua além de 60 min e chega a `completed` com `commitSha`/`changedFiles` — **sem** erro de "sandbox não está mais ativo".
3. Disparar também uma missão curta e confirmar entrega (commit/push/PR ou direct) **idêntica** ao E2B (zero regressão).

## Cenário B — US3 (troca de backend) · SC-005

1. Trocar `SANDBOX_PROVIDER=e2b` → rodar a mesma missão → funciona como antes (E2B intocado).
2. Trocar para `vps-local` → mesma missão → funciona no executor self-hosted.
3. `SANDBOX_PROVIDER=foo` → o run falha com erro **claro** (FR-004). Nenhuma mudança no coordinator entre os casos.

## Cenário C — US2 (lead/reviewer enxergam o repo) · SC-003

1. Time com lead+worker+reviewer (modelos de chat baratos / Groq).
2. **Lead**: confirmar no board que as `@TASK` referenciam arquivos **que existem** (o plano não "inventa" caminhos) — efeito do retrato do repo injetado.
3. **Reviewer**: confirmar que o veredito reflete o diff real + verificação (ex.: o reviewer roda `@RUN`/cita resultado), e **não** entra em loop de rejeição falsa contra `/app`.
4. **Esperado**: zero rejeição falsa em loop; custo de lead/reviewer equivalente ao atual (SC-007).

## Cenário D — Dogfooding 002 · SC-004 (objetivo final)

1. Seguir [specs/002-teams-dashboard/polaris-team-setup.md](../002-teams-dashboard/polaris-team-setup.md) (agentes, team, missão), com **`gitMode=direct`** e **preview off**.
2. Disparar a missão pela própria Polaris (`/dashboard/teams`).
3. **Esperado**: run `completed`; **novo commit na `main`** de `sofia-ia` com `src/app/api/teams/overview/route.ts` + `src/app/dashboard/page.tsx`; gate de build verde; `team-coordinator.ts` comprovadamente inalterado; sem migração.

## Cenário E — Limpeza · SC-006

1. Após um run sem preview, confirmar que `${VPS_RUNS_DIR}/<id>` **não existe** (removido pelo `close()`).
2. Simular crash (matar o worker mid-run) → reiniciar → confirmar que o **sweep de boot** remove o dir órfão; uso de disco volta ao baseline.

## Gate real (Constituição)

A validação definitiva é **E2E autenticado em produção** (EasyPanel + login), não os scripts locais. Cenário D é o critério de fechamento da feature.
