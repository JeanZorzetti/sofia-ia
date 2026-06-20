# Polaris Teams V2.2 — Paridade com Agent Teams AI

Ciclo de gap-closing contra o app de terceiro **Agent Teams AI**, a partir de 5 lacunas
levantadas pelo usuário. Mesmo padrão dos ciclos V2 / V2.1:

- **1 fatia por sessão.** Nunca avançar para a próxima sem instrução explícita.
- **Coordinator (`runTeam`) INTOCADO.** Extensões entram por injeção/passthrough
  (`ChatOptions`, wrapper `chat`, `buildLeadContext`) — nunca na lógica do loop.
  `flow-canvas` e `output-webhooks` preservados.
- Verify por fatia: `v22sN` (asserts) + `tsc --noEmit` limpo. Jest = gate em CI
  (não roda local, OneDrive errno -4094). E2E autenticado em prod com o usuário.
- Migração só onde indicado, **aplicada à mão** via `migrate deploy` no host real
  `sofia_db@2.24.207.200:5435` **antes do push** (o `db push` do runner falha
  silencioso no standalone).

## Decisões (confirmadas com o usuário)

- **Item 5 = ambos**: vista "Visualizar" (grafo expandido) **e** suporte a imagens.
- **Modelos novos rodam via Claude Code CLI** (mesmo caminho do Opus 4.6). Habilita
  efforts completos (`low→max`), mas exige fiar o effort no caminho CLI (hoje descartado).
- Efforts reais da Claude: `low / medium / high / xhigh / max`. "Ultracode" não existe
  na Claude (rótulo do Agent Teams AI) → topo mapeado para `max`/`xhigh`.

## Fatias

| Fatia | Item | Escopo | Migração | Status |
|-------|------|--------|----------|--------|
| **S1** | 1 | Opus 4.8/4.7 no caminho Claude Code CLI (`models/route.ts` + `CLAUDE_CLI_MODEL_MAP`) | não | ✅ `16bca9d` |
| **S2.1** | 2 | Helper PURO `model-efforts.ts` (`effortsForModel`) + dropdown derivado do modelo no `RosterEditor` + clamp no save (PATCH + `create-team`) | não | ✅ |
| **S2.2** | 2 | Fiar `effort` no caminho Claude Code CLI (`ClaudeCliService` `--effort` + branch CLI em `groq.ts`); clamp xhigh/max→high no OpenRouter | não | ✅ |
| **S3** | 3 | `Team.config.systemPrompt` + `appendTeamSystemPrompt` (puro) + injeção via wrapper `chat` (coordinator intacto) + campo na UI | não | ✅ |
| **S4** | 4 | `POST .../runs/[runId]/messages` (`kind:'user'`) + surfacing no `buildLeadContext` + composer ao vivo no `TeamRunView` | não | ✅ |
| **S5** | 5a | Botão "Visualizar" → vista grafo/canvas expandida (`@xyflow/react` + `team-graph-view`), nós enriquecidos | não | ✅ `9373494` |
| **S6** | 5b | Imagens/visão: campos de mídia no `TeamMessage`, upload no composer, pass-through ao Claude CLI, render no feed | **sim** | ✅ `a1df8c5` |

Ordem por valor/risco: **S1 → S2 → S3 → S4 → S5 → S6**. 🏁 **Ciclo V2.2 COMPLETO.**

## S1 — Modelos atuais da Claude (item 1)

Adicionar **Claude Opus 4.8** (`claude-opus-4-8`) e **Claude Opus 4.7** (`claude-opus-4-7`)
ao caminho Claude Code CLI:

- `src/app/api/models/route.ts` — seção "Claude Code CLI models" (lista hardcoded).
- `src/lib/ai/claude-models.ts` — `CLAUDE_CLI_MODEL_MAP` (ID Polaris → flag `--model`).

`model-availability.ts` já trata qualquer `claude-*` como `claude-cli` → os novos IDs
recebem `unknown` (resolvido pelo botão "testar"); sem mudança lá.

**Verify**: model picker do RosterEditor lista Opus 4.8/4.7; `tsc` limpo; teste live de um
membro em Opus 4.8 conclui no host com CLI.

## S2 — Efforts por modelo (item 2) ✅

Decisões confirmadas (AskUserQuestion, Sessão 2): **S2.1+S2.2 juntas**; OpenRouter **clampa
xhigh/max → high** (o cast era `'low'|'medium'|'high'`); modelos sem effort real
(Haiku 4.5 / Sonnet 4.5 / Groq / Ollama / Opencode / OpenAI) → **só `auto`** (capacidade real
da skill `claude-api`, **diverge do rascunho** que dava low/medium/high a esses). Flag CLI
**confirmada** via `claude --help`: `--effort low|medium|high|xhigh|max`.

Entregue:
- **Helper PURO** `src/lib/ai/model-efforts.ts` (mesmo padrão de `model-availability.ts`):
  - `effortsForModel(id)` — matriz por versão Claude (Opus 4.7/4.8=full · Opus 4.6/Sonnet 4.6=+max−xhigh · Opus 4.5=base · resto=`[]`); inherit/null = permissivo (todos os tiers).
  - `clampEffort(model, effort)` — descarta tier inválido pro modelo → null (save guard).
  - `openRouterReasoningEffort(effort)` — xhigh/max → high; null/desconhecido → sem key.
  - `claudeCliEffortFlag(effort)` — ` --effort <tier>` ou `''` (byte-idêntico ao legado).
- **S2.1**: `RosterEditor` deriva o dropdown de effort por `effortsForModel(model)` + reseta
  effort para `auto` ao trocar pra um modelo que não suporta o tier atual. Clamp no save em
  **ambos** os caminhos: `api/teams/[id]` (PATCH) e `create-team.ts` (POST/magic-create/templates).
- **S2.2**: `ClaudeCliService.generate` ganhou param `effort` → flag `--effort` (branch CLI de
  `groq.ts` passa `reasoningEffort`); OpenRouter (groq.ts ~609) clampado via helper.
- **Coordinator INTACTO**; sem migração; sem dep nova. `scripts/v22s2-verify.ts` (casos a–d) +
  `tsc --noEmit` = 0 erros. **E2E live (Opus 4.8 com `--effort xhigh` no host) pendente.**
- **Deferido**: honrar effort no caminho **sandbox/code-run** (`sandbox-cli-agent.ts`) — fora do
  escopo S2 (chat-run apenas); DeepSeek-R1-on-OpenRouter perde low/medium/high (sem fonte
  autoritativa de que honra `reasoning_effort`; coerente com "capacidade real").

## S3 — System prompt do TIME (item 3) ✅

O time inteiro carrega um system prompt comum (cultura / guard-rails / tom) aplicado a
TODO membro, **além** do prompt por-agente e do `workflow` por-membro (S3.1 do V2.1).
Vazio = legado byte-idêntico.

**Decisões confirmadas (AskUserQuestion):** (1) posição na pilha = **agente → time →
workflow** (time = cultura comum; workflow = mais específico, colore por último); (2)
formato = **cabeçalho markdown** `## Diretrizes do time` (espelha `## Workflow deste time`);
(3) escopo = **campo na UI + persistência + aplicação numa fatia só**.

Entregue:
- **Helper PURO novo** `src/lib/orchestration/team/team-system-prompt.ts` (mesmo padrão de
  `member-workflow.ts`): `appendTeamSystemPrompt(systemPrompt, teamSystemPrompt?)` (vazio/
  null/whitespace → inalterado; texto → `\n\n## Diretrizes do time\n<trim>`) +
  `readTeamSystemPrompt(config)` (lê `config.systemPrompt`, trim, null se ausente/inválido) +
  const `TEAM_SYSTEM_PROMPT_HEADING`.
- **Aplicação** (`groq.ts` `chatWithAgent`): `appendTeamSystemPrompt` chamado ENTRE
  `let systemPrompt = agent.systemPrompt` e `appendMemberWorkflow` → ordem agente → time →
  workflow. Tipo de `options` ganhou `teamSystemPrompt?`.
- **Injeção** via wrapper `chat` em `start-team-run.ts` (ambos `startTeamRun` chat-branch +
  `runTeamAndWait`): `readTeamSystemPrompt(team.config)` resolvido 1x → `{ ...opts,
  teamSystemPrompt }`. **Coordinator INTACTO** (constante de time, não per-membro → não
  precisa tocar os call-sites do coordinator, diferente do workflow da S3.1).
- **Persistência** sem mudança de rota: `config` no schema é `z.record` aberto + PATCH faz
  **merge raso** (preserva `outputWebhooks`/`schedules`/`repoUrl`) + `create-team` passa
  `config` adiante. **Sem migração** (`Team.config` é JSON).
- **UI** (uma fatia): helper PURO `team-config-ui.ts` ganhou `systemPrompt` no
  `TeamConfigForm` + `buildTeamConfig` (set/drop trim) + reader `systemPromptOf`; `page.tsx`
  ganhou `TeamSystemPromptField` (textarea) + props no `TeamFormModal` + estados create/edit
  + leitura no `openEdit`. Vazio → key dropada (config limpo).
- **Coordinator + flow-canvas + output-webhooks INTOCADOS.** `scripts/v22s3-verify.ts`
  (casos a–d, 4 grupos) + `g4_1-verify` (20, sem regressão) + `tsc --noEmit` = 0 erros.
- **Deferido (mesma limitação aceita da S3.1):** **code-runs** não recebem o prompt do time —
  vão pelo worker (wrapper próprio) e o caminho dominante CLI-nativo-no-sandbox monta prompt
  próprio. **E2E live pendente** (rodar time chat com `config.systemPrompt` e ver a diretriz
  refletida; time sem prompt = idêntico ao legado).

## S4 — Mensagens durante a execução (item 4) ✅

Enquanto um run está `running`, o usuário injeta uma mensagem de steering cooperativo
que o **Lead** lê no próximo turno de planejamento — sem interromper a chamada em curso.
Run sem mensagem injetada = comportamento byte-idêntico ao atual.

**Decisões confirmadas (AskUserQuestion):** (1) quem recebe = **só o Lead** no próximo
turno (steering via planejamento, coordinator mais simples/seguro; workers em curso NÃO
recebem); (2) surfacing = **bloco `## Mensagens do usuário durante a execução`** inserido
ENTRE o board e o protocolo no `buildLeadContext`; (3) escopo = **rota + surfacing +
composer ao vivo numa fatia só**.

Entregue:
- **Tipo** (`team-types.ts`): `MessageKind` ganhou `'user'` (coluna é `String @db.VarChar(20)`
  → **sem migração**, o valor só cabe).
- **Surfacing PURO** (`team-prompts.ts`): const `USER_STEERING_HEADING` + helper
  `buildUserSteeringBlock(messages)` (filtra `kind==='user'`, um bullet trimado por
  mensagem; **`[]` quando não há nenhuma** → contexto byte-idêntico ao legado). Spliced
  no `buildLeadContext` via `...buildUserSteeringBlock(messages)` entre o board e o
  protocolo. **Coordinator INTACTO** — ele já relê `listMessages` por turno e passa o
  array ao builder; a mudança é só no builder.
- **Rota nova** `POST /api/teams/[id]/runs/[runId]/messages` (Next 16 async params): auth +
  ownership (`team.createdBy`), guard `STEERABLE={running,pending}` (espelha o DELETE),
  grava `TeamMessage{kind:'user', content}` com `from/toMemberId` null (humano, não membro
  → sem FK de membro pra violar). Cap 2000 chars, trim, rejeita vazio.
- **UI** (`TeamRunView`): composer ao vivo (input + Enviar) renderizado SÓ quando `running`,
  abaixo do feed de atividade; POST → SSE entrega a mensagem persistida de volta ao feed
  (~1s, sem insert otimista pra dedup). Mensagem `kind:'user'` renderizada distinta no feed
  ("Você → Lead", emerald, label `steering`).
- **SSE intocado**: o stream já seleciona `kind`/`content` e emite mensagens novas por
  delta → a injetada aparece sem mudança no `stream/route.ts`.
- **Sem migração, sem dep nova, coordinator/flow-canvas/output-webhooks INTOCADOS.**
  `scripts/v22s4-verify.ts` (casos a–c) + regressão `g6-verify` (35, golden do coordinator
  com `buildLeadContext`) + `c3-verify` (15) + `tsc --noEmit` = 0 erros.
- **E2E live pendente** (rodar um time, mandar mensagem durante o run, ver o Lead acatar no
  próximo turno; run sem mensagem = idêntico ao legado).

## S5 — Vista "Visualizar" (grafo expandido, item 5a) ✅

Hoje o `TeamRunView` mostra só um grafo COMPACTO na sidebar ("Topologia"). A S5 adiciona um
botão **"Visualizar"** que abre uma vista **expandida** (modal fullscreen, interativa) do
mesmo grafo board-driven, com **nós enriquecidos**. O grafo compacto fica intocado.

**Decisões confirmadas (AskUserQuestion):** (1) conteúdo = **time + tarefas** (board completo
com dependências e relações); (2) UI = **modal fullscreen** sobreposto (não empurra layout);
(3) enriquecimento = **todos os quatro** — tokens por membro, owner por tarefa, status legível,
arestas `related`.

Entregue:
- **Builder PURO estendido** `team-graph-view.ts` — o já-existente `buildTeamGraph` (do ciclo
  "Grafo" G4/G5) ganhou `TeamGraphOpts.expanded?` + `usageByMember?` + `relations?`. **Todo o
  enriquecimento é gated em `expanded`** → com a flag off (caminho do `TeamGraph.tsx` compacto)
  a saída é **byte-idêntica** ao legado. Em `expanded`: label do membro ganha total de tokens
  (`fmtTokens`, soma por membro, escala k/M, `memberId` null ignorado); label da tarefa ganha
  owner (🛠 nome) + status legível (PT); arestas `related` (roxo tracejado, **deduplicadas por
  par** já que a relação é simétrica). `blocks` **não** vira aresta — é o inverso de `dependsOn`,
  já desenhado como aresta de dependência.
- **Componente novo client-only** `TeamGraphView.tsx` — overlay fullscreen (`role=dialog`,
  fecha por ×/backdrop/Esc) com `<ReactFlow>` interativo (pan/zoom/fitView + `Controls` +
  `MiniMap`) consumindo `buildTeamGraph(..., { expanded:true, usageByMember, relations })`.
  Legenda explica o vocabulário das arestas. Montado via `dynamic(ssr:false)`.
- **UI** (`TeamRunView.tsx`): botão "Visualizar" ao lado do título "Topologia" → estado
  `graphOpen` → render do modal reusando o estado **já no cliente** (`team`, `tasks`,
  `usageByMember`, `relations` do `deriveTaskRelations`, `activeId`, `handoff`, `running`).
  **Sem rota/query nova.** O `TeamGraph.tsx` compacto não foi tocado.
- **Coordinator + flow-canvas + output-webhooks INTOCADOS. Sem migração, sem dep nova**
  (`@xyflow/react` já estava). `scripts/v22s5-verify.ts` (casos a–d) + regressão `g4-verify`
  (32) + `g5-verify` (18, golden do grafo compacto) + `tsc --noEmit` = 0 erros.
- **E2E live pendente** (abrir um run, clicar "Visualizar", conferir nós com tokens/owner/status
  e as arestas related; grafo compacto = idêntico ao legado).

## S6 — Imagens/visão (item 5b) ✅ `a1df8c5`

Anexar **imagens** à missão e/ou a uma mensagem de steering ao vivo; o arquivo chega a um
membro Claude-CLI com visão (a tool `Read` renderiza imagem) e é renderizado no feed.

**Decisões confirmadas (AskUserQuestion):** (1) storage = **MinIO** (instância existente
`sofia-minio.7c17iw.easypanel.host`); (2) onde anexa = **ambos** (missão + composer ao vivo
do S4); (3) quem recebe = **o Lead surfaça o caminho local e DELEGA** a análise visual a um
membro com visão (consistente com o "só o Lead" do S4); caminho não-CLI (OpenRouter/Groq/
Ollama) vê só o texto (limitação documentada, como S2/S3).

**Descoberta de arquitetura:** chat-runs rodam no **mesmo processo** do app via `after()`
(só code-runs vão pro worker separado) → o processo que recebe o upload é o mesmo que materializa
e spawna o CLI. O `claude --help` **não tem flag de imagem por caminho local** (o `--file` é
download por `file_id` da Files API) → o mecanismo é **caminho-no-prompt + Read tool**, habilitado
por `--add-dir` no dir temp do run.

Entregue:
- **Schema/migração** `TeamMessage.attachments Json?` (migração formal `20260619160000_add_team_message_attachments`,
  **aplicada manual** via `migrate deploy` no host real `sofia_db@2.24.207.200:5435` ANTES do
  push — `migrate status` confirmou só ela pendente + "up to date" depois). Nullable → linhas
  legadas intocadas (byte-idêntico).
- **Helper PURO novo** `team-attachments.ts`: tipos `TeamAttachment`/`MessageAttachment` +
  `parseAttachments` (defensivo, cap `MAX_ATTACHMENTS=4`, dropa mime/key inválidos) +
  `validateUpload`/`isImageMime` (png/jpeg/webp/gif, `MAX_ATTACHMENT_BYTES=5MB`) +
  `safeAttachmentName`/`attachmentObjectKey`/`attachmentRunDir`/`attachmentLocalPath` (paths
  determinísticos, baseDir injetável p/ teste) + `resolveAttachments` + `buildAttachmentRefLines`
  (linhas de ref com path + nota de delegação à visão; `[]` sem anexo).
- **Storage** `src/lib/storage/minio.ts` (lazy, padrão Groq; dep `minio`): `putAttachment`/
  `downloadAttachmentTo`/`getAttachmentStream` + `ensureBucket`. Env: `MINIO_SERVER_URL`/
  `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`/`MINIO_BUCKET` (default `team-attachments`).
- **Materialização** `materialize-attachments.ts`: `materializeRunAttachments(runId)` baixa os
  objetos do run pro dir temp (idempotente, best-effort), retorna o dir (null se sem anexo).
- **Surfacing**: `buildUserSteeringBlock` anexa as ref-lines sob o bullet (vazio sem anexo →
  **coordinator/`buildLeadContext` intactos, byte-idêntico**). O store mapeia o JSONB →
  `MessageRow.attachments` com o path resolvido (sem IO no read).
- **Pass-through**: `ClaudeCliService` ganhou param `attachmentDir` → ` --add-dir "<dir>"`
  (vazio sem anexo); `groq.ts` lê `options.attachmentDir` e repassa; `start-team-run` materializa
  + injeta `attachmentDir` no wrapper `chat` (mesmo padrão do `teamSystemPrompt` da S3 —
  coordinator intacto) + grava a imagem da missão como `kind:'user'` inicial.
- **Rotas**: `run` + `messages` detectam `multipart/form-data` (upload → MinIO via
  `uploadImagesFromForm`), JSON segue legado; proxy `GET .../attachment?key=` (auth + ownership +
  key validada contra as mensagens do run) streama o objeto; SSE + run GET surfaçam `{name,mime,key}`.
- **UI** (`TeamRunView`): `ImageAttachBar` (pick + chips, cap 4) no mission composer (só chat) e no
  composer ao vivo; `<img>` no feed via o proxy.
- **Coordinator + flow-canvas + output-webhooks INTOCADOS.** `scripts/v22s6-verify.ts` (a–e, 5
  asserts) + regressão `g6`=35 (golden coordinator/`buildLeadContext`) + `v22s4`=3 + `v22s5`=4 +
  `tsc --noEmit` = 0 erros. Os eslint `no-explicit-any` são pré-existentes/informativos.
- **Deferido (limitação aceita):** visão só no caminho **Claude CLI** (não OpenRouter/Groq/
  Ollama); **code-runs** não recebem imagem (worker separado, fora do escopo chat). Se o
  container reiniciar mid-run, o temp local some (MinIO mantém o durável; re-materializa no
  próximo upload, não por turno).
- **⚠️ Deploy:** setar as env vars do MinIO no container do app no EasyPanel ANTES do deploy.
- **E2E live pendente** (anexar imagem na missão/ao vivo, ver o membro com visão analisar e a
  imagem no feed; run sem imagem = idêntico ao legado).

🏁🏁 **CICLO V2.2 COMPLETO** (S1→S6, coordinator intocado o tempo todo). Não abrir Sessão 7 —
não há mais fatias planejadas.
