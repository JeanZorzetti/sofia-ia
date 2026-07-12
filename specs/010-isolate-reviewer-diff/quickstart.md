# Quickstart — Validar o diff de review isolado por task

Guia de validação E2E. Detalhes de implementação ficam em `tasks.md`.

## Pré-requisitos

- Worker de code-run operante (vps-local) com `git` no sandbox e `CLAUDE_CODE_OAUTH_TOKEN` (claude-cli).
- Um time com **reviewer** no roster e `repoUrl` configurado (ex.: o "Squad Feature").
- jest disponível no CI (não rodar local — OneDrive corrompe node_modules).

## Verificação unitária (fake sandbox, padrão c3-verify)

1. **`captureTreeDiff` isola o delta**: dado um fake sandbox com dois trees, retorna apenas os arquivos alterados entre `before` e `after`, com caps aplicados; erro de git → `[]`.
2. **`buildReviewPrompt` prioriza `scopedDiff`**: com `task.artifacts.scopedDiff` presente, o prompt contém só esses arquivos; sem ele, é **byte-idêntico** ao prompt atual usando o `diff` global.
3. **`withReviewerSerialization`**: `loadRun` força `maxParallel=1` quando há reviewer; sem reviewer, retorna a config inalterada; demais métodos são passthrough.
4. **code-agent anexa `scopedDiff`**: em worker turn com `taskId` + `workdir`, `out.artifacts` contém `scopedDiff`; em chat-run ou sem repo, `out.artifacts` é byte-idêntico ao legado (sem `scopedDiff`).

Comando: `npm test` (no CI) — esperar verde.

## Verificação E2E (produção, gate real)

Cenário regressão da run `bb7b8414` (multi-fase):

1. Disparar um code-run no "Squad Feature" com uma missão de 2+ fases que tocam **arquivos distintos**, com o **grafo ativo** (`config.topology = 'graph'`) e `depends_on` entre fases.
2. Acompanhar a run no dashboard.
3. **Esperado**:
   - Os workers executam **um de cada vez** (sem fan-out simultâneo) — confirmável pelos timestamps das tasks.
   - No painel de cada task, o diff exibido contém **apenas** os arquivos daquela task (não a soma das fases).
   - Nenhuma `review_note` acusa "mudanças de outra task" / "destruição massiva" para trabalho que pertence a outra fase.
   - Tasks corretas são **aprovadas** fase a fase; rejeições refletem apenas o escopo real da task.
4. **Legado (não-regressão)**: rodar um chat-run e um code-run **sem repo** → o reviewer recebe o mesmo conteúdo de antes; resultado inalterado.

## Critérios de aceite (da spec)

- SC-001: 100% das tasks recebem diff só com seus próprios arquivos.
- SC-002: zero rejeições por "mudança de outra task".
- SC-003: runs legadas byte-idênticas.
- SC-004: run multi-fase aprovada fase a fase, sem cascata.
- SC-005: falha de captura de diff não aborta o review (degradação segura).
