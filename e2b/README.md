# E2B sandbox template — Polaris Teams Code Factory

Template custom do sandbox onde o worker (`src/worker/index.ts`) roda o Claude Code CLI
para code-runs. Pré-instalar o CLI + git corta o bootstrap por-run (que dominou o tempo
no 1º teste) e mantém cada turno bem abaixo do timeout por-turno de 15 min.

## Pré-requisitos
- E2B CLI: `npm i -g @e2b/cli`
- Login: `e2b auth login` (precisa da conta E2B; a mesma `E2B_API_KEY` do worker).

## Build (v2 — o build v1 foi DESCONTINUADO e hard-falha)

O CLI agora exige o build system v2 (`e2b template build` v1 só imprime o aviso e sai com erro).

### Recomendado: deixar o `migrate` converter este Dockerfile
```bash
cd e2b
e2b template migrate     # gera template.ts + build.dev.ts + build.prod.ts (lê este e2b.Dockerfile)
# rode o script de build que ele gerar — o migrate imprime o comando exato. Em geral:
npx tsx build.prod.ts
```
> ⚠️ A API v2 varia por versão do CLI/SDK. Se o comando exato não estiver claro, cole a
> saída do `migrate` pro Claude que ele te dá o próximo passo.

### Fallback: build via SDK (`build-template.ts` deste diretório)
Use se o `migrate` reclamar (ex.: falta `e2b.toml`):
```bash
cd e2b
npm i e2b            # o SDK `e2b` NÃO está no node_modules local (é optional-dep do projeto)
E2B_API_KEY=<sua_key> npx tsx build-template.ts
```

Em qualquer caminho, o **nome do template é `polaris-code-factory`** → é esse o valor de `SANDBOX_TEMPLATE`.

## Depois do build
1. O build imprime um **template id**. Copie-o.
2. No serviço **worker** (EasyPanel), adicione/ajuste:
   - `SANDBOX_TEMPLATE=<template id>`  → o worker passa pra `Sandbox.create(templateId, …)`.
   - `SANDBOX_TIMEOUT_MS=2700000`       → lifetime do sandbox = 45 min (cobre a run inteira).
3. Redeploy do worker.

## Como o worker usa
- `src/lib/sandbox/index.ts` → `createE2BProvider()`; `src/lib/sandbox/e2b.ts` usa
  `Sandbox.create(templateId, { apiKey, timeoutMs })` quando `SANDBOX_TEMPLATE` existe.
- `src/worker/index.ts:74` lê `process.env.SANDBOX_TEMPLATE` (`undefined` → base do provider).
- Com o CLI pré-instalado, o `command -v claude || npm i -g …` em `sandbox-cli-agent.ts`
  vira no-op rápido.

## Limite remanescente (fallback)
O timeout **por-turno** do CLI no sandbox é 15 min fixo (`sandbox-cli-agent.ts`, default não
passado pelo worker). Com este template + gate mais leve (typecheck por task, 1 build no fim),
cada turno deve caber. Se um turno de `next build` ainda estourar 15 min, o próximo passo é
tornar esse timeout configurável (`SANDBOX_CLI_TIMEOUT_MS`) — code-agent.ts repassa pra
`runClaudeInSandbox`. Não feito agora para manter o patch mínimo.
