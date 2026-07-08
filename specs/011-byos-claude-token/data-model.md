# Data Model — 011 BYOS

> Phase 1. Uma entidade nova; nenhuma existente alterada.

## UserClaudeToken (`user_claude_tokens`)

Credencial de assinatura Claude de um usuário (spec: Key Entities). 1:1 com `User`.

| Campo | Tipo (Prisma) | Coluna | Regras |
|-------|---------------|--------|--------|
| id | String @id @default(uuid()) @db.Uuid | id | PK |
| userId | String @unique @db.Uuid | user_id | FK → users, `onDelete: Cascade` (conta excluída → token some). `@unique` = 1 token por usuário (Assumption da spec) |
| encryptedToken | String @db.Text | encrypted_token | Ciphertext `iv.tag.dados` de `src/lib/crypto.ts`; NUNCA retornado em query de leitura de metadata (select explícito) |
| mask | String @db.VarChar(32) | mask | `sk-ant-oat...XXXX` (10 primeiros + "..." + 4 últimos), computada no save |
| lastVerifiedAt | DateTime @db.Timestamptz() | last_verified_at | Set no PUT após verificação ativa passar (cadastro e rotação) |
| lastUsedAt | DateTime? @db.Timestamptz() | last_used_at | Best-effort: update por run que usou o override |
| createdAt | DateTime @default(now()) @db.Timestamptz() | created_at | |
| updatedAt | DateTime @default(now()) @updatedAt @db.Timestamptz() | updated_at | |

Relação no `User`: `claudeToken UserClaudeToken?`

Índices: `@@unique` em `user_id` já cobre o único padrão de acesso (lookup por dono). `@@map("user_claude_tokens")` (padrão snake_case do schema).

## Regras de validação (service layer)

- Entrada: trim de espaços/quebras de linha; prefixo obrigatório `sk-ant-oat`; sem whitespace interno; tamanho mínimo plausível (> 20 chars). Malformado → 400 sem verificação ativa.
- Verificação ativa (R4 do research): só persiste token que respondeu com sucesso AGORA. Rotação usa a MESMA regra; se a verificação do novo falhar, o antigo permanece intacto (write só após verify).
- Estados: **inexistente** (usuário no pool) → **ativo** (verificado; runs usam override) → de volta a **inexistente** via DELETE. Não há estado "inválido" persistido: token que passou a falhar continua `ativo` até o usuário rotacionar/remover (a falha aparece no run, FR-008).

## Fluxo de leitura no runtime (sem mudança de schema em TeamRun)

```
run entrypoint (worker / runTeamAndWait / squad dispatch)
  → run.teamId → team.userId (Company: company.userId)
  → SELECT encrypted_token FROM user_claude_tokens WHERE user_id = ...
  → decrypt() → runWithClaudeToken(token, executar)
  → (ausente → executa sem wrapper: caminho do pool byte-idêntico)
```
