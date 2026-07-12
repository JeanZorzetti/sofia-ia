# Phase 1 — Data Model: Diff de review isolado por task

Sem mudança de schema (Princípio III não acionado). Toda a modelagem vive na coluna **Json** `TeamTask.artifacts` e em tipos TypeScript já existentes.

## Entidade: `CodeArtifacts` (shape da coluna `TeamTask.artifacts`)

| Campo | Tipo | Origem | Descrição |
|---|---|---|---|
| `commands` | `CommandRun[]?` | code-agent (worker turn) | log de comandos do sandbox (live-stream C2.1). **Inalterado.** |
| `reviewDiff` | `ChangedFile[]?` | coordinator (review pass) | diff **global** do working tree vs base. **Mantido como fallback legado.** |
| `scopedDiff` | `ChangedFile[]?` | **NOVO** — code-agent (worker turn) | diff **isolado** do turno daquele worker (delta `TREE_BEFORE`→`TREE_AFTER`). |

**Invariante de persistência** (verificado em `team-store.ts:244-270`):
- Update com `{ artifacts: { commands, scopedDiff } }` → REPLACE (tem `commands`) → grava ambos.
- Update com `{ artifacts: { reviewDiff } }` → caso `onlyReviewDiff` → shallow-merge `{ ...prev, reviewDiff }` → **preserva** `commands` e `scopedDiff`.
- Conclusão: `scopedDiff` deve viajar **dentro de `out.artifacts`** do worker (não num update isolado), para o coordinator persisti-lo sem corrida.

## Entidade: `ChangedFile` (reutilizada, sem mudança)

Definida em `repo-lifecycle.ts`. Shape: `{ path, status, patch?, binary?, truncated? }`. O `scopedDiff` é um `ChangedFile[]` idêntico ao já produzido por `captureWorkingDiff`/`attachDiffs`, com os mesmos caps (`DEFAULT_DIFF_CAPS`).

## Entidade: `TeamConfig` (read-side, sem persistência nova)

| Campo | Tipo | Uso nesta feature |
|---|---|---|
| `topology` | `'linear' \| 'graph'` | inalterado; decide o coordinator. |
| `maxParallel` | `number?` | **forçado a `1`** pelo decorator de store no `loadRun` quando o roster tem reviewer (não persistido no DB). |

## Precedência de leitura do diff (reviewer + UI)

```
diffParaExibir = task.artifacts.scopedDiff ?? task.artifacts.reviewDiff ?? []
```

- **Reviewer** (`buildReviewPrompt`, helper puro): `task.artifacts?.scopedDiff ?? diff` (o `diff` param é o global legado).
- **UI** (`DiffViewer`/`TeamRunView`, read-side): mesma precedência.
- Runs legadas (sem `scopedDiff`) → caem no `reviewDiff` global → comportamento byte-idêntico.

## Estados e transições (inalterados)

O ciclo de vida da task (`todo → doing → review → done/rejected/todo(retry)`) **não muda**. A feature apenas grava `scopedDiff` no fim do turno `doing→review` e o consome no review pass. Em retry, novo `scopedDiff` (delta da nova tentativa) substitui o anterior dentro de `out.artifacts`.
