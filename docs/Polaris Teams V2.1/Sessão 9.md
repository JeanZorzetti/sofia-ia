# Polaris Teams V2.1 — Sessão 9 (fechamento do ciclo + handoff)

> A **S3.3 fechou o Sprint 3 e o ciclo V2.1 inteiro** (commit `2611799`, 2026-06-19). **Não há S3.4.** Esta nota não é uma nova fatia de implementação — é o fechamento do ciclo, o checklist de E2E que ficou acumulado com o usuário, e o backlog explícito que só reabre **sob instrução**. Cole o essencial ao abrir a próxima conversa **se** for retomar E2E ou puxar um item do backlog.

---

## 🏁 O que o ciclo V2.1 entregou (S1.1 → S3.3, 1 fatia/sessão, coordinator INTOCADO o tempo todo)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs: `Imob/sofia-next/docs/Polaris Teams V2.1/` → `ROADMAP.md` (executável) + `ANALISE-GAP-V2.1.md` (tese central = **eixo-autonomia**).

**Sprint 1 — Execução de tools além do OpenRouter (Tema A')**
- **S1.1** (`3e2f3ed`): tool loop no path **Groq nativo** (helpers `buildAgentToolDefs`+`executeAgentToolCall` em `agent-tools.ts`). `v21s1-verify.ts` (12 asserts).
- **S1.2** (`e37a4ef`): tool loop no path **Ollama** (`groq.ts`). `v21s2-verify.ts` (15 asserts).
- **S1.3** (`565d4c8`): `CapabilityPolicy` → **flags do Claude CLI** (read-only/MCP em chat-run, escrita só no sandbox E2B). Helper PURO `cli-tool-flags.ts`. `v21s3-verify.ts` (6 casos). Opencode = limitação documentada.

**Sprint 2 — Timeline/auditoria por task (Tema E)**
- **S2.1** (`3d4a55a`): persistência da timeline por task. Coluna `TeamTask.historyEvents Json?`. Helper PURO `task-history.ts`. `v21s4-verify.ts`.
- **S2.2** (`6e23fce`): timeline na UI (card expandível inline no kanban, ao vivo). Helper PURO `task-event-view.ts`. Rota SSE re-emite o board quando `historyEvents.length` muda.

**Sprint 3 — Pacote de pequenos ADAPTAR (Tema F)**
- **S3.1** (`021c713`): **workflow por membro** (`TeamMember.workflow`, migração `20260619140000` manual em prod). Helper PURO `member-workflow.ts`. UI textarea no RosterEditor. `v21s5-verify.ts` (4 casos).
- **S3.2** (`2063f1b`): **relations de task `blocks`/`related`** (Tema F2). `blocks` = DERIVADO read-side (inverso de `dependsOn`, sem coluna); `related` = coluna nova `team_tasks.related text[]` + diretiva `@TASK [related:#n]` (migração `20260619150000` manual em prod). Helper PURO `task-relations.ts` (simétrico). Chips clicáveis (rola+flash). DAG/agenda intactos (`depsSatisfied` só gateia `dependsOn`). `v21s6-verify.ts` (5 casos).
- **S3.3** (`2611799`, ESTA fatia): **advisory por membro** (Tema F3). Chip ⚠ + tooltip por categoria (`quota_exhausted`/`rate_limited`/`provider_overloaded`) no painel "Por membro", derivado do erro run-level que os coordinators já levantam. **SÓ UI — sem schema/migração.** Detalhe abaixo.

---

## Detalhe da S3.3 (a fatia desta sessão)

**Natureza:** SURFACE do que já existe. O rate-limit já é levantado pelo `chat()` (`isRateLimit` / `claude-token-pool`), e os dois coordinators já terminam o run como `rate_limited`, gravando uma string `error`. A fatia só (1) refina esse erro run-level em categoria e (2) escolhe qual membro recebe o chip. **Coordinator + DAG INTOCADOS.**

**Decisões confirmadas com o usuário (regra global #2):**
- **Atribuição = (A) heurística read-side por membro** (não run-level no cabeçalho). A caixa "Erro" run-level que já existe abaixo do painel segue sendo a fonte da verdade honesta; o chip é o palpite acionável.
- **UX = chip + tooltip explicativo** (ícone ⚠ + label curto + `title` explicando a categoria; sem ação embutida).

**Arquivos:**
- **Helper PURO** [provider-advisory.ts](../../src/lib/orchestration/team/provider-advisory.ts):
  - `classifyProviderError(error, status) → 'quota_exhausted' | 'rate_limited' | 'provider_overloaded' | null`. Ordem importa (categorias se sobrepõem no texto): **overload** (503/overloaded/unavailable) → **quota** (quota/usage|weekly|monthly limit/billing/"exceeded your") → **rate_limit** (rate limit/429/"hit your limit"/resets). **Texto vence status**; sem texto + `status==='rate_limited'` → `rate_limited` (fallback, porque os coordinators gravam só a frase de fase "Rate limit durante {planejamento|execução|review|consolidação}"); resto → `null` = sem chip = legado.
  - `pickAdvisoryMemberId(members, tasks, messages) → memberId | null`. Espelha as fases do coordinator: **task `doing` → owner** (execução) · **task `review` → reviewer** · **sem task viva → lead** (planejamento/consolidação) · **fallback → último autor de mensagem** · nada → `null`.
- **UI** [MemberActivityPanel.tsx](../../src/app/dashboard/teams/[id]/MemberActivityPanel.tsx): props novas `runStatus`/`runError`; calcula `advisory` + `advisoryMemberId`; renderiza o chip na linha de identidade só do membro escolhido. [TeamRunView.tsx](../../src/app/dashboard/teams/[id]/TeamRunView.tsx) passa `runStatus={status}`/`runError={runError}`.
- **Verificação:** [v21s7-verify.ts](../../scripts/v21s7-verify.ts) (3 grupos a–c) + `tsc --noEmit` limpo. Sem jest (OneDrive errno -4094).

**Regressão garantida:** run sem erro de provider → `classifyProviderError` = `null` → nenhum chip → painel byte-idêntico ao atual.

---

## ⚠️ Pendente com o usuário — E2E autenticado em prod (acumulado do ciclo, gate real = EasyPanel + login)

Nenhum item abaixo bloqueou as fatias (o gate de cada fatia foi `tsc` + verify puro), mas o **E2E real só roda com o usuário logado na prod**:

1. **S1.x** — Worker **Groq** tool-capable: rodar mission que exige MCP/tool-skill, confirmar invocação no feed + filtragem por política (o mesmo teste que o V2 fez no OpenRouter, agora no Groq). Worker **Claude CLI**: política restringe tools via flags (read-only/MCP em chat-run; `mcpAllowlist` honrada em code-run no sandbox).
2. **S2.x** — abrir uma task e validar a ordem dos eventos de lifecycle (timeline por task no card).
3. **S3.1** — `workflow` por membro afetando comportamento (instrução custom flui pro system prompt).
4. **S3.2** — rodar time grafo com `@TASK [after:]`/`[related:]`, abrir task e confirmar chips de dependência/bloqueio/relação aparecem e **navegam** (clicar rola+flash); task sem relações = board idêntico.
5. **S3.3** — **forçar um 429/limite num membro** (ex.: OpenRouter `:free` sob rajada, ou Claude sem token no pool) e confirmar o chip de advisory na **categoria certa** e no **membro certo**; run sem erro = painel idêntico ao atual.
6. **Regressão geral** — time chat legado (sem `capabilities`/`workflow`) e code-run sem `gitMode` rodam idênticos ao atual.

> Migrações das S3.1/S3.2 já foram **aplicadas manual** no host real `sofia_db@2.24.207.200:5435` (lição SP2: `db push` do standalone não cria coluna em prod). S3.3 **não tem migração**.

---

## Backlog explícito (NÃO neste ciclo — só reabre SOB INSTRUÇÃO)

Registrado no `ROADMAP.md` (§ "Backlog explícito") para não reabrir por engano:

| Item | Veredito | Por que fora |
|------|----------|--------------|
| Resume `waiting_for_input` + tool-approval interativo | ADAPTAR | Custo estrutural (pausar/retomar run no `after()`/BullMQ). `ToolApprovalSettings` do ATA = referência de design. |
| Cross-team `@HANDOFF` | ADAPTAR | YAGNI; output webhooks (SP2) cobrem o near-term. Desenho: diretiva → `startTeamRun(target, {chainDepth+1})` + teto + `TeamRun.parentRunId`. |
| Comments por task (threads + anexos, N6) | ADAPTAR | Precisa UI de escrita + storage de blob. |
| Drag-drop kanban | ADAPTAR | Board dirigido por agente; só com human-in-the-loop. Risco OneDrive (`@dnd-kit`). |
| Multi-reviewer | ADAPTAR | Coordinator assume 1 reviewer; exigiria quórum. |
| **DESCARTADO (eixo-autonomia):** stall monitor, work-sync nudge, auto-resume, context-window monitor, fastMode, action-mode, worktree | DESCARTAR | Estruturalmente desnecessário no coordinator síncrono/turn-driven da Polaris. |

---

## Próximos passos possíveis (escolha do usuário — nenhum é automático, regra global #4)
- **Fechar o E2E acumulado** das 8 fatias em prod (lista acima).
- **Puxar um item do backlog** acima (só com instrução explícita).
- **Encerrar o tema Teams** e seguir para outro projeto/roadmap.
