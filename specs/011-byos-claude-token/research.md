# Research — 011 BYOS Token de Assinatura Claude por Usuário

> Phase 0 do plano. Todas as incógnitas do Technical Context resolvidas contra o código real (2026-07-08).

## R1. Quem é o "dono" do run (de quem é o token usado)

- **Decision**: resolver o token pelo **dono do Team** (`Team.userId`). Companies/Squads: squads são Teams com `companyId != null` → mesmo caminho; runs de Company resolvem pelo dono da Company (`Company.userId`, que na prática = dono dos Teams). Agendamentos (`ScheduledTeamRun.userId`) e API pública v1 executam Teams do próprio dono — mesma resolução.
- **Rationale**: `TeamRun` **não tem** `userId` (verificado em `prisma/schema.prisma:1279-1334`); a ownership validation existente (zero IDOR) já garante que só o dono dispara seus Teams — logo "quem dispara" ≡ dono do Team no modelo atual. Nenhuma mudança de schema em TeamRun.
- **Alternatives considered**: adicionar `triggeredById` ao TeamRun (migração extra + backfill + zero ganho enquanto só o dono pode disparar — rejeitado; se um dia houver disparo por membro de organização, adicionar aí).

## R2. Mecanismo de injeção do token do usuário (sem tocar o coordinator)

- **Decision**: novo módulo puro `src/lib/ai/claude-token-override.ts` com **AsyncLocalStorage**: `runWithClaudeToken(token, fn)` estabelece o contexto; `currentClaudeTokenOverride()` lê. Os entrypoints que iniciam a execução de um run (worker job handler em `src/worker/index.ts`; `runTeamAndWait` no caminho de Companies; dispatch de squads; demais callers de `runTeam`/`runTeamGraph` identificados por grep no tasks) fazem: carregar token do dono → decrypt → `runWithClaudeToken(token, () => execuçãoAtual())`. Os **2 call sites do pool** consultam o override: presente → tentativa única com o token do usuário (sem pool, sem failover); ausente → `withClaudeTokenFailover` intocado.
- **Rationale**: o ALS propaga pela árvore async inteira do run — o coordinator fica 100% intocado (Constituição II) e nenhuma assinatura de função existente muda. Os 2 call sites (`code-agent.ts:202`, `groq.ts:361`) já são os pontos de extensão criados pelo pool — mexer neles não é mexer no coordinator (precedente: o próprio pool foi religado ali).
- **Alternatives considered**:
  - Threading por `chatOptions`/deps (campo opcional): exigiria tocar cada construção de options — parte delas montada dentro do coordinator → risco direto de violar a Constituição II. Rejeitado.
  - Env var por processo (`CLAUDE_CODE_OAUTH_TOKEN` mutado por run): race condition entre runs concorrentes no mesmo processo. Rejeitado.
  - Estender `FailoverOptions` com `overrideTokens`: obriga cada caller a resolver o override — o ALS centraliza; a leitura no call site fica 2 linhas. Rejeitado (mais superfície).

## R3. Comportamento em falha do token do usuário (runtime)

- **Decision**: com override presente, rate limit → lançar `ClaudeRateLimitError` (classe existente do pool) e deixar a resiliência 007/008 fazer o que já faz (`rate_limited` + `resetAt` via `withRateLimitCapture` + cron de resume). Erro de autenticação (não rate limit) → falha do run com mensagem que aponta para `/dashboard/settings/claude`. **Nunca** fallback silencioso para o pool (FR-008; decisão de custo registrada na spec).
- **Rationale**: reusa 100% da máquina de resiliência existente; a única diferença é a mensagem identificar a credencial do usuário (formatação read-side).
- **Alternatives considered**: fallback automático ao pool (viola FR-008 e consome custo da plataforma sem consentimento — rejeitado); retry com o mesmo token (rate limit não resolve com retry imediato — rejeitado).

## R4. Verificação ativa no cadastro (clarify 2026-07-07)

- **Decision**: o endpoint PUT chama `ClaudeCliService.generate` com prompt mínimo ("responda OK"), modelo default, o token candidato e timeout curto. Sucesso → salva; saída casando `isClaudeRateLimit` → salvar mesmo assim é INCORRETO — token válido porém em cooldown: retornar 422 com mensagem "token válido mas assinatura no limite agora; tente após o reset" (não salva — simplifica: só salva token que comprovadamente funciona AGORA); falha de spawn/timeout → 503 "não foi possível verificar agora" (distinção do edge case da spec). Formato validado antes (prefixo `sk-ant-oat`, sem espaços internos, trim de whitespace/newline).
- **Rationale**: o app Next tem o Claude CLI no container (o caminho local-spawn do pool roda nos dois serviços — `docs/Claude/POLARIS-TOKEN-POOL.md`); verificação real ≥ verificação de formato (SC-006).
- **Alternatives considered**: chamada direta à API Anthropic para validar (token de assinatura não é API key — só o CLI o aceita; rejeitado); verificação assíncrona em background (opção C da clarify — rejeitada pelo Jean, escolhida A).

## R5. Armazenamento e criptografia

- **Decision**: nova tabela `user_claude_tokens` 1:1 com `users` (`userId @unique`, cascade delete), colunas: token criptografado (`encrypted_token` text, formato `iv.tag.dados` do `crypto.ts`), `mask` (varchar 32, ex.: `sk-ant-oat...h4Kx`), `created_at`, `updated_at`, `last_verified_at`, `last_used_at` (nullable). Reusa `encrypt/decrypt/isEncrypted` de `src/lib/crypto.ts` (AES-256-GCM, `ENCRYPTION_KEY` — mesma infra da WABA).
- **Rationale**: modelo próprio (vs coluna em `users`) mantém a tabela `users` estável, dá timestamps próprios e delete natural (`DELETE` na linha = remoção definitiva, FR-004). Cascade cobre o edge case de exclusão de conta.
- **Alternatives considered**: coluna em `users` (migração na tabela mais quente do sistema + sem metadados — rejeitado); reutilizar `Integration` genérica (semântica errada: não é integração OAuth de terceiro com refresh — rejeitado).

## R6. Máscara

- **Decision**: `primeiros 10 caracteres + "..." + últimos 4`, computada no save e **persistida** — a exibição nunca precisa descriptografar.
- **Rationale**: FR-003 (write-only) fica estruturalmente garantido: o caminho de leitura não tem acesso ao plaintext.

## R7. API e UI

- **Decision**: rota única `src/app/api/settings/claude-token/route.ts` com GET (metadata/máscara), PUT (cadastrar/rotacionar — verifica antes de salvar), DELETE (remover). Padrões da casa: `getAuthFromRequest()` → `auth.id`, zod no body, prisma singleton. UI: página nova `/dashboard/settings/claude` (padrão das subpáginas de settings existentes) com instruções numeradas (`claude setup-token`), aviso "trate como senha", campo password-like, card de status com máscara + datas, botões rotacionar/remover. Audit log nos 3 verbos via infra existente (`UserAuditLog`).
- **Alternatives considered**: aninhar em `/dashboard/settings/api-keys` (semântica errada — lá são chaves da API pública da Polaris; misturar confundiria exatamente quem a feature quer simplificar — rejeitado).

## R8. `last_used_at`

- **Decision**: atualizado best-effort (fire-and-forget) pelo entrypoint quando o override é usado num run — 1 update por run, não por chamada CLI.
- **Rationale**: dado de UX ("está funcionando?") sem custo por chamada.
