# Contract — `/api/settings/claude-token`

> Phase 1. Rota autenticada (cookie `sofia_token` → `getAuthFromRequest()` → `auth.id`). Todas as operações escopadas ao próprio usuário — não existe variante por id (zero IDOR por construção).

## GET — metadata (nunca o valor)

**200** (token cadastrado):
```json
{
  "configured": true,
  "mask": "sk-ant-oat...h4Kx",
  "createdAt": "2026-07-08T12:00:00Z",
  "lastVerifiedAt": "2026-07-08T12:00:00Z",
  "lastUsedAt": "2026-07-08T14:30:00Z"
}
```
**200** (sem token): `{ "configured": false }`
**401**: não autenticado.

Garantia de contrato: em NENHUMA resposta desta rota (ou de qualquer outra) o campo `encryptedToken`/valor em claro aparece.

## PUT — cadastrar ou rotacionar (verifica antes de salvar)

Request:
```json
{ "token": "sk-ant-oat01-..." }
```
Pipeline: normaliza (trim) → valida formato → **verificação ativa** (chamada de teste mínima via Claude CLI com o token) → criptografa → upsert → audit log.

**200**: mesmo shape do GET com `configured: true` (máscara nova).
**400**: formato inválido — `{ "error": "invalid_format", "message": "..." }` (nada verificado, nada salvo).
**401**: não autenticado.
**422**: token rejeitado na verificação — `{ "error": "token_rejected", "message": "O token não foi aceito pelo Claude. Gere um novo com `claude setup-token` e cole aqui." }` (nada salvo; em rotação, o token anterior permanece intacto).
**422** (variante): token válido porém assinatura no limite — `{ "error": "token_rate_limited", "message": "...tente novamente após o reset da sua janela de uso." }` (nada salvo).
**503**: verificação indisponível (spawn/timeout do CLI, não culpa do token) — `{ "error": "verification_unavailable", "message": "Não foi possível verificar agora. Tente novamente." }` (nada salvo — distinção exigida pelo edge case da spec).

## DELETE — remover

**200**: `{ "configured": false }` — linha apagada (valor irrecuperável); runs futuros voltam ao pool.
**404**: não havia token.
**401**: não autenticado.

## Efeitos colaterais auditados

| Ação | UserAuditLog |
|------|--------------|
| PUT (novo) | `claude_token.created` |
| PUT (rotação) | `claude_token.rotated` |
| DELETE | `claude_token.deleted` |

Nunca registrar o valor — apenas a máscara nova quando aplicável.

## Contrato de runtime (interno, não-HTTP)

`src/lib/ai/claude-token-override.ts`:
```ts
runWithClaudeToken<T>(token: string, fn: () => Promise<T>): Promise<T>
currentClaudeTokenOverride(): string | undefined
```
Semântica nos 2 call sites do pool (`code-agent.ts`, `groq.ts`):
- override presente → **1 tentativa** com o token do usuário; rate limit → `ClaudeRateLimitError` (resiliência 007/008 existente); erro de auth → falha do run com mensagem apontando `/dashboard/settings/claude`. Sem pool, sem fallback.
- override ausente → `withClaudeTokenFailover(...)` exatamente como hoje (byte-idêntico).
