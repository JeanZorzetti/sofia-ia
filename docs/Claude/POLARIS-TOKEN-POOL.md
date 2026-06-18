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
- Aceita lista separada por **vírgula ou nova-linha**.
- Alternativas: `CLAUDE_CODE_OAUTH_TOKEN_1/_2/_3` (numerado) ou o antigo `CLAUDE_CODE_OAUTH_TOKEN`
  (1 conta — comportamento de antes).
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
