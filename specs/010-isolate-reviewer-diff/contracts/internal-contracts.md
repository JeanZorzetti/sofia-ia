# Contratos internos — Diff de review isolado por task

A feature é interna (orquestração); não expõe API HTTP nova. Os "contratos" abaixo são as fronteiras entre os módulos injetados e os coordinators intocados.

## C1 — `captureTreeDiff` (repo-lifecycle.ts, novo helper puro-ish)

```ts
export async function captureTreeDiff(
  sandbox: Sandbox,
  opts: { workdir: string; before: string; after: string; caps?: DiffCaps },
): Promise<ChangedFile[]>
```

- Roda `git -C <wd> diff --name-status <before> <after>` + `git diff <before> <after>` e reusa `parseChangedFiles` + `attachDiffs`.
- **Best-effort**: qualquer falha (exit ≠ 0, exceção) → `[]` (nunca bloqueia o review).
- `before`/`after` são tree-ish de `git write-tree` (ver C2).

## C2 — Snapshot do turno do worker (code-agent.ts, injeção)

Pré-condição de ativação: `chatOptions?.taskId && workdir` (worker turn com repo). Caso contrário → comportamento legado (sem snapshot, byte-idêntico).

- `TREE_BEFORE`: `git -C <wd> add -A && git -C <wd> write-tree` (antes da bifurcação Option B / legado).
- `TREE_AFTER`: idem, em cada caminho de retorno da ChatFn.
- Resultado: `out.artifacts = { ...out.artifacts, scopedDiff: await captureTreeDiff(sandbox, { workdir, before: TREE_BEFORE, after: TREE_AFTER }) }`.
- **Contrato com o coordinator**: o `scopedDiff` é entregue **dentro de `out.artifacts`**; o coordinator (intocado) o persiste via o `updateTask({ artifacts: out.artifacts })` que já executa.

## C3 — Precedência no reviewer (team-prompts.ts, helper puro)

```ts
// buildReviewPrompt(task, diff)
const effectiveDiff = task.artifacts?.scopedDiff ?? diff ?? []
```

- Com `scopedDiff` presente → reviewer vê só o diff da task.
- Sem `scopedDiff` (legado) → usa `diff` global → **byte-idêntico** ao atual.

## C4 — Decorator de serialização (serialize-store.ts, injeção)

```ts
export function withReviewerSerialization(store: TeamStore): TeamStore
// loadRun: se members.some(m => m.role === 'reviewer') → config.maxParallel = 1
// todos os demais métodos: passthrough
```

- Aplicado em `worker/index.ts` ao criar o store dos code-runs com repo.
- **Contrato com o coordinator de grafo**: ele já lê `config.maxParallel` (linha 76) → fan-out vira sequencial. O coordinator linear ignora (já sequencial).

## C5 — Invariante do store (team-store.ts)

- `updateTask({ artifacts: { reviewDiff } })` DEVE continuar fazendo shallow-merge preservando `commands` e `scopedDiff`.
- Se a generalização defensiva for adotada: o merge preserva **todas** as chaves de `artifacts` existentes, não só `reviewDiff`.

## Garantia de não-regressão (Princípio II)

Arquivos que **NÃO** podem aparecer no diff da implementação: `team-coordinator.ts`, `team-graph-coordinator.ts`, `team-executor.ts`.
