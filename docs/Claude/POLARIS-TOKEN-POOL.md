# Pool de 3 contas Claude com failover (Polaris Teams)

Quando um time Polaris usa um modelo `claude-*`, ele roda o Claude Code autenticado por
`CLAUDE_CODE_OAUTH_TOKEN`. Com **uma** conta, bater o limite (janela ~5h / cap semanal) **derruba a
run**. Este recurso mantém um **pool de até 3 contas**: ao detectar limite, a conta gasta entra em
cooldown e a **mesma chamada é re-tentada com a próxima conta livre**.

> Diferente da rotação file-swap (`ROTACAO-CONTAS-CLAUDE.md`), que serve só ao terminal interativo.
> Os times rodam no servidor e autenticam por token de env — por isso o failover vive no código.

## Como funciona (visão geral)

- Módulo único [claude-token-pool.ts](../../src/lib/ai/claude-token-pool.ts): carrega os tokens do
  env, detecta limite (`isClaudeRateLimit`), mantém cooldown por conta e expõe
  `withClaudeTokenFailover`.
- Os **dois** pontos onde um time consome Claude foram religados no failover, sem tocar no coordinator:
  - **Worker (edita o repo)** → [sandbox-cli-agent.ts](../../src/lib/orchestration/team/sandbox-cli-agent.ts)
    lança `ClaudeRateLimitError` no exit de limite; [code-agent.ts](../../src/lib/orchestration/team/code-agent.ts)
    re-tenta com a próxima conta.
  - **Lead/revisor/conversa** → [claude-cli-service.ts](../../src/services/claude-cli-service.ts)
    aceita o token por chamada; [groq.ts](../../src/lib/ai/groq.ts) envolve no failover.
- **Cooldown** = 5h por conta, **in-memory por processo** (o app Next e o worker mantêm mapas
  separados — pior caso é 1 probe extra por processo numa conta limitada, que falha rápido e
  rotaciona). Redis compartilhado fica como evolução futura (v2).

## Setup (uma vez)

### 1) Gerar 1 token de longa duração por conta
No seu terminal, logado em **cada** conta, rode:
```bash
claude setup-token
```
Copie o token gerado (formato `sk-ant-oat...`). Repita logando na conta 2 e na conta 3 → **3 tokens**.

> Dica: dá pra usar a rotação local (`cc1`/`cc2`/`cc3` do outro runbook) para alternar a conta logada
> antes de cada `claude setup-token`.

### 2) Setar no EasyPanel
Defina a env var **nos DOIS serviços** do Polaris (o app Next **e** o worker), pois cada um roda um
caminho:
```
CLAUDE_CODE_OAUTH_TOKENS=sk-ant-oat-conta1,sk-ant-oat-conta2,sk-ant-oat-conta3
```
- Aceita lista separada por **vírgula ou nova-linha** (sem espaços é o ideal).
- ⚠️ É **`CLAUDE_CODE_OAUTH_TOKENS`** (plural, com **S**). Por robustez, o singular
  `CLAUDE_CODE_OAUTH_TOKEN` também aceita uma lista com vírgula (erro comum), mas prefira o plural.
- Alternativa: `CLAUDE_CODE_OAUTH_TOKEN_1/_2/_3` (numerado).
- Opcional: `CLAUDE_TOKEN_COOLDOWN_MS` (default `18000000` = 5h).

Redeploy os dois serviços.

## Verificação

- **Unit/integração (sem rede/DB):**
  ```bash
  npx tsx scripts/claude-pool-verify.ts
  ```
  Cobre parsing, detecção de limite, failover (sucesso/rotação/cooldown/exaustão/back-compat) e a
  integração com o sandbox (token rotaciona entre as chamadas).
- **Tipos:** `npx tsc --noEmit` limpo.
- **Staging real:** com `CLAUDE_CODE_OAUTH_TOKENS=<token_exaurido>,<token_bom>`, disparar uma task de
  worker `claude-*` → a run conclui via 2ª conta; o log do worker mostra a rotação e o PR é gerado.
- **Retrocompat:** sem as vars novas, só `CLAUDE_CODE_OAUTH_TOKEN` → comportamento idêntico ao de hoje.

## Operação

- Uma conta deslogou / token expirou? Rode `claude setup-token` de novo nela e atualize a env no
  EasyPanel.
- Todas as 3 no limite ao mesmo tempo → a run falha com "Todas as N conta(s) Claude no limite"
  (esperado; só o reset das janelas resolve). Adicionar uma 4ª conta = só acrescentar o token na lista.

## BYOS — token da assinatura Claude por usuário (011)

Cada usuário pode cadastrar o token da própria assinatura Claude em
`/dashboard/settings/claude` (`claude setup-token`). Quando cadastrado, os runs de
Team/Squad/Company **daquele dono** usam o token dele em vez do pool da plataforma.

- **Precedência:** override do usuário **vence** o pool. Sem token cadastrado → o pool
  continua byte-idêntico (Constituição II).
- **Sem fallback:** override presente = **1 tentativa** com o token do usuário. Rate limit →
  `ClaudeRateLimitError` (resiliência 007/008, `rate_limited` + `resetAt`); erro de auth → o run
  falha com mensagem apontando `/dashboard/settings/claude`. **Nunca** cai no pool (decisão de custo).
- **Mecanismo:** `runWithClaudeToken` (AsyncLocalStorage, `src/lib/ai/claude-token-override.ts`)
  envolvido nos entrypoints (worker, `startTeamRun`, `executeTeamRunInline`); os 2 call sites do pool
  (`code-agent.ts`, `groq.ts`) leem `currentClaudeTokenOverride()`. Coordinator INTOCADO.
- **Armazenamento:** tabela `user_claude_tokens` (1:1 com `users`, cascade), token criptografado
  (AES-256-GCM via `src/lib/crypto.ts`), write-only (GET só devolve máscara + datas).
- **Verificação:**
  ```bash
  npx tsx scripts/claude-override-verify.ts   # sem override → failover intacto; com → 1 tentativa; limite → ClaudeRateLimitError
  ```
