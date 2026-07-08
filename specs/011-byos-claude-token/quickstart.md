# Quickstart de Validação — 011 BYOS

> Guia de validação E2E (o gate real é produção autenticada — Constituição, Development Workflow). Referências: [contracts/claude-token-api.md](./contracts/claude-token-api.md), [data-model.md](./data-model.md).

## Pré-requisitos

- Migração `user_claude_tokens` aplicada MANUALMENTE no host real `2.24.207.200:5435` (NÃO o host do `.env` — Constituição III), ANTES do push; depois deploy dos 2 serviços (app + worker).
- `ENCRYPTION_KEY` presente nos 2 serviços (já existe — mesma da WABA).
- 1 token de teste gerado com `claude setup-token` numa conta Claude com assinatura ativa (NÃO usar as contas do pool de produção).

## Cenário 1 — Cadastro com verificação ativa (US1)

1. Login em `polarisia.com.br` com usuário de teste → `/dashboard/settings/claude`.
2. Conferir instruções na tela (passo a passo `claude setup-token` + aviso de senha).
3. Colar token **inválido** (ex.: `sk-ant-oat01-xxxx`): esperar **422 token_rejected**, nada salvo (GET segue `configured: false`).
4. Colar o token válido: esperar **200** com máscara `sk-ant-oat...XXXX` e `lastVerifiedAt` preenchido.
5. Refresh na página → só máscara visível; DevTools → resposta do GET não contém o valor.

## Cenário 2 — Run usa a assinatura do usuário (US1)

1. Com o usuário de teste, disparar um run de Team com membro `claude-*`.
2. Verificar no log do worker que NÃO houve linha `[claude-pool]` para este run e que o run concluiu.
3. Verificar `last_used_at` atualizado (GET metadata).
4. Evidência forte (opcional): dashboard de uso da conta Claude de teste mostra o consumo.

## Cenário 3 — Regressão zero sem token (US2)

1. Com um usuário SEM token, disparar run idêntico.
2. Comportamento atual: pool da plataforma (logs `[claude-pool]` quando rotaciona), estados de run inalterados.
3. `npx tsx scripts/claude-override-verify.ts` (sem rede/DB): sem override → failover intocado; com override → tentativa única.

## Cenário 4 — Rotação e remoção (US3)

1. PUT com um segundo token válido → máscara muda; audit `claude_token.rotated`.
2. PUT com token inválido → 422 e a máscara ANTIGA permanece (rotação atômica).
3. DELETE → `configured: false`; audit `claude_token.deleted`; novo run do usuário volta ao pool (logs `[claude-pool]` reaparecem).

## Cenário 5 — Token morre depois do cadastro (US4)

1. Cadastrar token válido; revogar a sessão na conta Claude (ou usar token de conta que expirou).
2. Disparar run → run falha com mensagem apontando `/dashboard/settings/claude`; NENHUM consumo do pool para este run.
3. Rate limit real (difícil de provocar): validado por unit no script de verificação — override + saída de limite → `ClaudeRateLimitError` → caminho 007/008 (`rate_limited` + `resetAt`).

## Critérios de saída (mapeiam Success Criteria da spec)

- SC-001: cenário 1+2 completos em < 5 min seguindo só a tela.
- SC-002: cenário 3 sem NENHUMA diferença de comportamento.
- SC-003: cenário 1 passo 5 (valor irrecuperável).
- SC-004/SC-006: cenários 1.3, 4.2 e 5.2 (mensagens acionáveis; token morto barrado no cadastro).
- SC-005: cenário 2 (pool intocado no run BYOS).
