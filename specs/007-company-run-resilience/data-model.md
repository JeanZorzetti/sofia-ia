# Data Model — Company Run Resilience (Phase 1)

## Mudanças de schema (migração formal `add_company_run_resilience`)

```prisma
model CompanyRun {
  // ... campos existentes ...
  resetAt   DateTime? @map("reset_at") @db.Timestamptz()  // NOVO: janela de reset (UTC) quando status='blocked'
  // status já aceita 'blocked' (string) — sem alteração de tipo
  @@index([status, resetAt])   // NOVO: o cron filtra status='blocked' AND resetAt<=now
}

model CompanyPhaseRun {
  // ... campos existentes ...
  usage Json?   // NOVO: proxy de consumo da fase (ver shape abaixo)
}
```

SQL aplicado no host real **antes** do push:
```sql
ALTER TABLE company_runs ADD COLUMN reset_at TIMESTAMPTZ;
CREATE INDEX company_runs_status_reset_at_idx ON company_runs (status, reset_at);
ALTER TABLE company_phase_runs ADD COLUMN usage JSONB;
```

## Shape de `CompanyPhaseRun.usage` (proxy)

```jsonc
{
  "turns": 1,
  "durationMs": 4731000,
  "byModel": { "claude-opus-4-8": 5, "claude-sonnet-4-6": 8 }, // turns × modelWeight por membro do roster
  "weightedUnits": 13,        // Σ byModel — métrica comparável de esforço
  "blocked": false            // true quando a fase parou por esgotamento
}
```

`modelWeight`: `claude-opus-*` = 5 · `claude-sonnet-*` = 1 · outros = 1.

## Máquina de estados — CompanyRun

```
pending ──run──▶ running ──(7 fases ok)──▶ completed
                    │
                    ├──(fase esgota o pool)──▶ blocked  (resetAt setado, currentPhase = fase de parada)
                    │                              │
                    │              resume (manual) │  cron (resetAt ≤ now)
                    │                              ▼
                    └──────────────────────────▶ running  (retoma da fase blocked; pula completed)
                    │
                    └──(erro não-limite)──▶ failed   (inalterado)
```

- `blocked` por **esgotamento** (novo) vs `blocked` por **cargo essencial vago** (005, já existe): ambos
  param a run; só o de esgotamento seta `resetAt` e é retomável pelo cron.
- Fase: `pending → running → completed` (ok) · `→ blocked` (esgotou) · `→ failed` (erro real) ·
  `→ skipped` (não-essencial vaga, 005).

## Retomada — regra de reconstrução (em `runCompany`)

| phaseRun.status na retomada | Ação |
|---|---|
| `completed` | pula; `prevArtifact = outputArtifact` |
| `blocked` (esgotamento) | reusa a linha, reseta para `running`, re-executa a fase |
| `failed` / `pending` | idem (re-executa) |
| inexistente (fases futuras) | cria como no fluxo normal |

Guarda: `runCompany` só prossegue se a run está em `pending`/`running`/`blocked`; ao iniciar marca
`running` e limpa `resetAt`/`error`.

## Entidades derivadas (não persistidas)

- **Relatório de consumo** (`scripts/report-company-run.ts`): agrega `usage` por fase + `byModel` +
  por agente/cargo (via TeamMemberUsage) + ponto de parada. Read-only.

## Invariantes verificáveis

1. Nenhuma `CompanyPhaseRun` com `usage.blocked = true` tem `status = 'completed'`.
2. Run `blocked` por esgotamento ⇒ `currentPhase` aponta a fase bloqueada e (quando o CLI reporta)
   `resetAt` ≠ null.
3. Retomar uma run não-`blocked` ⇒ rejeitado, sem criar/duplicar phaseRuns.
4. Após retomada concluída ⇒ nº de `CompanyPhaseRun` `completed` = nº de fases não-puladas (sem
   duplicatas por `position`).
