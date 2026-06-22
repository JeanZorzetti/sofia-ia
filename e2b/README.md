# E2B sandbox template — Polaris Teams Code Factory

Template custom do sandbox onde o worker (`src/worker/index.ts`) roda o Claude Code CLI
para code-runs. Pré-instalar o CLI + git corta o bootstrap por-run (que dominou o tempo
no 1º teste) e mantém cada turno bem abaixo do timeout por-turno de 15 min.

## Pré-requisitos
- E2B CLI: `npm i -g @e2b/cli`
- Login: `e2b auth login` (precisa da conta E2B; a mesma `E2B_API_KEY` do worker).

## Build (caminho recomendado — canônico)
```bash
# scaffold oficial (garante a base correta para sua versão do SDK)
cd e2b
e2b template init           # gera e2b.Dockerfile + e2b.toml
# edite o e2b.Dockerfile gerado e ADICIONE estas duas camadas ao final:
#   RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
#   RUN npm install -g @anthropic-ai/claude-code
e2b template build --name polaris-code-factory
```

## Build (alternativo — usando o Dockerfile já versionado aqui)
```bash
cd e2b
e2b template build --name polaris-code-factory --dockerfile e2b.Dockerfile
```
> Se o `FROM e2bdev/code-interpreter:latest` não bater com a base atual do E2B (que já
> traz Node), troque pelo que o `e2b template init` usar e mantenha os dois `RUN`.

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
