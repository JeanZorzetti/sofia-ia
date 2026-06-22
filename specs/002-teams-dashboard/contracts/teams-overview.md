# Contract — `GET /api/teams/overview`

Endpoint de leitura que alimenta a home Teams-first. Agrega `TeamRun`/`TeamTask`/`TeamMemberUsage`
escopados ao usuário autenticado. Espelha o padrão de `GET /api/analytics/overview`.

## Request

```
GET /api/teams/overview?period=7d|30d|90d|today|custom[&startDate=ISO&endDate=ISO]
```

- **Auth**: obrigatória (cookie/sessão via `getAuthFromRequest`). Sem auth → `401`.
- **Query**: `period` (default `7d`); `startDate`/`endDate` apenas quando `period=custom`.
- **Middleware**: `withAll(handler, { ttl: TTL.MEDIUM, limiter: rateLimiters.analytics })`.

## Response 200

```jsonc
{
  "success": true,
  "period": { "startDate": "ISO", "endDate": "ISO", "label": "7d" },
  "overview": {
    "teams": 3,
    "runsTotal": 42,
    "runsCompleted": 35,
    "runsFailed": 5,
    "runsRunning": 2,
    "successRate": 87.5,          // % com 2 casas; completed ÷ finalizados
    "tasksExecuted": 128,         // TeamTask status='done'
    "avgDurationMs": 41200,       // média sobre runs com durationMs != null
    "totalTokens": 1543000,
    "totalCost": 4.87             // Number(estimatedCost)
  },
  "recentRuns": [
    { "id": "uuid", "teamId": "uuid", "teamName": "Squad X",
      "status": "completed", "startedAt": "ISO", "durationMs": 38900 }
  ],
  "timeline": [
    { "date": "2026-06-20", "runs": 6, "tasks": 18, "cost": 0.72 }
  ],
  "byMember": [
    { "memberId": "uuid", "memberName": "Pesquisador", "tokens": 420000, "model": "..." }
  ]
}
```

## Regras

- **Escopo (FR-010)**: todas as agregações partem de `team: { createdBy: auth.id }`. Nenhum dado de
  outro tenant. `teams` conta `status='active'` do usuário (inventário; não sensível ao período).
- **Status (D3)**: sucesso = `completed`; finalizados = `completed|failed|rate_limited|cancelled`;
  `{pending,running}` = em andamento (não entram no denominador de `successRate`; `durationMs` null).
- **Nulos**: somas tratam `tokensUsed`/`estimatedCost` nulos como 0; `avgDurationMs` ignora nulos.
- **`recentRuns`**: ordenado por `startedAt desc`, limite ~6–8.
- **`byMember`/`timeline`**: usados pela US3; podem vir vazios sem quebrar a home.

## Erros

| Código | Quando |
|--------|--------|
| `401` | sem autenticação |
| `429` | rate-limit excedido (do middleware) |
| `500` | erro inesperado → `{ success: false, error }` |

## Não-regressão

- Nenhuma rota existente alterada; nenhum dado de servidor novo persistido; coordinator intocado.
- `estimatedCost` (Float do Prisma) convertido com `Number()` antes de somar/serializar.
