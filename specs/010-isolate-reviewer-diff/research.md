# Phase 0 — Research: Diff de review isolado por task

Todas as questões técnicas abertas resolvidas. Nenhuma `NEEDS CLARIFICATION` remanescente.

## R1 — Mecanismo de captura do diff por task

**Decision**: cercar o turno de cada worker com `git add -A && git write-tree`:
- `before`: `git -C <wd> add -A && git -C <wd> write-tree` → `TREE_BEFORE` (objeto tree do estado atual, **sem criar commit** e sem alterar o working tree).
- executa o turno do worker.
- `after`: `git -C <wd> add -A && git -C <wd> write-tree` → `TREE_AFTER`.
- `scopedDiff = git -C <wd> diff --name-status <TREE_BEFORE> <TREE_AFTER>` + `git diff <TREE_BEFORE> <TREE_AFTER>` (patch), reusando `parseChangedFiles` + `attachDiffs` com `DEFAULT_DIFF_CAPS`.

**Rationale**: `write-tree` captura tracked + untracked + deleções (porque `git add -A` os encena) sem poluir o histórico nem mexer no working tree. `git diff <tree> <tree>` produz exatamente o delta daquele worker. O index é re-encenado a cada turno (idempotente) e o `commitAndPush` final faz seu próprio `git add`, então não há interferência na entrega.

**Alternatives considered**:
- `git stash create`: não inclui untracked por padrão; mais frágil.
- Commit efêmero (`git commit` snapshot): polui histórico e arrisca o `commitAndPush`/PR final.
- Diff de dois `captureWorkingDiff(<base>)` (antes/depois) e subtrair: frágil em hunks parciais e arquivos tocados por mais de uma task.

## R2 — Onde inserir o snapshot (cobrir os dois caminhos do worker)

**Decision**: no `createCodeChatFn` (`code-agent.ts`), no retorno da `ChatFn`, condicionado a **worker turn com repo** (`chatOptions?.taskId && workdir`). Capturar `TREE_BEFORE` logo no início; ao final, antes de cada `return`, capturar `TREE_AFTER`, computar `scopedDiff` e **anexá-lo ao objeto `artifacts` retornado** (`{ commands, scopedDiff }`).

**Rationale**: o `return async (...)` do `createCodeChatFn` é o ponto único que envolve **ambos** os caminhos do worker — Option B (claude-cli nativo, `runClaudeInSandbox`, que retorna cedo na linha ~193) e o loop legado `@RUN`. Cobrir os dois exige capturar o `before` antes da bifurcação e o `after` em cada saída. Anexar a `out.artifacts` faz o **coordinator intocado** persistir o `scopedDiff` junto com `commands` na gravação que ele já faz (`updateTask({ artifacts: out.artifacts })`).

**Alternatives considered**:
- Persistir o `scopedDiff` direto via `store.updateTask` dentro do code-agent: arriscado, pois o coordinator grava `artifacts: out.artifacts` (REPLACE com `{commands}`) **depois**, apagando o `scopedDiff`. Anexar a `out.artifacts` evita a corrida.
- Inserir no worker/index.ts: não envolve cada turno individual; granularidade errada.

## R3 — Serialização sem editar o coordinator

**Decision**: novo decorator `serialize-store.ts` que envolve o `TeamStore` e, no `loadRun`, força `config.maxParallel = 1` **quando o roster contém um reviewer**. Aplicado em `worker/index.ts` (`runWithRepo` e `continueWithRepo`), que são sempre code-runs com repo.

**Rationale**: o `team-graph-coordinator` já lê `maxParallel = Math.max(1, config.maxParallel ?? workers.length)` (linha 76). Forçando 1, os buckets de EXECUTE/REVIEW deixam de rodar em paralelo — sem tocar o coordinator. O `team-coordinator` linear já é sequencial (`for (const t of todo)`), então o override é inócuo lá. O `TeamStore` é dep injetada (Princípio II respeitado). Sem reviewer não há review pass → serialização desnecessária → mantém paralelismo (legado).

**Alternatives considered**:
- Persistir `maxParallel: 1` em `Team.config` no DB: efeito colateral permanente no time; afeta runs futuros e configuração do usuário. Rejeitado.
- Adicionar campo às `RunTeamDeps` e o coordinator lê: exigiria editar o coordinator. **Viola Princípio II.** Rejeitado.
- Forçar fan-out=1 só na execução e deixar review paralelo: ganho marginal, mais complexo; `maxParallel=1` global é mais simples e suficiente.

## R4 — Persistência e precedência (sem perder chaves de `artifacts`)

**Decision**:
- `CodeArtifacts` ganha `scopedDiff?: ChangedFile[]`.
- O worker retorna `artifacts: { commands, scopedDiff }`; o coordinator persiste (REPLACE com ambos).
- No review pass o coordinator grava `artifacts: { reviewDiff }`; o `store.updateTask` já trata o caso `onlyReviewDiff` com **shallow-merge** (`{ ...prevArt, reviewDiff }`), preservando `commands` e `scopedDiff`.
- `buildReviewPrompt(task, diff)` (helper puro) passa a usar `task.artifacts?.scopedDiff ?? diff` (fallback ao global legado).

**Rationale**: confirmado em `team-store.ts:244-270` que o merge especial preserva chaves existentes quando o update é só-`reviewDiff`. Logo, nenhuma edição do store é estritamente necessária. **Verificação obrigatória durante implementação**: garantir que o caminho de live-stream do code-agent (`updateTask({ artifacts: { commands } })`, REPLACE) ocorra **antes** da captura final do `scopedDiff` — o que já acontece, pois o stream é intra-loop e o `scopedDiff` é anexado só no retorno.

**Alternatives considered**:
- Reusar o campo `reviewDiff` para o diff por task: o coordinator o sobrescreve com o global no review pass. Rejeitado no clarify.
- Generalizar o shallow-merge do store para todas as chaves: opcional, aumenta robustez, mas não é necessário dada a ordem de gravação. Mantido como fallback defensivo no plano.

## R5 — Arquivos ignorados no snapshot (node_modules etc.)

**Decision**: confiar no `.gitignore` do repo clonado (`git add -A` não encena ignorados). Se o `captureTreeDiff` mostrar ruído de diretórios pesados, aplicar os mesmos `stageExcludePathspecs()` já usados por `commitAndPush`.

**Rationale**: o snapshot opera sobre o mesmo working tree que o `commitAndPush`, que já lida com exclusões; reusar a mesma lista mantém consistência.

## R6 — Retry e estado do working tree entre turnos

**Decision**: na re-execução de uma task rejeitada, o `before` do novo turno é o estado **atual** do working tree (que já inclui as mudanças da tentativa anterior e de tasks aprovadas). O `scopedDiff` do retry reflete o delta da correção. **Não** revertemos automaticamente mudanças de tasks rejeitadas.

**Rationale**: o snapshot por task já isola a **visão** do reviewer; reverter perderia trabalho e contexto que o worker corrige no retry. Mantém o comportamento atual do coordinator (que não reverte) → Princípio II. A integridade do estado final do working tree para o PR/commit continua sendo o estado acumulado (fora do escopo desta feature, já documentado na spec).

**Alternatives considered**:
- Reverter o working tree ao baseline da task antes do retry: exigiria orquestração nova e arriscaria o estado compartilhado; fora de escopo.

## R7 — Estratégia de teste

**Decision**: testes unitários com **fake sandbox** (padrão `scripts/c3-verify.ts`) para:
- `captureTreeDiff` retorna apenas o delta entre dois trees (com caps).
- `buildReviewPrompt` prefere `scopedDiff` e cai no `diff` global quando ausente (byte-idêntico ao legado sem `scopedDiff`).
- decorator `serialize-store` força `maxParallel=1` só com reviewer; passthrough total caso contrário.
- code-agent anexa `scopedDiff` a `out.artifacts` em worker turn com repo; não anexa em chat-run / sem repo (byte-idêntico).

**Rationale**: replica a disciplina dos ciclos anteriores (c0..c3, optionb-verify) que garantem legado byte-idêntico. jest roda no CI (não local).
