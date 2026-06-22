# Contract — Co-localização de lead/reviewer (enriquecimento no code-agent)

Objetivo: lead e reviewer enxergarem o **estado real** do repositório que o worker editou, **sem tocar `runTeam`** e **sem obrigar modelo caro**.

## Ponto de injeção

`createCodeChatFn(sandbox, baseChat, options)` em `src/lib/orchestration/team/code-agent.ts`. Novo campo em `CodeChatFnOptions`:

```ts
/** Resolve o papel do membro do turno (impl Prisma, injetada pelo worker). Best-effort:
 *  null em qualquer falha → sem enriquecimento (byte-idêntico). */
resolveMemberRole?: (opts: { agentId: string; memberId?: string | null }) => Promise<TeamRole | null>
```

## Gatilho (quando enriquece)

```text
SE turno NÃO-worker  (chatOptions.taskId ausente)
   E há workdir       (options.workdir definido — code-run com repo)
   E resolveMemberRole(…) ∈ {lead, reviewer}
ENTÃO prepend do contexto co-localizado na 1ª mensagem 'user', ANTES do injectProtocol/baseChat.
SENÃO comportamento atual (FR-009 — worker, sem-workdir, ou role indefinido ⇒ inalterado).
```

- O turno do **worker** (Option B claude-cli ou @RUN) **não** passa por aqui — continua igual.
- Falha de `resolveMemberRole` ou de leitura ⇒ segue sem enriquecimento (nunca quebra o run).

## Conteúdo por papel (`co-location.ts`, puro)

| Papel | O que é injetado | Fonte (via `sandbox.exec` no `workdir`) |
|---|---|---|
| **lead** | Retrato do repo: árvore capada + conteúdo dos arquivos-chave da missão. | `git ls-files`/`find` (capado) + `cat` dos `keyFiles`. |
| **reviewer** | Bloco "como verificar": instrução de rodar verificação read-only (`@RUN npm test`/`build`/`grep`) contra o repo vivo; (opcional) saída de um teste leve. | hint estático + (opcional) 1 `exec` de teste se houver script. |
| **worker / none** | nada (não chega no gatilho). | — |

- **Reviewer já recebe o diff** (C3 `getTaskDiff` via `runTeam`, nas `messages`) e, em code-mode, já tem `@RUN`. Este contrato **não duplica** o diff; só dirige a verificação (FR-006).
- **Caps**: reutilizar a filosofia do C2 (`DIFF_MAX_*`) para árvore/arquivos não estourarem o contexto.

## Garantias

- **FR-007**: lead recebe estado real → tarefas escritas correspondem a arquivos existentes.
- **FR-006**: reviewer pode verificar por execução contra o repo vivo, além do diff.
- **FR-008**: independe do modelo (funciona com Groq/chat barato); não força claude-cli; custo padrão equivalente.
- **FR-009 / Princípio II**: sem `workdir`/sem role/`provider=e2b` *com workdir remoto* ⇒ o enriquecimento ainda roda se houver workdir (o E2B também tem workdir!). ⚠️ Ver nota de compatibilidade abaixo.
- **runTeam intocado**: toda a lógica vive em `code-agent.ts` (ChatFn) + `co-location.ts` (puro) + dep do worker.

## Nota de compatibilidade (E2B + co-localização)

O enriquecimento dispara sempre que há `workdir` — inclusive no E2B (cujo workdir remoto também é o repo editado pelo worker). Isso é **desejável** (melhora lead/reviewer no E2B também) e seguro (lê via `sandbox.exec`, que no E2B roda no sandbox correto). O comportamento "byte-idêntico ao legado" é garantido apenas quando `resolveMemberRole` **não é injetado** (ex.: testes/legado) — aí `code-agent` se comporta como hoje. O worker injeta o dep ⇒ a melhoria vale para ambos os providers. Documentar isso no PR para não surpreender.

## Verificação (`scripts/colocation-verify.ts`, sandbox fake)

1. turno **worker** (taskId presente) ⇒ nenhum enriquecimento.
2. turno **lead** (sem taskId, com workdir, role=lead) ⇒ 1ª mensagem contém a árvore/arquivos.
3. turno **reviewer** (role=reviewer) ⇒ 1ª mensagem contém o bloco de verificação; diff preservado.
4. **sem workdir** OU **resolveMemberRole ausente** ⇒ mensagens byte-idênticas ao legado.
